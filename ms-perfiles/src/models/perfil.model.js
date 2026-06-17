const { Pool } = require("pg");

const pool = new Pool({
    host: process.env.DB_HOST,
    port: process.env.DB_PORT || 5432,
    database: process.env.DB_NAME,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
});

// Campos que se pueden actualizar (lista blanca — evitar mass assignment)
const UPDATABLE_FIELDS = ["nombre", "bio", "universidad", "programa", "semestre", "habilidades", "linkedin_url", "cv_url"];

const PerfilModel = {
    async findByUserId(userId) {
        const { rows } = await pool.query(
            "SELECT * FROM perfiles WHERE user_id = $1 LIMIT 1",
            [userId]
        );
        return rows[0] || null;
    },

    async findById(id) {
        const { rows } = await pool.query(
            "SELECT * FROM perfiles WHERE id = $1 LIMIT 1",
            [id]
        );
        return rows[0] || null;
    },

    async create({ userId, nombre, email, universidad, programa, semestre }) {
        // Completitud inicial según los datos enlazados desde el registro
        const completitud = calcularCompletitud({ universidad, programa, semestre });
        const { rows } = await pool.query(
            `INSERT INTO perfiles (user_id, nombre, email, universidad, programa, semestre, completitud)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
            [userId, nombre, email, universidad || null, programa || null, semestre || null, completitud]
        );
        return rows[0];
    },

    async update(id, data) {
        // Solo actualizamos campos de la lista blanca que no sean undefined
        const allowed = Object.keys(data).filter(
            (k) => UPDATABLE_FIELDS.includes(k) && data[k] !== undefined
        );
        if (!allowed.length) return null;

        const sets = allowed.map((k, i) => `${k} = $${i + 2}`).join(", ");
        const values = allowed.map((k) => data[k]);

        // Merge con datos existentes para calcular completitud correctamente
        const { rows: existing } = await pool.query(
            "SELECT * FROM perfiles WHERE id = $1", [id]
        );
        const merged = { ...(existing[0] || {}), ...data };
        const completitud = calcularCompletitud(merged);

        const { rows } = await pool.query(
            `UPDATE perfiles
       SET ${sets}, completitud = $${allowed.length + 2}, updated_at = NOW()
       WHERE id = $1
       RETURNING *`,
            [id, ...values, completitud]
        );
        return rows[0] || null;
    },
};

function calcularCompletitud(perfil) {
    let score = 30; // base por tener cuenta
    if (perfil.bio) score += 15;
    if (perfil.universidad) score += 10;
    if (perfil.programa) score += 10;
    if (perfil.semestre) score += 5;
    if (perfil.habilidades?.length >= 3) score += 20;
    else if (perfil.habilidades?.length >= 1) score += 10;
    if (perfil.linkedin_url) score += 5;
    if (perfil.cv_url) score += 5;
    return Math.min(score, 100);
}

module.exports = PerfilModel;
