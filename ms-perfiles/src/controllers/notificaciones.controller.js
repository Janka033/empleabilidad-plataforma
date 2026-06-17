const NotificacionModel = require("../models/notificacion.model");
const { notificarUsuario } = require("../services/notificador.service");

const asyncHandler = (fn) => (req, res, next) =>
    Promise.resolve(fn(req, res, next)).catch(next);

// GET /notificaciones — mis notificaciones
const getMias = asyncHandler(async (req, res) => {
    const notifs = await NotificacionModel.findByUserId(req.user.id);
    const unread = await NotificacionModel.countUnread(req.user.id);
    return res.json({ notificaciones: notifs, noLeidas: unread });
});

// PATCH /notificaciones/:id/leer — marcar una leída
const marcarLeida = asyncHandler(async (req, res) => {
    const notif = await NotificacionModel.markRead(req.params.id, req.user.id);
    if (!notif) return res.status(404).json({ message: "Notificación no encontrada" });
    return res.json(notif);
});

// PATCH /notificaciones/leer-todas — marcar todas leídas
const marcarTodasLeidas = asyncHandler(async (req, res) => {
    await NotificacionModel.markAllRead(req.user.id);
    return res.json({ ok: true });
});

// POST /notificaciones — crear notificación para un usuario.
// Usado por otros microservicios (p.ej. ms-practicas) que reenvían el JWT.
const crear = asyncHandler(async (req, res) => {
    const { userId, tipo, titulo, mensaje, meta } = req.body;
    if (!userId || !tipo || !titulo || !mensaje) {
        return res.status(400).json({ message: "userId, tipo, titulo y mensaje son obligatorios" });
    }
    // Panel + email (RF11)
    const notif = await notificarUsuario({ userId, tipo, titulo, mensaje, meta, authHeader: req.headers["authorization"] });
    return res.status(201).json(notif);
});

module.exports = { getMias, marcarLeida, marcarTodasLeidas, crear };