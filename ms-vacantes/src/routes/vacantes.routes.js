const { Router } = require("express");
const { list, getById, create, update, misVacantes, cambiarActiva, buscar } = require("../controllers/vacantes.controller");
const { verifyToken } = require("../middlewares/auth.middleware");

const router = Router();

// Todas las rutas requieren JWT
router.use(verifyToken);

// GET /vacantes/buscar → buscador avanzado (ElasticSearch). Antes de /:id
router.get("/buscar", buscar);

// GET /vacantes/mias → vacantes propias de la empresa (incluye inactivas). Antes de /:id
router.get("/mias", misVacantes);

/**
 * @swagger
 * tags:
 *   name: Vacantes
 *   description: Gestión de vacantes de empleo
 */

// GET  /vacantes          → listar con filtros (titulo, modalidad, area, salarioMin, limit, offset)
router.get("/",    list);

// GET  /vacantes/:id      → detalle de una vacante
router.get("/:id", getById);

// POST /vacantes          → crear vacante (empresa)
router.post("/",   create);

// PUT  /vacantes/:id      → actualizar vacante (empresa dueña)
router.put("/:id", update);

// PATCH /vacantes/:id/activa → activar/desactivar (empresa dueña)
router.patch("/:id/activa", cambiarActiva);

module.exports = router;
