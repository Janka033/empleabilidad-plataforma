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

const makeToken = (id = "empresa-1", rol = "empresa") =>
    jwt.sign({ id, email: "empresa@test.com", rol }, process.env.JWT_SECRET);

const VACANTE_MOCK = {
    id: "vac-1",
    empresa_id: "empresa-1",
    titulo: "Dev Junior",
    empresa: "TechCorp",
    descripcion: "Desc",
    modalidad: "Remoto",
    tipo: "Práctica",
    ciudad: "Armenia",
    area: "Tecnología",
    activa: true,
};

describe("GET /vacantes", () => {
    it("devuelve 401 sin token", async () => {
        const res = await request(app).get("/vacantes");
        expect(res.status).toBe(401);
    });

    it("devuelve lista con total", async () => {
        pool.query
            .mockResolvedValueOnce({ rows: [VACANTE_MOCK] })   // datos
            .mockResolvedValueOnce({ rows: [{ count: "1" }] }); // count
        const res = await request(app)
            .get("/vacantes")
            .set("Authorization", `Bearer ${makeToken()}`);
        expect(res.status).toBe(200);
        expect(res.body).toHaveProperty("vacantes");
        expect(res.body).toHaveProperty("total");
    });
});

describe("POST /vacantes", () => {
    it("devuelve 403 si el rol es estudiante", async () => {
        const res = await request(app)
            .post("/vacantes")
            .set("Authorization", `Bearer ${makeToken("user-1", "estudiante")}`)
            .send(VACANTE_MOCK);
        expect(res.status).toBe(403);
    });

    it("devuelve 400 si faltan campos obligatorios", async () => {
        const res = await request(app)
            .post("/vacantes")
            .set("Authorization", `Bearer ${makeToken()}`)
            .send({ titulo: "Solo título" });
        expect(res.status).toBe(400);
    });

    it("crea vacante correctamente", async () => {
        pool.query.mockResolvedValueOnce({ rows: [VACANTE_MOCK] });
        const res = await request(app)
            .post("/vacantes")
            .set("Authorization", `Bearer ${makeToken()}`)
            .send({
                titulo: "Dev Junior",
                empresa: "TechCorp",
                descripcion: "Desc",
                modalidad: "Remoto",
                tipo: "Práctica",
                ciudad: "Armenia",
                area: "Tecnología",
            });
        expect(res.status).toBe(201);
        expect(res.body.titulo).toBe("Dev Junior");
    });
});
