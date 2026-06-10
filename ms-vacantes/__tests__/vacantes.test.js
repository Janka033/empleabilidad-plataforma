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
const VacanteModel = require("../src/models/vacante.model");

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

// ==================== PRUEBAS DIRECTAS DEL MODELO ====================
describe("VacanteModel - create con campos permitidos", () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it("debería insertar solo los campos de CREATABLE_FIELDS", async () => {
        const dataConExtra = {
            empresa_id: "emp-1",
            titulo: "Dev",
            empresa: "Tech",
            descripcion: "Desc",
            campo_extra: "no debería insertarse",
        };
        pool.query.mockResolvedValueOnce({ rows: [{ id: "new-id", ...dataConExtra }] });
        const result = await VacanteModel.create(dataConExtra);
        expect(pool.query).toHaveBeenCalledWith(
            expect.stringContaining("INSERT INTO vacantes"),
            expect.arrayContaining(["emp-1", "Dev", "Tech", "Desc"])
        );
        expect(result).toBeDefined();
    });
});

describe("VacanteModel - update con campos permitidos", () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it("no debería hacer nada si no hay campos actualizables", async () => {
        const result = await VacanteModel.update("vac-1", { campo_no_permitido: "valor" });
        expect(result).toBeNull();
        expect(pool.query).not.toHaveBeenCalled();
    });

    it("debería actualizar solo campos permitidos", async () => {
        const dataValida = { titulo: "Nuevo título", activa: false };
        pool.query.mockResolvedValueOnce({ rows: [{ id: "vac-1", ...dataValida }] });
        const result = await VacanteModel.update("vac-1", dataValida);
        expect(pool.query).toHaveBeenCalled();
        expect(result.titulo).toBe("Nuevo título");
    });
});

// ==================== PRUEBAS DE ENDPOINTS ====================
describe("GET /vacantes", () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it("devuelve 401 sin token", async () => {
        const res = await request(app).get("/vacantes");
        expect(res.status).toBe(401);
    });

    it("devuelve lista con total", async () => {
        pool.query
            .mockResolvedValueOnce({ rows: [VACANTE_MOCK] })
            .mockResolvedValueOnce({ rows: [{ count: "1" }] });
        const res = await request(app)
            .get("/vacantes")
            .set("Authorization", `Bearer ${makeToken()}`);
        expect(res.status).toBe(200);
        expect(res.body).toHaveProperty("vacantes");
        expect(res.body).toHaveProperty("total");
    });
});

describe("POST /vacantes", () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

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

describe("GET /vacantes/:id", () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it("devuelve 404 si la vacante no existe", async () => {
        pool.query.mockResolvedValueOnce({ rows: [] });
        const res = await request(app)
            .get("/vacantes/vac-999")
            .set("Authorization", `Bearer ${makeToken()}`);
        expect(res.status).toBe(404);
        expect(res.body.message).toBe("Vacante no encontrada");
    });

    it("devuelve la vacante si existe", async () => {
        pool.query.mockResolvedValueOnce({ rows: [VACANTE_MOCK] });
        const res = await request(app)
            .get("/vacantes/vac-1")
            .set("Authorization", `Bearer ${makeToken()}`);
        expect(res.status).toBe(200);
        expect(res.body.titulo).toBe("Dev Junior");
    });
});

describe("PUT /vacantes/:id", () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it("devuelve 404 si la vacante no existe", async () => {
        pool.query.mockResolvedValueOnce({ rows: [] });
        const res = await request(app)
            .put("/vacantes/vac-999")
            .set("Authorization", `Bearer ${makeToken()}`)
            .send({ titulo: "Nuevo título" });
        expect(res.status).toBe(404);
    });

    it("devuelve 403 si el usuario no es el dueño", async () => {
        const vacanteAjena = { ...VACANTE_MOCK, empresa_id: "otra-empresa" };
        pool.query.mockResolvedValueOnce({ rows: [vacanteAjena] });
        const res = await request(app)
            .put("/vacantes/vac-1")
            .set("Authorization", `Bearer ${makeToken("empresa-1", "empresa")}`)
            .send({ titulo: "Nuevo título" });
        expect(res.status).toBe(403);
        expect(res.body.message).toBe("No autorizado para editar esta vacante");
    });

    it("actualiza correctamente la vacante", async () => {
        const vacanteActualizada = { ...VACANTE_MOCK, titulo: "Título actualizado" };
        pool.query
            .mockResolvedValueOnce({ rows: [VACANTE_MOCK] })
            .mockResolvedValueOnce({ rows: [vacanteActualizada] });
        const res = await request(app)
            .put("/vacantes/vac-1")
            .set("Authorization", `Bearer ${makeToken()}`)
            .send({ titulo: "Título actualizado" });
        expect(res.status).toBe(200);
        expect(res.body.titulo).toBe("Título actualizado");
    });
});

describe("POST /vacantes - validaciones extra", () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it("devuelve 400 si modalidad inválida", async () => {
        const res = await request(app)
            .post("/vacantes")
            .set("Authorization", `Bearer ${makeToken()}`)
            .send({
                titulo: "Dev",
                empresa: "Tech",
                descripcion: "Desc",
                modalidad: "Inválida",
                tipo: "Práctica",
                ciudad: "Armenia",
                area: "Tecnología",
            });
        expect(res.status).toBe(400);
        expect(res.body.message).toBe("Modalidad inválida");
    });

    it("devuelve 400 si tipo inválido", async () => {
        const res = await request(app)
            .post("/vacantes")
            .set("Authorization", `Bearer ${makeToken()}`)
            .send({
                titulo: "Dev",
                empresa: "Tech",
                descripcion: "Desc",
                modalidad: "Remoto",
                tipo: "Inválido",
                ciudad: "Armenia",
                area: "Tecnología",
            });
        expect(res.status).toBe(400);
        expect(res.body.message).toBe("Tipo inválido");
    });
});