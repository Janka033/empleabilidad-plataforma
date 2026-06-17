const express = require("express");
const cors = require("cors");
const practicasRoutes = require("./routes/practicas.routes");

const app = express();

app.use(cors({ origin: process.env.CORS_ORIGIN || "*" }));
app.use(express.json());

app.use("/convenios", practicasRoutes);
app.get("/health", (_req, res) => res.json({ status: "ok", service: "ms-practicas" }));

app.use((_req, res) => res.status(404).json({ message: "Ruta no encontrada" }));
app.use((err, _req, res, _next) => {
    console.error("[ms-practicas]", err.message);
    res.status(500).json({ message: "Error interno" });
});

module.exports = app;
