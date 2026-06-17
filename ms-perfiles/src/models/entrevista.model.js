const { Pool } = require("pg");

const pool = new Pool({
    host: process.env.DB_HOST,
    port: process.env.DB_PORT || 5432,
    database: process.env.DB_NAME,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
});

const EntrevistaModel = {
    async create(data) {
        const { rows } = await pool.query(
            `INSERT INTO entrevistas
                (postulacion_id, estudiante_user_id, estudiante_perfil_id, estudiante_nombre,
                 empresa_id, empresa_nombre, vacante_id, vacante_titulo,
                 tipo, enlace, lugar, fecha, hora)
             VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)
             RETURNING *`,
            [
                data.postulacionId, data.estudianteUserId, data.estudiantePerfilId, data.estudianteNombre,
                data.empresaId, data.empresaNombre, data.vacanteId, data.vacanteTitulo,
                data.tipo, data.enlace || null, data.lugar || null, data.fecha || null, data.hora || null,
            ]
        );
        return rows[0];
    },

    async findById(id) {
        const { rows } = await pool.query("SELECT * FROM entrevistas WHERE id = $1 LIMIT 1", [id]);
        return rows[0] || null;
    },

    async findAll() {
        const { rows } = await pool.query("SELECT * FROM entrevistas ORDER BY created_at DESC");
        return rows;
    },

    async findByEstudiante(userId) {
        const { rows } = await pool.query(
            "SELECT * FROM entrevistas WHERE estudiante_user_id = $1 ORDER BY created_at DESC",
            [userId]
        );
        return rows;
    },

    async findByEmpresa(empresaId) {
        const { rows } = await pool.query(
            "SELECT * FROM entrevistas WHERE empresa_id = $1 ORDER BY created_at DESC",
            [empresaId]
        );
        return rows;
    },

    async setEstado(id, estado) {
        const { rows } = await pool.query(
            "UPDATE entrevistas SET estado = $2, updated_at = NOW() WHERE id = $1 RETURNING *",
            [id, estado]
        );
        return rows[0] || null;
    },
};

module.exports = EntrevistaModel;
