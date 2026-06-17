const EntrevistaModel = require("../models/entrevista.model");
const { notificarUsuario } = require("../services/notificador.service");
const { Pool } = require("pg");

const pool = new Pool({
    host: process.env.DB_HOST,
    port: process.env.DB_PORT || 5432,
    database: process.env.DB_NAME,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
});

const AUTH_URL = process.env.AUTH_SERVICE_URL || "http://ms-auth:3001";
const VACANTES_URL = process.env.VACANTES_SERVICE_URL || "http://ms-vacantes:3003";

const asyncHandler = (fn) => (req, res, next) =>
    Promise.resolve(fn(req, res, next)).catch(next);

async function coordinadorId(authHeader) {
    try {
        const r = await fetch(`${AUTH_URL}/auth/coordinador`, { headers: { Authorization: authHeader } });
        if (r.ok) return (await r.json()).id;
    } catch (_) { /* ignore */ }
    return null;
}

function detalleEntrevista(e) {
    const cuando = `${e.fecha ? new Date(e.fecha).toLocaleDateString("es-CO") : ""} ${e.hora || ""}`.trim();
    if (e.tipo === "virtual") return `Entrevista virtual el ${cuando}. Enlace: ${e.enlace || "(por confirmar)"}`;
    return `Entrevista presencial el ${cuando}${e.lugar ? ` en ${e.lugar}` : ""}`;
}

// POST /entrevistas — la empresa selecciona al candidato y agenda la entrevista
const crear = asyncHandler(async (req, res) => {
    if (req.user.rol !== "empresa") {
        return res.status(403).json({ message: "Solo las empresas pueden agendar entrevistas" });
    }

    const { postulacionId, tipo, enlace, lugar, fecha, hora } = req.body;
    if (!postulacionId || !tipo || !fecha || !hora) {
        return res.status(400).json({ message: "Faltan datos de la entrevista (tipo, fecha, hora)" });
    }
    if (tipo === "virtual" && !enlace) {
        return res.status(400).json({ message: "Una entrevista virtual requiere el enlace" });
    }

    // Datos del estudiante a partir de la postulación
    const { rows } = await pool.query(
        `SELECT po.vacante_id, pf.user_id, pf.id AS perfil_id, pf.nombre AS estudiante_nombre
         FROM postulaciones po JOIN perfiles pf ON pf.id = po.perfil_id
         WHERE po.id = $1`,
        [postulacionId]
    );
    if (!rows.length) return res.status(404).json({ message: "Postulación no encontrada" });
    const p = rows[0];

    // Datos de la vacante/empresa
    let vacanteTitulo = "", empresaNombre = "la empresa", empresaId = req.user.id;
    try {
        const vRes = await fetch(`${VACANTES_URL}/vacantes/${p.vacante_id}`, { headers: { Authorization: req.headers["authorization"] } });
        if (vRes.ok) { const v = await vRes.json(); vacanteTitulo = v.titulo; empresaNombre = v.empresa; empresaId = v.empresa_id; }
    } catch (_) { /* best-effort */ }

    const entrevista = await EntrevistaModel.create({
        postulacionId, estudianteUserId: p.user_id, estudiantePerfilId: p.perfil_id, estudianteNombre: p.estudiante_nombre,
        empresaId, empresaNombre, vacanteId: p.vacante_id, vacanteTitulo, tipo, enlace, lugar, fecha, hora,
    });

    // La postulación pasa a "entrevista" (= "Has sido seleccionado")
    await pool.query("UPDATE postulaciones SET estado = 'entrevista' WHERE id = $1", [postulacionId]);

    // Notificar a la coordinadora para que confirme la entrevista
    const coord = await coordinadorId(req.headers["authorization"]);
    if (coord) {
        await notificarUsuario({
            userId: coord, tipo: "entrevista_solicitada",
            titulo: "Nueva entrevista por confirmar",
            mensaje: `${empresaNombre} seleccionó a ${p.estudiante_nombre} para "${vacanteTitulo}". ${detalleEntrevista(entrevista)}`,
            meta: { entrevistaId: entrevista.id },
            authHeader: req.headers["authorization"],
        });
    }

    return res.status(201).json(entrevista);
});

// GET /entrevistas/coordinadora — todas (solo coordinadora/admin)
const listarCoordinadora = asyncHandler(async (req, res) => {
    if (req.user.rol !== "admin") return res.status(403).json({ message: "Solo la coordinadora" });
    return res.json(await EntrevistaModel.findAll());
});

// PATCH /entrevistas/:id/confirmar — la coordinadora confirma y notifica al estudiante
const confirmarCoordinadora = asyncHandler(async (req, res) => {
    if (req.user.rol !== "admin") return res.status(403).json({ message: "Solo la coordinadora" });

    const entrevista = await EntrevistaModel.findById(req.params.id);
    if (!entrevista) return res.status(404).json({ message: "Entrevista no encontrada" });

    const actualizada = await EntrevistaModel.setEstado(entrevista.id, "programada");

    await notificarUsuario({
        userId: entrevista.estudiante_user_id, tipo: "entrevista_programada",
        titulo: "¡Has sido seleccionado!",
        mensaje: `${entrevista.empresa_nombre} te seleccionó para "${entrevista.vacante_titulo}". ${detalleEntrevista(entrevista)}. Confirma tu asistencia.`,
        meta: { entrevistaId: entrevista.id },
        authHeader: req.headers["authorization"],
    });

    return res.json(actualizada);
});

// GET /entrevistas/me — entrevistas del estudiante autenticado
const listarEstudiante = asyncHandler(async (req, res) => {
    return res.json(await EntrevistaModel.findByEstudiante(req.user.id));
});

// PATCH /entrevistas/:id/confirmar-asistencia — el estudiante confirma su asistencia
const confirmarAsistencia = asyncHandler(async (req, res) => {
    const entrevista = await EntrevistaModel.findById(req.params.id);
    if (!entrevista) return res.status(404).json({ message: "Entrevista no encontrada" });
    if (entrevista.estudiante_user_id !== req.user.id) {
        return res.status(403).json({ message: "No autorizado" });
    }
    if (entrevista.estado !== "programada") {
        return res.status(400).json({ message: "La entrevista aún no está programada" });
    }

    const actualizada = await EntrevistaModel.setEstado(entrevista.id, "confirmada");

    // Notificar a la coordinadora que el estudiante confirmó
    const coord = await coordinadorId(req.headers["authorization"]);
    if (coord) {
        await notificarUsuario({
            userId: coord, tipo: "entrevista_confirmada",
            titulo: "Estudiante confirmó su entrevista",
            mensaje: `${entrevista.estudiante_nombre} confirmó su asistencia a la entrevista con ${entrevista.empresa_nombre}.`,
            meta: { entrevistaId: entrevista.id },
            authHeader: req.headers["authorization"],
        });
    }

    return res.json(actualizada);
});

// GET /entrevistas/empresa — entrevistas de la empresa autenticada
const listarEmpresa = asyncHandler(async (req, res) => {
    return res.json(await EntrevistaModel.findByEmpresa(req.user.id));
});

// PATCH /entrevistas/:id/rechazar — la coordinadora rechaza la selección
// (la entrevista no salió bien). Notifica al estudiante "No fuiste seleccionado".
const rechazar = asyncHandler(async (req, res) => {
    if (req.user.rol !== "admin") return res.status(403).json({ message: "Solo la coordinadora" });

    const entrevista = await EntrevistaModel.findById(req.params.id);
    if (!entrevista) return res.status(404).json({ message: "Entrevista no encontrada" });

    const actualizada = await EntrevistaModel.setEstado(entrevista.id, "rechazada");
    // La postulación vuelve a "rechazada"
    await pool.query("UPDATE postulaciones SET estado = 'rechazada' WHERE id = $1", [entrevista.postulacion_id]);

    await notificarUsuario({
        userId: entrevista.estudiante_user_id, tipo: "no_seleccionado",
        titulo: "No fuiste seleccionado",
        mensaje: `No fuiste seleccionado para la práctica de "${entrevista.vacante_titulo}" en ${entrevista.empresa_nombre}. Puedes seguir postulándote a más prácticas, o esperar a que te acepten si ya te postulaste a otras.`,
        meta: { entrevistaId: entrevista.id },
        authHeader: req.headers["authorization"],
    });

    return res.json(actualizada);
});

module.exports = {
    crear,
    listarCoordinadora,
    confirmarCoordinadora,
    listarEstudiante,
    confirmarAsistencia,
    listarEmpresa,
    rechazar,
};
