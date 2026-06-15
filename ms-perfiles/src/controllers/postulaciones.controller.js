const PerfilModel         = require("../models/perfil.model");
const PostulacionModel    = require("../models/postulacion.model");
const NotificacionModel   = require("../models/notificacion.model");
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

const ESTADOS_VALIDOS = ["enviada", "vista", "entrevista", "rechazada", "aceptada"];

const ESTADO_LABELS = {
    enviada:    "enviada",
    vista:      "vista por la empresa",
    entrevista: "en proceso de entrevista",
    rechazada:  "rechazada",
    aceptada:   "aceptada",
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

    // Notificar a la empresa (necesitamos el empresa_id de la vacante)
    // Lo buscamos desde ms-vacantes via HTTP (best-effort)
    try {
        const VACANTES_URL = process.env.VACANTES_SERVICE_URL || "http://ms-vacantes:3003";
        const vRes = await fetch(`${VACANTES_URL}/vacantes/${vacanteId}`, {
            headers: { Authorization: req.headers["authorization"] },
        });
        if (vRes.ok) {
            const vacante = await vRes.json();
            await NotificacionModel.create({
                userId:  vacante.empresa_id,
                tipo:    "postulacion_nueva",
                titulo:  "Nueva postulación recibida",
                mensaje: `${perfil.nombre} se postuló a "${vacante.titulo}"`,
                meta:    { vacanteId, postulacionId: postulacion.id, estudianteNombre: perfil.nombre },
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
    if (req.user.rol !== "empresa") {
        return res.status(403).json({ message: "Solo las empresas pueden cambiar el estado" });
    }

    const { id } = req.params;
    const { estado } = req.body;

    if (!estado || !ESTADOS_VALIDOS.includes(estado)) {
        return res.status(400).json({
            message: `Estado inválido. Debe ser uno de: ${ESTADOS_VALIDOS.join(", ")}`,
        });
    }

    const postulacion = await PostulacionModel.updateEstado(id, estado);
    if (!postulacion) return res.status(404).json({ message: "Postulación no encontrada" });

    // Obtener userId del estudiante a través del perfil
    try {
        const { rows } = await pool.query(
            `SELECT p.user_id, p.nombre, p.contratado, pr.empresa AS empresa_contratante
             FROM perfiles p
             JOIN postulaciones post ON post.perfil_id = p.id
             LEFT JOIN postulaciones pr ON pr.id = post.id
             WHERE post.id = $1 LIMIT 1`,
            [id]
        );

        // Query más simple
        const { rows: rows2 } = await pool.query(
            `SELECT pf.user_id, pf.nombre, pf.id as perfil_id
             FROM postulaciones po
             JOIN perfiles pf ON pf.id = po.perfil_id
             WHERE po.id = $1 LIMIT 1`,
            [id]
        );

        if (rows2.length > 0) {
            const { user_id, nombre, perfil_id } = rows2[0];

            // Notificar al estudiante del cambio de estado
            const estadoLabel = ESTADO_LABELS[estado] || estado;
            await NotificacionModel.create({
                userId:  user_id,
                tipo:    "estado_cambiado",
                titulo:  `Tu postulación fue ${estadoLabel}`,
                mensaje: `El estado de tu postulación cambió a: ${estadoLabel.toUpperCase()}`,
                meta:    { postulacionId: id, estado, vacanteId: postulacion.vacanteId },
            });

            // Si fue aceptada → marcar al estudiante como contratado
            if (estado === "aceptada") {
                // Obtener nombre de la empresa desde el token
                const empresaNombre = req.user.nombre || "la empresa";
                await pool.query(
                    `UPDATE perfiles
                     SET contratado = TRUE, empresa_contratante = $2
                     WHERE id = $1`,
                    [perfil_id, empresaNombre]
                );

                // Notificación especial de contratación
                await NotificacionModel.create({
                    userId:  user_id,
                    tipo:    "contratado",
                    titulo:  "¡Felicitaciones! Fuiste seleccionado",
                    mensaje: `Fuiste seleccionado por ${empresaNombre}. ¡Tu práctica profesional comienza pronto!`,
                    meta:    { postulacionId: id, vacanteId: postulacion.vacanteId },
                });
            }
        }
    } catch (err) {
        console.error("[postulaciones] Error enviando notificación:", err.message);
        // No falla la respuesta principal
    }

    return res.json(postulacion);
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

module.exports = {
    getMyPostulaciones,
    createPostulacion,
    getPostuladosByVacante,
    updateEstado,
    marcarFavorita,
};