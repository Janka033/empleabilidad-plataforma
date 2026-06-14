const { Router } = require("express");
const { list, getById, create, update } = require("../controllers/vacantes.controller");
const { verifyToken } = require("../middlewares/auth.middleware");

const router = Router();

// Todas las rutas requieren JWT
router.use(verifyToken);

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

module.exports = router;
