require("dotenv").config();

// ── Fail-fast: variables críticas ────────────────────────────────────
const REQUIRED_ENV = ["JWT_SECRET", "DB_HOST", "DB_NAME", "DB_USER", "DB_PASSWORD"];
const missing = REQUIRED_ENV.filter((k) => !process.env[k]);
if (missing.length) {
    console.error(`[ms-auth] Variables de entorno faltantes: ${missing.join(", ")}`);
    process.exit(1);
}

if (process.env.JWT_SECRET.length < 32) {
    console.error("[ms-auth] JWT_SECRET debe tener al menos 32 caracteres");
    process.exit(1);
}

const app = require("./app");

const PORT = process.env.PORT || 3001;

app.listen(PORT, () => {
    console.log(`[ms-auth] Servidor corriendo en http://localhost:${PORT}`);
    console.log(`[ms-auth] Swagger en http://localhost:${PORT}/api-docs`);
});
