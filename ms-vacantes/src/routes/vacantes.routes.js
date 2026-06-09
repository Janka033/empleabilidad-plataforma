const { Router } = require("express");
const { list, getById, create, update } = require("../controllers/vacantes.controller");
const { verifyToken, requireEmpresa } = require("../middlewares/auth.middleware");

const router = Router();

// Lectura — cualquier usuario autenticado
router.get("/", verifyToken, list);
router.get("/:id", verifyToken, getById);

// Escritura — solo empresas
router.post("/", verifyToken, requireEmpresa, create);
router.put("/:id", verifyToken, requireEmpresa, update);

module.exports = router;
