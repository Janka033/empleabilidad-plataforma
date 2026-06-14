const { Router } = require("express");
const {
    getMyPostulaciones,
    createPostulacion,
    getPostuladosByVacante,
    updateEstado,
} = require("../controllers/postulaciones.controller");
const { verifyToken } = require("../middlewares/auth.middleware");

const router = Router();

router.use(verifyToken);

router.get("/me",                      getMyPostulaciones);     // estudiante: mis postulaciones
router.post("/",                       createPostulacion);      // estudiante: postularse
router.get("/vacante/:vacanteId",      getPostuladosByVacante); // empresa: postulados a su vacante
router.patch("/:id/estado",            updateEstado);           // empresa: cambiar estado

module.exports = router;
