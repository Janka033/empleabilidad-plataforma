const { enviarEmail } = require("../mailer");

const asyncHandler = (fn) => (req, res, next) =>
    Promise.resolve(fn(req, res, next)).catch(next);

// POST /notificaciones/email — envía un correo (RF11).
// Lo invocan otros microservicios reenviando el JWT del actor.
const enviar = asyncHandler(async (req, res) => {
    const { to, titulo, mensaje } = req.body;
    if (!to || !titulo || !mensaje) {
        return res.status(400).json({ message: "to, titulo y mensaje son obligatorios" });
    }

    const info = await enviarEmail({ to, titulo, mensaje });
    return res.status(202).json({ ok: true, messageId: info.messageId });
});

module.exports = { enviar };
