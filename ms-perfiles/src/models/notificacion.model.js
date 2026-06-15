const { Pool } = require("pg");

const pool = new Pool({
    host:     process.env.DB_HOST,
    port:     process.env.DB_PORT || 5432,
    database: process.env.DB_NAME,
    user:     process.env.DB_USER,
    password: process.env.DB_PASSWORD,
});

const NotificacionModel = {
    // Crear una notificación
    async create({ userId, tipo, titulo, mensaje, meta = null }) {
        const { rows } = await pool.query(
            `INSERT INTO notificaciones (user_id, tipo, titulo, mensaje, meta)
             VALUES ($1, $2, $3, $4, $5)
             RETURNING *`,
            [userId, tipo, titulo, mensaje, meta ? JSON.stringify(meta) : null]
        );
        return rows[0];
    },

    // Obtener notificaciones de un usuario (las no leídas primero)
    async findByUserId(userId, limit = 30) {
        const { rows } = await pool.query(
            `SELECT * FROM notificaciones
             WHERE user_id = $1
             ORDER BY leida ASC, created_at DESC
             LIMIT $2`,
            [userId, limit]
        );
        return rows;
    },

    // Contar no leídas
    async countUnread(userId) {
        const { rows } = await pool.query(
            `SELECT COUNT(*) FROM notificaciones WHERE user_id = $1 AND leida = FALSE`,
            [userId]
        );
        return parseInt(rows[0].count, 10);
    },

    // Marcar una como leída
    async markRead(id, userId) {
        const { rows } = await pool.query(
            `UPDATE notificaciones SET leida = TRUE
             WHERE id = $1 AND user_id = $2
             RETURNING *`,
            [id, userId]
        );
        return rows[0] || null;
    },

    // Marcar todas como leídas
    async markAllRead(userId) {
        await pool.query(
            `UPDATE notificaciones SET leida = TRUE WHERE user_id = $1`,
            [userId]
        );
    },
};

module.exports = NotificacionModel;