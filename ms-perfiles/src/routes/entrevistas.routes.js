const { Router } = require("express");
const {
    crear,
    listarCoordinadora,
    confirmarCoordinadora,
    listarEstudiante,
    confirmarAsistencia,
    listarEmpresa,
    rechazar,
} = require("../controllers/entrevistas.controller");
const { verifyToken } = require("../middlewares/auth.middleware");

const router = Router();

router.use(verifyToken);

router.post("/",                         crear);
router.get("/coordinadora",              listarCoordinadora);
router.get("/me",                        listarEstudiante);
router.get("/empresa",                   listarEmpresa);
router.patch("/:id/confirmar",           confirmarCoordinadora);
router.patch("/:id/confirmar-asistencia", confirmarAsistencia);
router.patch("/:id/rechazar",            rechazar);

module.exports = router;
