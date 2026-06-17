const { Pool } = require("pg");
const NotificacionModel = require("../models/notificacion.model");

const pool = new Pool({
    host: process.env.DB_HOST,
    port: process.env.DB_PORT || 5432,
    database: process.env.DB_NAME,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
});

const NOTIF_URL = process.env.NOTIFICACIONES_SERVICE_URL || "http://ms-notifications:3008";

/**
 * Notifica a un usuario por los dos canales:
 *   1. Panel (persistido en la tabla notificaciones).
 *   2. Correo electrónico (best-effort vía ms-notifications) — RF11.
 *
 * El email del destinatario se resuelve desde la tabla perfiles (user_id → email).
 */
async function notificarUsuario({ userId, tipo, titulo, mensaje, meta, authHeader }) {
    // 1. Notificación en panel (canal principal, sí se espera)
    const notif = await NotificacionModel.create({ userId, tipo, titulo, mensaje, meta });

    // 2. Email (canal complementario, no bloquea ni rompe el flujo)
    try {
        const { rows } = await pool.query(
            "SELECT email FROM perfiles WHERE user_id = $1 LIMIT 1",
            [userId]
        );
        const email = rows[0] && rows[0].email;
        if (email) {
            fetch(`${NOTIF_URL}/notificaciones/email`, {
                method: "POST",
                headers: { "Content-Type": "application/json", Authorization: authHeader || "" },
                body: JSON.stringify({ to: email, titulo, mensaje }),
            }).catch(() => {});
        }
    } catch (_) { /* el correo es complementario */ }

    return notif;
}

module.exports = { notificarUsuario };
