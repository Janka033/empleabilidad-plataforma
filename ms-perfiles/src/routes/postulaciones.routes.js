const { Router } = require("express");
const {
    getMyPostulaciones,
    createPostulacion,
    getPostuladosByVacante,
    updateEstado,
    confirmarAceptacion,   // << importar
    marcarFavorita,
} = require("../controllers/postulaciones.controller");
const { verifyToken } = require("../middlewares/auth.middleware");

const router = Router();

router.use(verifyToken);

router.get("/me",                      getMyPostulaciones);
router.post("/",                       createPostulacion);
router.get("/vacante/:vacanteId",      getPostuladosByVacante);
router.patch("/:id/estado",            updateEstado);
router.post("/:id/confirmar",          confirmarAceptacion);   // << nueva ruta
router.patch("/:id/favorita",          marcarFavorita);

module.exports = router;