const NotificacionModel = require("../models/notificacion.model");

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

module.exports = { getMias, marcarLeida, marcarTodasLeidas };