const express = require("express");
const cors = require("cors");
const path = require("path");
const { specs, swaggerUi } = require("./swagger");
const authRoutes = require("./routes/auth.routes");

const app = express();

// Middlewares
app.use(cors({ origin: process.env.CORS_ORIGIN || "*" }));
app.use(express.json());
app.use("/uploads", express.static(path.join(__dirname, "../../uploads")));

// Swagger
app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(specs));

// Routes
app.use("/auth", authRoutes);

// Health check
app.get("/health", (_req, res) => res.json({ status: "ok", service: "ms-auth" }));

// 404
app.use((_req, res) => res.status(404).json({ message: "Ruta no encontrada" }));

// Error handler
app.use((err, _req, res, _next) => {
    console.error("[ms-auth] Error:", err.message);
    res.status(500).json({ message: "Error interno del servidor" });
});

module.exports = app;
