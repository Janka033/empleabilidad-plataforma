const { Router } = require("express");
const { register, login, me } = require("../controllers/auth.controller");
const { verifyToken } = require("../middlewares/auth.middleware");

const router = Router();

router.post("/register", register);
router.post("/login", login);
router.get("/me", verifyToken, me);

module.exports = router;
