const jwt = require("jsonwebtoken");

const verifyToken = (req, res, next) => {
    const authHeader = req.headers["authorization"];
    if (!authHeader?.startsWith("Bearer ")) {
        return res.status(401).json({ message: "Token requerido" });
    }
    try {
        req.user = jwt.verify(authHeader.split(" ")[1], process.env.JWT_SECRET);
        next();
    } catch {
        return res.status(401).json({ message: "Token inválido o expirado" });
    }
};

const requireEmpresa = (req, res, next) => {
    if (req.user?.rol !== "empresa") {
        return res.status(403).json({ message: "Solo las empresas pueden realizar esta acción" });
    }
    next();
};

module.exports = { verifyToken, requireEmpresa };
