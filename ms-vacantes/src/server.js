require("dotenv").config();

const REQUIRED_ENV = ["JWT_SECRET", "DB_HOST", "DB_NAME", "DB_USER", "DB_PASSWORD"];
const missing = REQUIRED_ENV.filter((k) => !process.env[k]);
if (missing.length) {
    console.error(`[ms-vacantes] Variables faltantes: ${missing.join(", ")}`);
    process.exit(1);
}

const app = require("./app");
const PORT = process.env.PORT || 3003;

app.listen(PORT, () => {
    console.log(`[ms-vacantes] Servidor en http://localhost:${PORT}`);
    console.log(`[ms-vacantes] Swagger en http://localhost:${PORT}/api-docs`);
});
