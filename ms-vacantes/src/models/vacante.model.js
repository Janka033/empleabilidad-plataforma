const { Pool } = require("pg");

const pool = new Pool({
    host: process.env.DB_HOST,
    port: process.env.DB_PORT || 5432,
    database: process.env.DB_NAME,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
});

const CREATABLE_FIELDS = ["empresa_id", "titulo", "empresa", "descripcion", "requisitos", "modalidad", "tipo", "ciudad", "area", "salario", "fecha_cierre"];
const UPDATABLE_FIELDS = ["titulo", "descripcion", "requisitos", "modalidad", "tipo", "ciudad", "area", "salario", "activa", "fecha_cierre"];

const VacanteModel = {
    async findAll({ modalidad, tipo, area, activa = true, limit = 50, offset = 0 } = {}) {
        const conditions = ["activa = $1"];
        const values = [activa];
        let idx = 2;

        if (modalidad) { conditions.push(`modalidad = $${idx++}`); values.push(modalidad); }
        if (tipo)      { conditions.push(`tipo = $${idx++}`);      values.push(tipo); }
        if (area)      { conditions.push(`area = $${idx++}`);      values.push(area); }

        const where = conditions.join(" AND ");

        const [dataRes, countRes] = await Promise.all([
            pool.query(
                `SELECT * FROM vacantes WHERE ${where} ORDER BY created_at DESC LIMIT $${idx} OFFSET $${idx + 1}`,
                [...values, limit, offset]
            ),
            pool.query(`SELECT COUNT(*) FROM vacantes WHERE ${where}`, values),
        ]);

        return { vacantes: dataRes.rows, total: parseInt(countRes.rows[0].count, 10) };
    },

    async findById(id) {
        const { rows } = await pool.query(
            "SELECT * FROM vacantes WHERE id = $1 LIMIT 1",
            [id]
        );
        return rows[0] || null;
    },

    async create(data) {
        // Lista blanca de campos
        const allowed = CREATABLE_FIELDS.filter((k) => data[k] !== undefined);
        const cols = allowed.join(", ");
        const placeholders = allowed.map((_, i) => `$${i + 1}`).join(", ");
        const values = allowed.map((k) => data[k]);

        const { rows } = await pool.query(
            `INSERT INTO vacantes (${cols}) VALUES (${placeholders}) RETURNING *`,
            values
        );
        return rows[0];
    },

    async update(id, data) {
        const allowed = Object.keys(data).filter((k) => UPDATABLE_FIELDS.includes(k));
        if (!allowed.length) return null;

        const sets = allowed.map((k, i) => `${k} = $${i + 2}`).join(", ");
        const values = allowed.map((k) => data[k]);

        const { rows } = await pool.query(
            `UPDATE vacantes SET ${sets}, updated_at = NOW() WHERE id = $1 RETURNING *`,
            [id, ...values]
        );
        return rows[0] || null;
    },
};

module.exports = VacanteModel;
