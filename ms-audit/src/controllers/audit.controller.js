const { getDb } = require("../db");

const asyncHandler = (fn) => (req, res, next) =>
    Promise.resolve(fn(req, res, next)).catch(next);

// POST /audit — registrar un evento de auditoría (RF19).
// Lo invocan los demás microservicios reenviando el JWT del actor.
const registrar = asyncHandler(async (req, res) => {
    const { servicio, accion, entidad, entidadId, detalle } = req.body;
    if (!servicio || !accion) {
        return res.status(400).json({ message: "servicio y accion son obligatorios" });
    }

    const doc = {
        servicio,
        accion,
        entidad: entidad || null,
        entidad_id: entidadId || null,
        detalle: detalle || null,
        // El actor es autoritativo desde el token, no desde el body
        usuario_id: req.user.id,
        usuario_rol: req.user.rol,
        usuario_email: req.user.email || null,
        ip: req.headers["x-forwarded-for"] || req.socket.remoteAddress || null,
        created_at: new Date(),
    };

    await getDb().collection("audit_logs").insertOne(doc);
    return res.status(201).json({ ok: true });
});

// GET /audit — consultar logs (solo administrador) — RF19, CU08 institucional.
const listar = asyncHandler(async (req, res) => {
    if (req.user.rol !== "admin") {
        return res.status(403).json({ message: "Solo administradores" });
    }

    const { servicio, accion, usuarioId } = req.query;
    const limit = Math.min(parseInt(req.query.limit) || 50, 200);
    const offset = parseInt(req.query.offset) || 0;

    const filtro = {};
    if (servicio) filtro.servicio = servicio;
    if (accion) filtro.accion = accion;
    if (usuarioId) filtro.usuario_id = usuarioId;

    const col = getDb().collection("audit_logs");
    const [logs, total] = await Promise.all([
        col.find(filtro).sort({ created_at: -1 }).skip(offset).limit(limit).toArray(),
        col.countDocuments(filtro),
    ]);

    return res.json({ logs, total });
});

module.exports = { registrar, listar };
