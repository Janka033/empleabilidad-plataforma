const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const UserModel = require("../models/user.model");

const JWT_SECRET = process.env.JWT_SECRET;
const JWT_EXPIRES = process.env.JWT_EXPIRES_IN || "24h";

const asyncHandler = (fn) => (req, res, next) =>
    Promise.resolve(fn(req, res, next)).catch(next);

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
 *               nombre:     { type: string }
 *               email:      { type: string, format: email }
 *               password:   { type: string, minLength: 8 }
 *               rol:        { type: string, enum: [estudiante, empresa] }
 *               universidad: { type: string }
 *               programa:   { type: string }
 *               semestre:   { type: number }
 *               razonSocial: { type: string }
 *               nit:        { type: string }
 *     responses:
 *       201: { description: Usuario creado }
 *       400: { description: Datos inválidos }
 *       409: { description: Email ya registrado }
 */
const register = asyncHandler(async (req, res) => {
    // Extraer solo campos permitidos
    const { nombre, email, password, rol } = req.body;

    if (!nombre || !email || !password || !rol) {
        return res.status(400).json({ message: "Todos los campos son obligatorios" });
    }

    if (!["estudiante", "empresa"].includes(rol)) {
        return res.status(400).json({ message: "Rol inválido" });
    }

    if (password.length < 8) {
        return res.status(400).json({ message: "La contraseña debe tener al menos 8 caracteres" });
    }

    if (await UserModel.emailExists(email)) {
        return res.status(409).json({ message: "El correo ya está registrado" });
    }

    const passwordHash = await bcrypt.hash(password, 12);
    const user = await UserModel.create({ nombre, email, passwordHash, rol });

    const token = jwt.sign(
        { id: user.id, email: user.email, rol: user.rol },
        JWT_SECRET,
        { expiresIn: JWT_EXPIRES }
    );

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

    const passwordOk = await bcrypt.compare(password, user.password_hash);
    if (!passwordOk) {
        return res.status(401).json({ message: "Credenciales inválidas" });
    }

    const token = jwt.sign(
        { id: user.id, email: user.email, rol: user.rol },
        JWT_SECRET,
        { expiresIn: JWT_EXPIRES }
    );

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

module.exports = { register, login, me };
