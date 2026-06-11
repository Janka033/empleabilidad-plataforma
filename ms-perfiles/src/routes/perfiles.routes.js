const { Router } = require("express");
const { getMe, getById, update, updateMe, create } = require("../controllers/perfiles.controller");
const { verifyToken } = require("../middlewares/auth.middleware");

const router = Router();

router.use(verifyToken); // todas las rutas requieren auth

// IMPORTANTE: rutas específicas ANTES de /:id para evitar conflictos
router.post("/", create);       // ms-auth llama esto al registrar un nuevo usuario
router.get("/me", getMe);       // perfil del usuario autenticado
router.put("/me", updateMe);    // actualizar perfil del usuario autenticado
router.get("/:id", getById);    // perfil por ID (uso interno / empresa viendo estudiante)
router.put("/:id", update);     // actualizar perfil por ID

module.exports = router;