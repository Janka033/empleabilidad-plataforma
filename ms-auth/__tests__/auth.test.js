// ===== NUEVAS PRUEBAS PARA AUTH.MIDDLEWARE.JS =====
describe("Auth Middleware (verifyToken)", () => {
    let verifyToken;
    beforeEach(() => {
        jest.resetModules();
        jest.clearAllMocks();
        // Re-importar el middleware después de resetear módulos
        verifyToken = require("../src/middlewares/auth.middleware").verifyToken;
    });

    it("devuelve 401 si no hay token", () => {
        const req = { headers: {} };
        const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
        const next = jest.fn();
        verifyToken(req, res, next);
        expect(res.status).toHaveBeenCalledWith(401);
        expect(res.json).toHaveBeenCalledWith({ message: "Token requerido" });
        expect(next).not.toHaveBeenCalled();
    });

    it("devuelve 401 si el header no empieza con 'Bearer '", () => {
        const req = { headers: { authorization: "Basic token" } };
        const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
        const next = jest.fn();
        verifyToken(req, res, next);
        expect(res.status).toHaveBeenCalledWith(401);
    });

    it("devuelve 401 si el token es inválido", () => {
        const req = { headers: { authorization: "Bearer token_invalido" } };
        const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
        const next = jest.fn();
        verifyToken(req, res, next);
        expect(res.status).toHaveBeenCalledWith(401);
        expect(res.json).toHaveBeenCalledWith({ message: "Token inválido o expirado" });
    });

    it("llama a next() y asigna req.user si el token es válido", () => {
        const jwt = require("jsonwebtoken");
        const token = jwt.sign({ id: "123", rol: "empresa" }, process.env.JWT_SECRET);
        const req = { headers: { authorization: `Bearer ${token}` } };
        const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
        const next = jest.fn();
        verifyToken(req, res, next);
        expect(next).toHaveBeenCalled();
        expect(req.user).toBeDefined();
        expect(req.user.id).toBe("123");
    });
});