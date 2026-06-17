const PerfilModel         = require("../models/perfil.model");
const PostulacionModel    = require("../models/postulacion.model");
const NotificacionModel   = require("../models/notificacion.model");
const { notificarUsuario } = require("../services/notificador.service");
const { Pool }            = require("pg");

const pool = new Pool({
    host:     process.env.DB_HOST,
    port:     process.env.DB_PORT || 5432,
    database: process.env.DB_NAME,
    user:     process.env.DB_USER,
    password: process.env.DB_PASSWORD,
});

const asyncHandler = (fn) => (req, res, next) =>
    Promise.resolve(fn(req, res, next)).catch(next);

const AUDIT_URL = process.env.AUDIT_SERVICE_URL || "http://ms-audit:3007";
const AUTH_URL = process.env.AUTH_SERVICE_URL || "http://ms-auth:3001";
const VACANTES_URL = process.env.VACANTES_SERVICE_URL || "http://ms-vacantes:3003";

// Registra un evento de auditoría (best-effort) — RF19
function auditar(authHeader, evento) {
    fetch(`${AUDIT_URL}/audit`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: authHeader },
        body: JSON.stringify(evento),
    }).catch(() => {});
}

const ESTADOS_VALIDOS = ["enviada", "vista", "entrevista", "rechazada", "aceptada", "confirmada", "rechazada_por_estudiante"];

const ESTADO_LABELS = {
    enviada:    "enviada",
    vista:      "vista por la empresa",
    entrevista: "en proceso de entrevista",
    rechazada:  "rechazada",
    aceptada:   "aceptada",
    confirmada: "confirmada",
    rechazada_por_estudiante: "rechazada por el estudiante",
};

// GET /postulaciones/me — estudiante ve sus postulaciones
const getMyPostulaciones = asyncHandler(async (req, res) => {
    const perfil = await PerfilModel.findByUserId(req.user.id);
    if (!perfil) return res.status(404).json({ message: "Perfil no encontrado" });

    const postulaciones = await PostulacionModel.findByPerfilId(perfil.id);
    return res.json(postulaciones);
});

// POST /postulaciones — estudiante crea postulación
const createPostulacion = asyncHandler(async (req, res) => {
    const { vacanteId, cartaMotivacion, expectativaSalarial, disponibilidad } = req.body;

    if (!vacanteId || !cartaMotivacion || !expectativaSalarial || !disponibilidad) {
        return res.status(400).json({ message: "Faltan campos obligatorios" });
    }

    const perfil = await PerfilModel.findByUserId(req.user.id);
    if (!perfil) return res.status(404).json({ message: "Perfil no encontrado" });

    // Verificar si el estudiante ya fue contratado
    if (perfil.contratado) {
        return res.status(409).json({
            message: `Este practicante ya tiene empresa (${perfil.empresa_contratante}). No puede postularse a más vacantes.`,
            contratado: true,
            empresa: perfil.empresa_contratante,
        });
    }

    // Evitar doble postulación
    const yaPostulado = await PostulacionModel.existsByPerfilAndVacante(perfil.id, vacanteId);
    if (yaPostulado) {
        return res.status(409).json({ message: "Ya te postulaste a esta vacante" });
    }

    const postulacion = await PostulacionModel.create({
        perfilId: perfil.id,
        vacanteId,
        cartaMotivacion,
        expectativaSalarial,
        disponibilidad,
    });

    // Notificar a la empresa
    try {
        const VACANTES_URL = process.env.VACANTES_SERVICE_URL || "http://ms-vacantes:3003";
        const vRes = await fetch(`${VACANTES_URL}/vacantes/${vacanteId}`, {
            headers: { Authorization: req.headers["authorization"] },
        });
        if (vRes.ok) {
            const vacante = await vRes.json();
            await notificarUsuario({
                userId:  vacante.empresa_id,
                tipo:    "postulacion_nueva",
                titulo:  "Nueva postulación recibida",
                mensaje: `${perfil.nombre} se postuló a "${vacante.titulo}"`,
                meta:    { vacanteId, postulacionId: postulacion.id, estudianteNombre: perfil.nombre },
                authHeader: req.headers["authorization"],
            });
        }
    } catch (_) { /* best-effort */ }

    return res.status(201).json(postulacion);
});

// GET /postulaciones/vacante/:vacanteId — empresa ve postulados
const getPostuladosByVacante = asyncHandler(async (req, res) => {
    const { vacanteId } = req.params;
    if (!vacanteId) return res.status(400).json({ message: "vacanteId requerido" });

    const postulaciones = await PostulacionModel.findByVacanteId(vacanteId);
    return res.json(postulaciones);
});

// PATCH /postulaciones/:id/estado — empresa cambia estado
const updateEstado = asyncHandler(async (req, res) => {
    if (req.user.rol !== "empresa" && req.user.rol !== "admin") {
        return res.status(403).json({ message: "No autorizado para cambiar el estado" });
    }

    const { id } = req.params;
    const { estado } = req.body;

    if (!estado || !ESTADOS_VALIDOS.includes(estado)) {
        return res.status(400).json({
            message: `Estado inválido. Debe ser uno de: ${ESTADOS_VALIDOS.join(", ")}`,
        });
    }

    // Obtener estado actual antes de actualizar (para validar)
    const postulacionActual = await PostulacionModel.findById(id);
    if (!postulacionActual) return res.status(404).json({ message: "Postulación no encontrada" });

    // No permitir modificar si ya está aceptada o confirmada
    if (postulacionActual.estado === "aceptada" || postulacionActual.estado === "confirmada") {
        return res.status(400).json({ message: "No puedes modificar una oferta ya aceptada o confirmada" });
    }

    const postulacion = await PostulacionModel.updateEstado(id, estado);
    if (!postulacion) return res.status(404).json({ message: "Postulación no encontrada" });

    // Obtener datos del estudiante y su perfil (consulta simple)
    try {
        const { rows } = await pool.query(
            `SELECT pf.user_id, pf.nombre, pf.id as perfil_id
             FROM postulaciones po
             JOIN perfiles pf ON pf.id = po.perfil_id
             WHERE po.id = $1 LIMIT 1`,
            [id]
        );

        if (rows.length > 0) {
            const { user_id, nombre, perfil_id } = rows[0];

            // Notificar al estudiante del cambio de estado
            const estadoLabel = ESTADO_LABELS[estado] || estado;
            await notificarUsuario({
                userId:  user_id,
                tipo:    "estado_cambiado",
                titulo:  `Tu postulación fue ${estadoLabel}`,
                mensaje: `El estado de tu postulación cambió a: ${estadoLabel.toUpperCase()}`,
                meta:    { postulacionId: id, estado, vacanteId: postulacion.vacanteId },
                authHeader: req.headers["authorization"],
            });

            // Si fue aceptada → notificar oferta (sin contratar aún)
            if (estado === "aceptada") {
                // Obtener nombre real de la empresa
                let empresaNombre = "la empresa";
                try {
                    const VACANTES_URL = process.env.VACANTES_SERVICE_URL || "http://ms-vacantes:3003";
                    const vacRes = await fetch(`${VACANTES_URL}/vacantes/${postulacion.vacanteId}`, {
                        headers: { Authorization: req.headers["authorization"] },
                    });
                    if (vacRes.ok) {
                        const vacante = await vacRes.json();
                        empresaNombre = vacante.empresa;
                    }
                } catch (err) {
                    console.error("Error obteniendo nombre de empresa:", err.message);
                }

                // Notificación de oferta (el estudiante decidirá después)
                await notificarUsuario({
                    userId: user_id,
                    tipo: "oferta_recibida",
                    titulo: "¡Oferta recibida!",
                    mensaje: `${empresaNombre} te ha aceptado. Revisa tu panel y confirma si deseas realizar tu práctica con ellos.`,
                    meta: { postulacionId: id, estado, vacanteId: postulacion.vacanteId },
                    authHeader: req.headers["authorization"],
                });
            }
        }
    } catch (err) {
        console.error("[postulaciones] Error enviando notificación:", err.message);
        // No falla la respuesta principal
    }

    return res.json(postulacion);
});

// POST /postulaciones/:id/confirmar — estudiante confirma aceptación (elige esta empresa)
// POST /postulaciones/:id/confirmar — estudiante confirma aceptación (elige esta empresa)
const confirmarAceptacion = asyncHandler(async (req, res) => {
    if (req.user.rol !== "estudiante") {
        return res.status(403).json({ message: "Solo estudiantes pueden confirmar" });
    }

    const { id } = req.params;

    // Obtener postulación con datos del perfil (sin vacantes)
    const { rows } = await pool.query(
        `SELECT po.*, pf.user_id, pf.contratado, pf.id as perfil_id, pf.nombre as estudiante_nombre
         FROM postulaciones po
                  JOIN perfiles pf ON pf.id = po.perfil_id
         WHERE po.id = $1`,
        [id]
    );

    if (rows.length === 0) {
        return res.status(404).json({ message: "Postulación no encontrada" });
    }
    const postulacion = rows[0];

    // Verificar que pertenece al estudiante autenticado
    if (postulacion.user_id !== req.user.id) {
        return res.status(403).json({ message: "No autorizado" });
    }

    // Verificar que está en estado "aceptada"
    if (postulacion.estado !== "aceptada") {
        return res.status(400).json({ message: "Solo puedes confirmar ofertas aceptadas" });
    }

    // Verificar que no esté ya contratado
    if (postulacion.contratado) {
        return res.status(400).json({ message: "Ya tienes una práctica asignada" });
    }

    // Obtener datos de la vacante desde ms-vacantes (HTTP)
    let empresaNombre = "la empresa";
    let empresaId = null;
    try {
        const VACANTES_URL = process.env.VACANTES_SERVICE_URL || "http://ms-vacantes:3003";
        const vacRes = await fetch(`${VACANTES_URL}/vacantes/${postulacion.vacante_id}`, {
            headers: { Authorization: req.headers["authorization"] },
        });
        if (vacRes.ok) {
            const vacante = await vacRes.json();
            empresaNombre = vacante.empresa;
            empresaId = vacante.empresa_id;
        } else {
            console.error("Error obteniendo vacante:", await vacRes.text());
        }
    } catch (err) {
        console.error("Error conectando a ms-vacantes:", err.message);
    }

    const client = await pool.connect();
    try {
        await client.query("BEGIN");

        // 1. Marcar este perfil como contratado
        await client.query(
            `UPDATE perfiles SET contratado = TRUE, empresa_contratante = $1 WHERE id = $2`,
            [empresaNombre, postulacion.perfil_id]
        );

        // 2. Cambiar estado de esta postulación a "confirmada"
        await client.query(
            `UPDATE postulaciones SET estado = 'confirmada' WHERE id = $1`,
            [id]
        );

        // 3. Rechazar automáticamente las otras postulaciones aceptadas del mismo estudiante
        await client.query(
            `UPDATE postulaciones SET estado = 'rechazada_por_estudiante'
             WHERE perfil_id = $1 AND id != $2 AND estado = 'aceptada'`,
            [postulacion.perfil_id, id]
        );

        await client.query("COMMIT");

        // Notificar a la empresa (si tenemos empresaId)
        if (empresaId) {
            await notificarUsuario({
                userId: empresaId,
                tipo: "confirmacion_estudiante",
                titulo: "Estudiante confirmó su práctica",
                mensaje: `${postulacion.estudiante_nombre} ha aceptado realizar su práctica en ${empresaNombre}.`,
                meta: { postulacionId: id, vacanteId: postulacion.vacante_id },
                authHeader: req.headers["authorization"],
            });
        }

        auditar(req.headers["authorization"], {
            servicio: "perfiles",
            accion: "confirmar_practica",
            entidad: "postulacion",
            entidadId: id,
            detalle: `${postulacion.estudiante_nombre} confirmó su práctica con ${empresaNombre}`,
        });

        return res.json({ message: "Práctica confirmada exitosamente" });
    } catch (err) {
        await client.query("ROLLBACK");
        console.error("Error confirmando aceptación:", err);
        return res.status(500).json({ message: "Error interno al confirmar" });
    } finally {
        client.release();
    }
});

// POST /postulaciones/:id/solicitar-contratacion — la empresa decide contratar.
// No contrata directamente: marca la postulación como "aceptada" y NOTIFICA A LA
// COORDINADORA para que sea ella quien formalice el convenio.
const solicitarContratacion = asyncHandler(async (req, res) => {
    if (req.user.rol !== "empresa") {
        return res.status(403).json({ message: "Solo las empresas pueden solicitar contratación" });
    }

    const { id } = req.params;
    const { rows } = await pool.query(
        `SELECT po.*, pf.user_id, pf.id AS perfil_id, pf.nombre AS estudiante_nombre
         FROM postulaciones po
         JOIN perfiles pf ON pf.id = po.perfil_id
         WHERE po.id = $1`,
        [id]
    );
    if (!rows.length) return res.status(404).json({ message: "Postulación no encontrada" });
    const post = rows[0];

    if (post.estado === "confirmada") {
        return res.status(400).json({ message: "El estudiante ya confirmó esta práctica" });
    }

    // Marcar como aceptada (sin notificar aún al estudiante; lo hará la coordinadora)
    await pool.query("UPDATE postulaciones SET estado = 'aceptada' WHERE id = $1", [id]);

    // Datos de la vacante (empresa, título)
    let vacanteTitulo = "", empresaNombre = "la empresa", empresaId = req.user.id;
    try {
        const vRes = await fetch(`${VACANTES_URL}/vacantes/${post.vacante_id}`, {
            headers: { Authorization: req.headers["authorization"] },
        });
        if (vRes.ok) {
            const v = await vRes.json();
            vacanteTitulo = v.titulo; empresaNombre = v.empresa; empresaId = v.empresa_id;
        }
    } catch (_) { /* best-effort */ }

    // Resolver la coordinadora (admin) y notificarla
    try {
        const cRes = await fetch(`${AUTH_URL}/auth/coordinador`, {
            headers: { Authorization: req.headers["authorization"] },
        });
        if (cRes.ok) {
            const coord = await cRes.json();
            await NotificacionModel.create({
                userId:  coord.id,
                tipo:    "solicitud_convenio",
                titulo:  "Solicitud de contratación",
                mensaje: `${empresaNombre} desea contratar a ${post.estudiante_nombre} para "${vacanteTitulo}". Crea el convenio de práctica.`,
                meta: {
                    estudianteUserId:   post.user_id,
                    estudiantePerfilId: post.perfil_id,
                    estudianteNombre:   post.estudiante_nombre,
                    vacanteId:          post.vacante_id,
                    vacanteTitulo,
                    empresaId,
                    empresaNombre,
                    postulacionId:      id,
                },
            });
        }
    } catch (_) { /* best-effort */ }

    auditar(req.headers["authorization"], {
        servicio: "perfiles",
        accion: "solicitar_contratacion",
        entidad: "postulacion",
        entidadId: id,
        detalle: `${empresaNombre} solicitó contratar a ${post.estudiante_nombre}`,
    });

    return res.json({ message: "Solicitud enviada a la coordinadora académica" });
});

// PATCH /postulaciones/:id/favorita — estudiante marca vacante favorita
const marcarFavorita = asyncHandler(async (req, res) => {
    const perfil = await PerfilModel.findByUserId(req.user.id);
    if (!perfil) return res.status(404).json({ message: "Perfil no encontrado" });

    const { id } = req.params;

    // Verificar que la postulación pertenece al perfil
    const { rows } = await pool.query(
        `SELECT * FROM postulaciones WHERE id = $1 AND perfil_id = $2 LIMIT 1`,
        [id, perfil.id]
    );
    if (!rows.length) return res.status(404).json({ message: "Postulación no encontrada" });

    // Desmarcar todas y marcar solo esta
    await pool.query(
        `UPDATE postulaciones SET es_favorita = FALSE WHERE perfil_id = $1`,
        [perfil.id]
    );
    const { rows: updated } = await pool.query(
        `UPDATE postulaciones SET es_favorita = TRUE WHERE id = $1 RETURNING *`,
        [id]
    );

    return res.json(updated[0]);
});
const liberarEstudiante = asyncHandler(async (req, res) => {
    if (req.user.rol !== "empresa") {
        return res.status(403).json({ message: "Solo empresas pueden liberar" });
    }
    const { id } = req.params; // id del perfil del estudiante
    // Verificar que la empresa tiene derecho: solo si empresa_contratante coincide con el nombre de la empresa autenticada
    const perfil = await PerfilModel.findById(id);
    if (!perfil) return res.status(404).json({ message: "Perfil no encontrado" });
    if (perfil.empresa_contratante !== req.user.nombre && perfil.empresa_contratante !== req.user.empresa) {
        // req.user.nombre no está en el token, necesitas extraer empresa del token o de la vacante.
        // Opción simple: pasar el nombre de la empresa desde el frontend (no seguro).
        // Lo mejor es que el token de empresa incluya su nombre.
        return res.status(403).json({ message: "No autorizado para liberar este estudiante" });
    }
    await pool.query(
        `UPDATE perfiles SET contratado = FALSE, empresa_contratante = NULL WHERE id = $1`,
        [id]
    );
    return res.json({ message: "Estudiante liberado, puede postularse nuevamente" });
});
module.exports = {
    getMyPostulaciones,
    createPostulacion,
    getPostuladosByVacante,
    updateEstado,
    confirmarAceptacion,
    solicitarContratacion,
    marcarFavorita,
};