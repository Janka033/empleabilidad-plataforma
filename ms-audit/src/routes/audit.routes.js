const { Router } = require("express");
const { registrar, listar } = require("../controllers/audit.controller");
const { verifyToken } = require("../middlewares/auth.middleware");

const router = Router();

router.use(verifyToken);

router.post("/", registrar);
router.get("/", listar);

module.exports = router;
