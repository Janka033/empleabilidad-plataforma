const { Router } = require("express");
const { getMe, getById, update } = require("../controllers/perfiles.controller");
const { verifyToken } = require("../middlewares/auth.middleware");

const router = Router();

router.use(verifyToken); // todas las rutas requieren auth

router.get("/me", getMe);
router.get("/:id", getById);
router.put("/:id", update);

module.exports = router;
