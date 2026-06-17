const crypto = require("crypto");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { OAuth2Client } = require("google-auth-library");
const UserModel = require("../models/user.model");
const { uploadFile } = require("../services/storage.service");

const PERFILES_URL = process.env.PERFILES_SERVICE_URL || "http://ms-perfiles:3002";
const AUDIT_URL = process.env.AUDIT_SERVICE_URL || "http://ms-audit:3007";
const FILES_URL = process.env.FILES_SERVICE_URL || "http://ms-files:3009";
const NOTIFICACIONES_URL = process.env.NOTIFICACIONES_SERVICE_URL || "http://ms-notifications:3008";
const FRONTEND_URL = process.env.FRONTEND_URL || "http://localhost:3000";

const JWT_SECRET = process.env.JWT_SECRET;
const JWT_EXPIRES = process.env.JWT_EXPIRES_IN || "24h";

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || "";
const googleClient = GOOGLE_CLIENT_ID ? new OAuth2Client(GOOGLE_CLIENT_ID) : null;

// Firma el JWT de sesión de la app
function firmarToken(user) {
    return jwt.sign(
        { id: user.id, email: user.email, rol: user.rol },
        JWT_SECRET,
        { expiresIn: JWT_EXPIRES }
    );
}

const sha256 = (s) => crypto.createHash("sha256").update(s).digest("hex");

const asyncHandler = (fn) => (req, res, next) =>
    Promise.resolve(fn(req, res, next)).catch(next);

// Registra un evento de auditoría (best-effort, no bloquea la respuesta) — RF19
function auditar(token, evento) {
    fetch(`${AUDIT_URL}/audit`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(evento),
    }).catch(() => {});
}

// Sube un documento al Files Service (S3/MinIO). Si no está disponible,
// usa el almacenamiento local como respaldo (RF20).
async function subirDocumento(file, userId, authHeader) {
    try {
        const form = new FormData();
        form.append("file", new Blob([file.buffer], { type: file.mimetype }), file.originalname);
        form.append("folder", "cvs");
        const r = await fetch(`${FILES_URL}/files`, {
            method: "POST",
            headers: { Authorization: authHeader },
            body: form,
        });
        if (r.ok) {
            const data = await r.json();
            return data.url;
        }
    } catch (_) { /* respaldo local abajo */ }
    return uploadFile(file.buffer, file.originalname, "cvs", userId);
}

/**
 * @swagger
 * /auth/register:
 *   post:
 *     summary: Registrar nuevo usuario
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [nombre, email, password, rol]
 *             properties:
 *               nombre:      { type: string }
 *               email:       { type: string, format: email }
 *               password:    { type: string, minLength: 8 }
 *               rol:         { type: string, enum: [estudiante, empresa] }
 *               universidad: { type: string }
 *               programa:    { type: string }
 *               semestre:    { type: number }
 *               razonSocial: { type: string }
 *               nit:         { type: string }
 *     responses:
 *       201: { description: Usuario creado }
 *       400: { description: Datos inválidos }
 *       409: { description: Email ya registrado }
 */
const register = asyncHandler(async (req, res) => {
    const { nombre, email, password, rol, razonSocial, universidad, programa, semestre } = req.body;

    if (!email || !password || !rol) {
        return res.status(400).json({ message: "Todos los campos son obligatorios" });
    }

    if (!["estudiante", "empresa"].includes(rol)) {
        return res.status(400).json({ message: "Rol inválido" });
    }

    if (password.length < 8) {
        return res.status(400).json({ message: "La contraseña debe tener al menos 8 caracteres" });
    }

    // Para empresas: usar razonSocial como nombre; para estudiantes: usar nombre
    const nombreFinal = rol === "empresa"
        ? (razonSocial || nombre || email)
        : (nombre || email);

    if (!nombreFinal) {
        return res.status(400).json({ message: "Nombre o razón social es obligatorio" });
    }

    if (await UserModel.emailExists(email)) {
        return res.status(409).json({ message: "El correo ya está registrado" });
    }

    const passwordHash = await bcrypt.hash(password, 12);
    const user = await UserModel.create({ nombre: nombreFinal, email, passwordHash, rol });

    const token = firmarToken(user);

    // Crear perfil automáticamente en ms-perfiles (best-effort).
    // Para estudiantes enlazamos universidad, programa y semestre escogidos en el registro.
    try {
        await fetch(`${PERFILES_URL}/perfiles`, {
            method: "POST",
            headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
            body: JSON.stringify({
                userId: user.id,
                nombre: user.nombre,
                email: user.email,
                universidad,
                programa,
                semestre: semestre ? parseInt(semestre) : undefined,
            }),
        });
    } catch (_) { /* continúa si ms-perfiles no está disponible */ }

    auditar(token, {
        servicio: "auth",
        accion: "registro",
        entidad: "usuario",
        entidadId: user.id,
        detalle: `Nuevo registro (${user.rol}): ${user.email}`,
    });

    return res.status(201).json({
        token,
        role: user.rol,
        user: { id: user.id, nombre: user.nombre, email: user.email },
    });
});

/**
 * @swagger
 * /auth/login:
 *   post:
 *     summary: Iniciar sesión
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, password]
 *             properties:
 *               email:    { type: string }
 *               password: { type: string }
 *     responses:
 *       200: { description: Login exitoso, retorna token }
 *       401: { description: Credenciales inválidas }
 */
const login = asyncHandler(async (req, res) => {
    const { email, password } = req.body;

    if (!email || !password) {
        return res.status(400).json({ message: "Email y contraseña son obligatorios" });
    }

    const user = await UserModel.findByEmail(email);
    if (!user) {
        return res.status(401).json({ message: "Credenciales inválidas" });
    }

    if (!user.activo) {
        return res.status(401).json({ message: "Cuenta desactivada" });
    }

    // Cuentas creadas solo con Google no tienen contraseña local
    if (!user.password_hash) {
        return res.status(401).json({ message: "Esta cuenta usa inicio de sesión con Google" });
    }

    const passwordOk = await bcrypt.compare(password, user.password_hash);
    if (!passwordOk) {
        return res.status(401).json({ message: "Credenciales inválidas" });
    }

    const token = firmarToken(user);

    auditar(token, {
        servicio: "auth",
        accion: "login",
        entidad: "usuario",
        entidadId: user.id,
        detalle: `Inicio de sesión: ${user.email}`,
    });

    return res.json({
        token,
        role: user.rol,
        user: { id: user.id, nombre: user.nombre, email: user.email },
    });
});

/**
 * @swagger
 * /auth/me:
 *   get:
 *     summary: Obtener usuario autenticado
 *     tags: [Auth]
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: Datos del usuario }
 *       401: { description: No autorizado }
 */
const me = asyncHandler(async (req, res) => {
    const user = await UserModel.findById(req.user.id);
    if (!user) return res.status(404).json({ message: "Usuario no encontrado" });
    return res.json(user);
});

// GET /auth/coordinador — datos de la coordinadora académica (rol admin).
// Lo usan otros servicios para enrutar solicitudes/notificaciones hacia ella.
const coordinador = asyncHandler(async (req, res) => {
    const user = await UserModel.findByRol("admin");
    if (!user) return res.status(404).json({ message: "No hay coordinadora configurada" });
    return res.json({ id: user.id, nombre: user.nombre, email: user.email });
});

const updatePerfil = asyncHandler(async (req, res) => {
    const { nombre, bio, universidad, programa, semestre, linkedinUrl, existingCvUrl } = req.body;

    let habilidades;
    try {
        habilidades = req.body.habilidades ? JSON.parse(req.body.habilidades) : undefined;
    } catch { habilidades = undefined; }

    let cvUrl = existingCvUrl || undefined;
    if (req.file) {
        cvUrl = await subirDocumento(req.file, req.user.id, req.headers["authorization"]);
    }

    const payload = {
        nombre,
        bio,
        universidad,
        programa,
        semestre: semestre ? parseInt(semestre) : undefined,
        habilidades,
        linkedinUrl,
        ...(cvUrl !== undefined && { cvUrl }),
    };

    const response = await fetch(`${PERFILES_URL}/perfiles/me`, {
        method: "PUT",
        headers: {
            "Content-Type": "application/json",
            Authorization: req.headers.authorization,
        },
        body: JSON.stringify(payload),
    });

    if (!response.ok) {
        const err = await response.json().catch(() => ({ message: "Error en ms-perfiles" }));
        return res.status(response.status).json(err);
    }

    return res.json(await response.json());
});

// ── POST /auth/forgot-password ──────────────────────────────────────────────
// Genera un token de un solo uso y envía un correo con el enlace de restablecimiento.
// Responde siempre 200 para no revelar si un correo existe (anti-enumeración).
const forgotPassword = asyncHandler(async (req, res) => {
    const { email } = req.body;
    const respuestaGenerica = { message: "Si el correo existe, te enviamos un enlace para restablecer tu contraseña." };

    if (!email) return res.status(400).json({ message: "El correo es obligatorio" });

    const user = await UserModel.findByEmail(email);
    if (!user || !user.activo) return res.json(respuestaGenerica);

    // Token en claro para el enlace; en BD guardamos solo su hash
    const tokenPlano = crypto.randomBytes(32).toString("hex");
    const tokenHash = sha256(tokenPlano);
    const expiraEn = new Date(Date.now() + 60 * 60 * 1000); // 1 hora
    await UserModel.createReset(user.id, tokenHash, expiraEn);

    const enlace = `${FRONTEND_URL}/reset-password?token=${tokenPlano}`;
    const mensaje =
        `Recibimos una solicitud para restablecer la contraseña de tu cuenta en EmpleoUni.\n\n` +
        `Abre este enlace para crear una nueva contraseña (válido por 1 hora):\n${enlace}\n\n` +
        `Si no solicitaste este cambio, ignora este mensaje; tu contraseña seguirá igual.`;

    // Reutilizamos ms-notifications. Firmamos un token corto del propio usuario para autorizar la llamada.
    try {
        const sysToken = firmarToken(user);
        await fetch(`${NOTIFICACIONES_URL}/notificaciones/email`, {
            method: "POST",
            headers: { "Content-Type": "application/json", Authorization: `Bearer ${sysToken}` },
            body: JSON.stringify({ to: user.email, titulo: "Restablece tu contraseña — EmpleoUni", mensaje }),
        });
    } catch (_) { /* el correo es best-effort; no revelamos fallos al cliente */ }

    return res.json(respuestaGenerica);
});

// ── POST /auth/reset-password ───────────────────────────────────────────────
const resetPassword = asyncHandler(async (req, res) => {
    const { token, password } = req.body;
    if (!token || !password) return res.status(400).json({ message: "Token y contraseña son obligatorios" });
    if (password.length < 8) return res.status(400).json({ message: "La contraseña debe tener al menos 8 caracteres" });

    const reset = await UserModel.findValidReset(sha256(token));
    if (!reset) return res.status(400).json({ message: "El enlace es inválido o ha expirado. Solicita uno nuevo." });

    const passwordHash = await bcrypt.hash(password, 12);
    await UserModel.updatePassword(reset.user_id, passwordHash);
    await UserModel.markResetUsed(reset.id);

    return res.json({ message: "Tu contraseña fue actualizada. Ya puedes iniciar sesión." });
});

// ── POST /auth/google ───────────────────────────────────────────────────────
// Recibe el ID token de Google Identity Services, lo verifica y crea/encuentra al usuario.
const google = asyncHandler(async (req, res) => {
    if (!googleClient) return res.status(503).json({ message: "El inicio de sesión con Google no está configurado" });

    const { credential, rol } = req.body;
    if (!credential) return res.status(400).json({ message: "Falta el credential de Google" });

    let payload;
    try {
        const ticket = await googleClient.verifyIdToken({ idToken: credential, audience: GOOGLE_CLIENT_ID });
        payload = ticket.getPayload();
    } catch (_) {
        return res.status(401).json({ message: "Token de Google inválido" });
    }

    const googleId = payload.sub;
    const email = payload.email;
    const nombre = payload.name || email;
    if (!email || !payload.email_verified) {
        return res.status(401).json({ message: "Tu correo de Google no está verificado" });
    }

    // 1) ¿Ya existe por google_id?
    let user = await UserModel.findByGoogleId(googleId);
    let nuevo = false;

    // 2) ¿Existe una cuenta local con el mismo correo? La vinculamos.
    if (!user) {
        const existente = await UserModel.findByEmail(email);
        if (existente) {
            if (!existente.activo) return res.status(401).json({ message: "Cuenta desactivada" });
            await UserModel.linkGoogle(existente.id, googleId);
            user = existente;
        }
    }

    // 3) Usuario nuevo: lo creamos (rol por defecto estudiante)
    if (!user) {
        const rolFinal = rol === "empresa" ? "empresa" : "estudiante";
        user = await UserModel.createGoogle({ nombre, email, googleId, rol: rolFinal });
        nuevo = true;
    }

    const token = firmarToken(user);

    // Crear perfil para nuevos estudiantes (best-effort)
    if (nuevo) {
        try {
            await fetch(`${PERFILES_URL}/perfiles`, {
                method: "POST",
                headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
                body: JSON.stringify({ userId: user.id, nombre: user.nombre, email: user.email }),
            });
        } catch (_) { /* continúa */ }
    }

    auditar(token, {
        servicio: "auth", accion: nuevo ? "registro_google" : "login_google",
        entidad: "usuario", entidadId: user.id,
        detalle: `${nuevo ? "Registro" : "Inicio de sesión"} con Google: ${user.email}`,
    });

    return res.json({
        token, role: user.rol,
        user: { id: user.id, nombre: user.nombre, email: user.email },
    });
});

module.exports = { register, login, me, updatePerfil, coordinador, forgotPassword, resetPassword, google };