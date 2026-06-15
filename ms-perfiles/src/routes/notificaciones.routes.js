const { Router } = require("express");
const { getMias, marcarLeida, marcarTodasLeidas } = require("../controllers/notificaciones.controller");
const { verifyToken } = require("../middlewares/auth.middleware");

const router = Router();

router.use(verifyToken);

router.get("/",                   getMias);
router.patch("/:id/leer",         marcarLeida);
router.patch("/leer-todas",       marcarTodasLeidas);

module.exports = router;