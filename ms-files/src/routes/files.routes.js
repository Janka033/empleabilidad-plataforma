const { Router } = require("express");
const multer = require("multer");
const { subir, ver, mios } = require("../controllers/files.controller");
const { verifyToken } = require("../middlewares/auth.middleware");

const router = Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } });

// La visualización por enlace es pública (la clave UUID es la credencial)
router.get("/view/*", ver);

// Subir y listar requieren autenticación
router.post("/", verifyToken, upload.single("file"), subir);
router.get("/me", verifyToken, mios);

module.exports = router;
