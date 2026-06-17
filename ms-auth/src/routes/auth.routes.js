const { Router } = require("express");
const multer = require("multer");
const { register, login, me, updatePerfil, coordinador, forgotPassword, resetPassword, google } = require("../controllers/auth.controller");
const { verifyToken } = require("../middlewares/auth.middleware");

const router = Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } });

router.post("/register", register);
router.post("/login", login);
router.post("/forgot-password", forgotPassword);
router.post("/reset-password", resetPassword);
router.post("/google", google);
router.get("/me", verifyToken, me);
router.get("/coordinador", verifyToken, coordinador);
router.put("/perfil", verifyToken, upload.single("cv"), updatePerfil);

module.exports = router;
