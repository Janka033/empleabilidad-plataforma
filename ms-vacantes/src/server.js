require("dotenv").config();

const REQUIRED_ENV = ["JWT_SECRET", "DB_HOST", "DB_NAME", "DB_USER", "DB_PASSWORD"];
const missing = REQUIRED_ENV.filter((k) => !process.env[k]);
if (missing.length) {
    console.error(`[ms-vacantes] Variables faltantes: ${missing.join(", ")}`);
    process.exit(1);
}

const app = require("./app");
const ES = require("./es");
const VacanteModel = require("./models/vacante.model");
const PORT = process.env.PORT || 3003;

app.listen(PORT, () => {
    console.log(`[ms-vacantes] Servidor en http://localhost:${PORT}`);
    console.log(`[ms-vacantes] Swagger en http://localhost:${PORT}/api-docs`);
});

// Inicializar el buscador (RF06) de forma resiliente y con reintentos:
// ElasticSearch puede tardar en estar listo. Si nunca lo está, el servicio
// sigue funcionando con el fallback a PostgreSQL.
async function initBuscador(intentos = 10) {
    for (let i = 1; i <= intentos; i++) {
        try {
            await ES.ensureIndex();
            const vacantes = await VacanteModel.findAllForIndex();
            await ES.reindexAll(vacantes);
            return;
        } catch (e) {
            console.log(`[ms-vacantes] ElasticSearch no listo (intento ${i}/${intentos}): ${e.message}`);
            await new Promise((r) => setTimeout(r, 6000));
        }
    }
    console.error("[ms-vacantes] No se pudo inicializar ElasticSearch; se usará PostgreSQL.");
}
initBuscador();
