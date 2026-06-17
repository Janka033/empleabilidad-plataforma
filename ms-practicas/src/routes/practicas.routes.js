const { Router } = require("express");
const {
    crearConvenio,
    misConveniosEmpresa,
    misConveniosEstudiante,
    todosLosConvenios,
    getConvenio,
    crearEvaluacion,
    cancelarConvenio,
} = require("../controllers/practicas.controller");
const { verifyToken } = require("../middlewares/auth.middleware");

const router = Router();

router.use(verifyToken);

router.post("/",                    crearConvenio);
router.get("/empresa",              misConveniosEmpresa);
router.get("/me",                   misConveniosEstudiante);
router.get("/todos",                todosLosConvenios);
router.get("/:id",                  getConvenio);
router.post("/:id/evaluaciones",    crearEvaluacion);
router.patch("/:id/cancelar",       cancelarConvenio);

module.exports = router;
