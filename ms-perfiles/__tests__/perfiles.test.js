const request = require("supertest");

jest.mock("pg", () => {
    const mockPool = { query: jest.fn() };
    return { Pool: jest.fn(() => mockPool) };
});

const { Pool } = require("pg");
const pool = new Pool();
const jwt = require("jsonwebtoken");

process.env.JWT_SECRET = "test_secret_at_least_32_chars_long!!";
process.env.DB_HOST = "localhost";
process.env.DB_NAME = "test";
process.env.DB_USER = "test";
process.env.DB_PASSWORD = "test";

const app = require("../src/app");

const makeToken = (id = "user-1") =>
    jwt.sign({ id, email: "test@test.com", rol: "estudiante" }, process.env.JWT_SECRET);

const PERFIL_MOCK = {
    id: "perfil-1",
    user_id: "user-1",
    nombre: "Juan",
    email: "juan@test.com",
    bio: "Dev",
    universidad: "CUE",
    programa: "Ingeniería de Software",
    semestre: 6,
    habilidades: ["React", "Node.js", "SQL"],
    completitud: 80,
};

describe("GET /perfiles/me", () => {
    it("devuelve 401 sin token", async () => {
        const res = await request(app).get("/perfiles/me");
        expect(res.status).toBe(401);
    });

    it("devuelve 404 si no existe perfil", async () => {
        pool.query.mockResolvedValueOnce({ rows: [] });
        const res = await request(app)
            .get("/perfiles/me")
            .set("Authorization", `Bearer ${makeToken()}`);
        expect(res.status).toBe(404);
    });

    it("devuelve el perfil correctamente", async () => {
        pool.query.mockResolvedValueOnce({ rows: [PERFIL_MOCK] });
        const res = await request(app)
            .get("/perfiles/me")
            .set("Authorization", `Bearer ${makeToken()}`);
        expect(res.status).toBe(200);
        expect(res.body.nombre).toBe("Juan");
    });
});

describe("PUT /perfiles/:id", () => {
    it("devuelve 403 si intenta editar perfil ajeno", async () => {
        pool.query.mockResolvedValueOnce({ rows: [{ ...PERFIL_MOCK, user_id: "otro-user" }] });
        const res = await request(app)
            .put("/perfiles/perfil-1")
            .set("Authorization", `Bearer ${makeToken("user-1")}`)
            .send({ bio: "Nueva bio" });
        expect(res.status).toBe(403);
    });

    it("actualiza correctamente el perfil propio", async () => {
        const updated = { ...PERFIL_MOCK, bio: "Nueva bio", completitud: 85 };
        pool.query
            .mockResolvedValueOnce({ rows: [PERFIL_MOCK] }) // findById
            .mockResolvedValueOnce({ rows: [updated] }); // update
        const res = await request(app)
            .put("/perfiles/perfil-1")
            .set("Authorization", `Bearer ${makeToken("user-1")}`)
            .send({ bio: "Nueva bio" });
        expect(res.status).toBe(200);
        expect(res.body.bio).toBe("Nueva bio");
    });
});
