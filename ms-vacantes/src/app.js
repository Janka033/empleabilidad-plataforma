const express = require("express");
const cors = require("cors");
const { specs, swaggerUi } = require("./swagger");
const vacantesRoutes = require("./routes/vacantes.routes");

const app = express();

app.use(cors({ origin: process.env.CORS_ORIGIN || "*" }));
app.use(express.json());

app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(specs));
app.use("/vacantes", vacantesRoutes);
app.get("/health", (_req, res) => res.json({ status: "ok", service: "ms-vacantes" }));
app.use((_req, res) => res.status(404).json({ message: "Ruta no encontrada" }));
app.use((err, _req, res, _next) => {
    console.error("[ms-vacantes]", err.message);
    res.status(500).json({ message: "Error interno" });
});

module.exports = app;
