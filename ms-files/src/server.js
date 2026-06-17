require("dotenv").config();

const REQUIRED_ENV = ["JWT_SECRET", "S3_ENDPOINT"];
const missing = REQUIRED_ENV.filter((k) => !process.env[k]);
if (missing.length) {
    console.error(`[ms-files] Variables faltantes: ${missing.join(", ")}`);
    process.exit(1);
}

const app = require("./app");
const { ensureBucket } = require("./s3");
const PORT = process.env.PORT || 3009;

ensureBucket()
    .then(() => {
        app.listen(PORT, () => console.log(`[ms-files] Servidor en http://localhost:${PORT}`));
    })
    .catch((err) => {
        console.error("[ms-files] No se pudo inicializar el bucket S3:", err.message);
        process.exit(1);
    });
