require("dotenv").config();

const REQUIRED_ENV = ["JWT_SECRET", "MONGO_URL"];
const missing = REQUIRED_ENV.filter((k) => !process.env[k]);
if (missing.length) {
    console.error(`[ms-audit] Variables faltantes: ${missing.join(", ")}`);
    process.exit(1);
}

const app = require("./app");
const { connect } = require("./db");
const PORT = process.env.PORT || 3007;

connect()
    .then(() => {
        app.listen(PORT, () => console.log(`[ms-audit] Servidor en http://localhost:${PORT}`));
    })
    .catch((err) => {
        console.error("[ms-audit] No se pudo conectar a MongoDB:", err.message);
        process.exit(1);
    });
