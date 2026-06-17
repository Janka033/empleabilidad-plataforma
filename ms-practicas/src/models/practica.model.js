const { Pool } = require("pg");

const pool = new Pool({
    host: process.env.DB_HOST,
    port: process.env.DB_PORT || 5432,
    database: process.env.DB_NAME,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
});

const PracticaModel = {
    // ── Convenios ───────────────────────────────────────────────────────────
    async createConvenio(data) {
        const { rows } = await pool.query(
            `INSERT INTO convenios
                (estudiante_user_id, estudiante_perfil_id, estudiante_nombre,
                 empresa_id, empresa_nombre, vacante_id, vacante_titulo,
                 tutor_empresarial, tutor_academico, modalidad, funciones,
                 fecha_inicio, fecha_fin)
             VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)
             RETURNING *`,
            [
                data.estudianteUserId, data.estudiantePerfilId, data.estudianteNombre,
                data.empresaId, data.empresaNombre, data.vacanteId, data.vacanteTitulo,
                data.tutorEmpresarial, data.tutorAcademico, data.modalidad, data.funciones,
                data.fechaInicio || null, data.fechaFin || null,
            ]
        );
        return rows[0];
    },

    async findById(id) {
        const { rows } = await pool.query("SELECT * FROM convenios WHERE id = $1 LIMIT 1", [id]);
        return rows[0] || null;
    },

    async findByEmpresa(empresaId) {
        const { rows } = await pool.query(
            `SELECT c.*,
                    COUNT(e.id)                                   AS total_evaluaciones,
                    COUNT(e.id) FILTER (WHERE e.tipo = 'final')   AS tiene_final
             FROM convenios c
             LEFT JOIN evaluaciones e ON e.convenio_id = c.id
             WHERE c.empresa_id = $1
             GROUP BY c.id
             ORDER BY c.created_at DESC`,
            [empresaId]
        );
        return rows;
    },

    async findByEstudiante(userId) {
        const { rows } = await pool.query(
            "SELECT * FROM convenios WHERE estudiante_user_id = $1 ORDER BY created_at DESC",
            [userId]
        );
        return rows;
    },

    // Todos los convenios (vista de la coordinadora)
    async findAll() {
        const { rows } = await pool.query("SELECT * FROM convenios ORDER BY created_at DESC");
        return rows;
    },

    // ¿Ya existe convenio para este estudiante en esta vacante?
    async existsForEstudianteVacante(estudianteUserId, vacanteId) {
        const { rows } = await pool.query(
            `SELECT 1 FROM convenios
             WHERE estudiante_user_id = $1 AND vacante_id = $2 LIMIT 1`,
            [estudianteUserId, vacanteId]
        );
        return rows.length > 0;
    },

    async finalizarConvenio(id) {
        const { rows } = await pool.query(
            `UPDATE convenios SET estado = 'finalizado', updated_at = NOW()
             WHERE id = $1 RETURNING *`,
            [id]
        );
        return rows[0] || null;
    },

    async cancelarConvenio(id) {
        const { rows } = await pool.query(
            `UPDATE convenios SET estado = 'cancelado', updated_at = NOW()
             WHERE id = $1 RETURNING *`,
            [id]
        );
        return rows[0] || null;
    },

    // ── Evaluaciones ────────────────────────────────────────────────────────
    async createEvaluacion(convenioId, data) {
        const { rows } = await pool.query(
            `INSERT INTO evaluaciones (convenio_id, tipo, calificacion, observaciones, evaluador)
             VALUES ($1,$2,$3,$4,$5) RETURNING *`,
            [convenioId, data.tipo, data.calificacion, data.observaciones, data.evaluador]
        );
        return rows[0];
    },

    async findEvaluaciones(convenioId) {
        const { rows } = await pool.query(
            "SELECT * FROM evaluaciones WHERE convenio_id = $1 ORDER BY created_at ASC",
            [convenioId]
        );
        return rows;
    },
};

module.exports = PracticaModel;
