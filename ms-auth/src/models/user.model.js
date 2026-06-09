const { Pool } = require("pg");

const pool = new Pool({
    host: process.env.DB_HOST,
    port: process.env.DB_PORT || 5432,
    database: process.env.DB_NAME,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
});

const ALLOWED_FIELDS = ["nombre", "email", "password_hash", "rol", "activo"];

const UserModel = {
    async findByEmail(email) {
        const { rows } = await pool.query(
            "SELECT * FROM users WHERE email = $1 LIMIT 1",
            [email]
        );
        return rows[0] || null;
    },

    async findById(id) {
        const { rows } = await pool.query(
            "SELECT id, nombre, email, rol, activo, created_at FROM users WHERE id = $1 LIMIT 1",
            [id]
        );
        return rows[0] || null;
    },

    async create({ nombre, email, passwordHash, rol }) {
        // Lista blanca de campos — evitar mass assignment
        const { rows } = await pool.query(
            `INSERT INTO users (nombre, email, password_hash, rol)
       VALUES ($1, $2, $3, $4)
       RETURNING id, nombre, email, rol, created_at`,
            [nombre, email, passwordHash, rol]
        );
        return rows[0];
    },

    async emailExists(email) {
        const { rows } = await pool.query(
            "SELECT 1 FROM users WHERE email = $1 LIMIT 1",
            [email]
        );
        return rows.length > 0;
    },
};

module.exports = UserModel;
