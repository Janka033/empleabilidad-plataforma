require("dotenv").config();

const REQUIRED_ENV = ["JWT_SECRET", "SMTP_HOST"];
const missing = REQUIRED_ENV.filter((k) => !process.env[k]);
if (missing.length) {
    console.error(`[ms-notifications] Variables faltantes: ${missing.join(", ")}`);
    process.exit(1);
}

const app = require("./app");
const PORT = process.env.PORT || 3008;

app.listen(PORT, () => {
    console.log(`[ms-notifications] Servidor en http://localhost:${PORT}`);
});
