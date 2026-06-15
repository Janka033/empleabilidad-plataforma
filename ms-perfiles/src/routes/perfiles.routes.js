const { Router } = require("express");
const { getMe, getById, update, updateMe, create, liberarEstudiante } = require("../controllers/perfiles.controller");
const { verifyToken } = require("../middlewares/auth.middleware");

const router = Router();

router.use(verifyToken);

router.post("/", create);
router.get("/me", getMe);
router.put("/me", updateMe);
router.get("/:id", getById);
router.put("/:id", update);
router.patch("/liberar/:id", liberarEstudiante);  // ✅ ahora liberarEstudiante está definido

module.exports = router;