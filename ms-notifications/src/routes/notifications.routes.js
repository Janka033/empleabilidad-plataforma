const { Router } = require("express");
const { enviar } = require("../controllers/notifications.controller");
const { verifyToken } = require("../middlewares/auth.middleware");

const router = Router();

router.use(verifyToken);

router.post("/email", enviar);

module.exports = router;
