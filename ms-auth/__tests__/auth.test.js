const request = require("supertest");

// Mock pg pool before requiring app
jest.mock("pg", () => {
    const mockPool = {
        query: jest.fn(),
    };
    return { Pool: jest.fn(() => mockPool) };
});

const { Pool } = require("pg");
const pool = new Pool();

// Set required env vars before loading app
process.env.JWT_SECRET = "test_secret_at_least_32_chars_long!!";
process.env.DB_HOST = "localhost";
process.env.DB_NAME = "test";
process.env.DB_USER = "test";
process.env.DB_PASSWORD = "test";

const app = require("../src/app");

describe("POST /auth/register", () => {
    beforeEach(() => jest.clearAllMocks());

    it("devuelve 400 si faltan campos", async () => {
        const res = await request(app)
            .post("/auth/register")
            .send({ email: "test@test.com" });
        expect(res.status).toBe(400);
    });

    it("devuelve 400 si la contraseña tiene menos de 8 caracteres", async () => {
        const res = await request(app).post("/auth/register").send({
            nombre: "Juan",
            email: "juan@test.com",
            password: "1234",
            rol: "estudiante",
        });
        expect(res.status).toBe(400);
    });

    it("devuelve 400 si el rol es inválido", async () => {
        const res = await request(app).post("/auth/register").send({
            nombre: "Juan",
            email: "juan@test.com",
            password: "12345678",
            rol: "superadmin",
        });
        expect(res.status).toBe(400);
    });

    it("devuelve 409 si el email ya existe", async () => {
        pool.query.mockResolvedValueOnce({ rows: [{ 1: 1 }] }); // emailExists → true
        const res = await request(app).post("/auth/register").send({
            nombre: "Juan",
            email: "juan@test.com",
            password: "12345678",
            rol: "estudiante",
        });
        expect(res.status).toBe(409);
    });

    it("devuelve 201 con token al registrar correctamente", async () => {
        pool.query
            .mockResolvedValueOnce({ rows: [] }) // emailExists → false
            .mockResolvedValueOnce({
                rows: [{ id: "uuid-1", nombre: "Juan", email: "juan@test.com", rol: "estudiante" }],
            }); // create user

        const res = await request(app).post("/auth/register").send({
            nombre: "Juan",
            email: "juan@test.com",
            password: "12345678",
            rol: "estudiante",
        });

        expect(res.status).toBe(201);
        expect(res.body).toHaveProperty("token");
        expect(res.body.role).toBe("estudiante");
    });
});

describe("POST /auth/login", () => {
    beforeEach(() => jest.clearAllMocks());

    it("devuelve 400 si faltan campos", async () => {
        const res = await request(app).post("/auth/login").send({});
        expect(res.status).toBe(400);
    });

    it("devuelve 401 si el usuario no existe", async () => {
        pool.query.mockResolvedValueOnce({ rows: [] }); // findByEmail → null
        const res = await request(app)
            .post("/auth/login")
            .send({ email: "noexiste@test.com", password: "12345678" });
        expect(res.status).toBe(401);
    });

    it("devuelve 401 si la contraseña es incorrecta", async () => {
        const bcrypt = require("bcryptjs");
        const hash = await bcrypt.hash("otrapassword", 12);
        pool.query.mockResolvedValueOnce({
            rows: [{ id: "uuid-1", nombre: "Juan", email: "juan@test.com", password_hash: hash, rol: "estudiante", activo: true }],
        });

        const res = await request(app)
            .post("/auth/login")
            .send({ email: "juan@test.com", password: "wrongpassword" });
        expect(res.status).toBe(401);
    });

    it("devuelve 200 con token si las credenciales son correctas", async () => {
        const bcrypt = require("bcryptjs");
        const hash = await bcrypt.hash("12345678", 12);
        pool.query.mockResolvedValueOnce({
            rows: [{ id: "uuid-1", nombre: "Juan", email: "juan@test.com", password_hash: hash, rol: "estudiante", activo: true }],
        });

        const res = await request(app)
            .post("/auth/login")
            .send({ email: "juan@test.com", password: "12345678" });
        expect(res.status).toBe(200);
        expect(res.body).toHaveProperty("token");
    });
});
