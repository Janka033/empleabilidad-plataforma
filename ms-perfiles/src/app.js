const { Router } = require("express");
const { getMe, getById, update, updateMe, create } = require("../controllers/perfiles.controller");
const { verifyToken } = require("../middlewares/auth.middleware");

const router = Router();

router.use(verifyToken);

router.post("/", create);          // POST /perfiles — crear perfil
router.get("/me", getMe);          // GET  /perfiles/me
router.put("/me", updateMe);       // PUT  /perfiles/me
router.get("/:id", getById);       // GET  /perfiles/:id
router.put("/:id", update);        // PUT  /perfiles/:id

module.exports = router;