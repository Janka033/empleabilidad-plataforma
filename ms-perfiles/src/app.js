const express = require("express");
const cors = require("cors");
const { specs, swaggerUi } = require("./swagger");
const perfilesRoutes      = require("./routes/perfiles.routes");
const postulacionesRoutes = require("./routes/postulaciones.routes");
const notificacionesRoutes = require("./routes/notificaciones.routes");

const app = express();

app.use(cors({ origin: process.env.CORS_ORIGIN || "*" }));
app.use(express.json());

app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(specs));

app.use("/perfiles",        perfilesRoutes);
app.use("/postulaciones",   postulacionesRoutes);
app.use("/notificaciones",  notificacionesRoutes);

app.get("/health", (_req, res) => res.json({ status: "ok", service: "ms-perfiles" }));

app.use((_req, res) => res.status(404).json({ message: "Ruta no encontrada" }));

app.use((err, _req, res, _next) => {
    console.error("[ms-perfiles] Error:", err.message);
    res.status(500).json({ message: "Error interno del servidor" });
});

module.exports = app;