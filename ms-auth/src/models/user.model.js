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

    // ── Inicio de sesión con Google ─────────────────────────────────────────
    async findByGoogleId(googleId) {
        const { rows } = await pool.query(
            "SELECT * FROM users WHERE google_id = $1 LIMIT 1",
            [googleId]
        );
        return rows[0] || null;
    },

    async createGoogle({ nombre, email, googleId, rol }) {
        const { rows } = await pool.query(
            `INSERT INTO users (nombre, email, rol, google_id, auth_provider)
       VALUES ($1, $2, $3, $4, 'google')
       RETURNING id, nombre, email, rol, created_at`,
            [nombre, email, rol, googleId]
        );
        return rows[0];
    },

    // Vincula una cuenta local existente con su google_id (mismo email)
    async linkGoogle(userId, googleId) {
        await pool.query(
            "UPDATE users SET google_id = $1, updated_at = NOW() WHERE id = $2",
            [googleId, userId]
        );
    },

    // ── Restablecimiento de contraseña ──────────────────────────────────────
    async updatePassword(userId, passwordHash) {
        await pool.query(
            "UPDATE users SET password_hash = $1, updated_at = NOW() WHERE id = $2",
            [passwordHash, userId]
        );
    },

    async createReset(userId, tokenHash, expiresAt) {
        // Invalida tokens anteriores no usados y crea uno nuevo
        await pool.query("UPDATE password_resets SET used = TRUE WHERE user_id = $1 AND used = FALSE", [userId]);
        await pool.query(
            "INSERT INTO password_resets (user_id, token_hash, expires_at) VALUES ($1, $2, $3)",
            [userId, tokenHash, expiresAt]
        );
    },

    async findValidReset(tokenHash) {
        const { rows } = await pool.query(
            "SELECT * FROM password_resets WHERE token_hash = $1 AND used = FALSE AND expires_at > NOW() LIMIT 1",
            [tokenHash]
        );
        return rows[0] || null;
    },

    async markResetUsed(id) {
        await pool.query("UPDATE password_resets SET used = TRUE WHERE id = $1", [id]);
    },

    async emailExists(email) {
        const { rows } = await pool.query(
            "SELECT 1 FROM users WHERE email = $1 LIMIT 1",
            [email]
        );
        return rows.length > 0;
    },

    // Primer usuario con un rol dado (p. ej. la coordinadora académica = admin)
    async findByRol(rol) {
        const { rows } = await pool.query(
            "SELECT id, nombre, email, rol FROM users WHERE rol = $1 AND activo = TRUE ORDER BY created_at ASC LIMIT 1",
            [rol]
        );
        return rows[0] || null;
    },
};

module.exports = UserModel;
