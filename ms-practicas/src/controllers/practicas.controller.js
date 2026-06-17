const PracticaModel = require("../models/practica.model");

const PERFILES_URL = process.env.PERFILES_SERVICE_URL || "http://ms-perfiles:3002";
const AUDIT_URL = process.env.AUDIT_SERVICE_URL || "http://ms-audit:3007";

const asyncHandler = (fn) => (req, res, next) =>
    Promise.resolve(fn(req, res, next)).catch(next);

// Registra un evento de auditoría (best-effort) — RF19
function auditar(authHeader, evento) {
    fetch(`${AUDIT_URL}/audit`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: authHeader },
        body: JSON.stringify(evento),
    }).catch(() => {});
}

// Notifica a un usuario reenviando el JWT al microservicio de perfiles (best-effort)
async function notificar(authHeader, { userId, tipo, titulo, mensaje, meta }) {
    try {
        await fetch(`${PERFILES_URL}/notificaciones`, {
            method: "POST",
            headers: { "Content-Type": "application/json", Authorization: authHeader },
            body: JSON.stringify({ userId, tipo, titulo, mensaje, meta }),
        });
    } catch (_) { /* la notificación no es crítica */ }
}

// POST /convenios — la coordinadora académica formaliza el convenio (RF12, HU14, CU06).
// También se permite a la empresa por compatibilidad.
const crearConvenio = asyncHandler(async (req, res) => {
    if (req.user.rol !== "admin" && req.user.rol !== "empresa") {
        return res.status(403).json({ message: "No autorizado para crear convenios" });
    }

    const {
        estudianteUserId, estudiantePerfilId, estudianteNombre,
        vacanteId, vacanteTitulo, tutorEmpresarial, tutorAcademico,
        modalidad, funciones, fechaInicio, fechaFin, empresaNombre, empresaId, postulacionId,
    } = req.body;

    if (!estudianteUserId || !estudianteNombre || !tutorEmpresarial || !tutorAcademico || !fechaInicio || !fechaFin) {
        return res.status(400).json({
            message: "Faltan campos obligatorios (estudiante, tutores y fechas)",
        });
    }

    if (vacanteId && await PracticaModel.existsForEstudianteVacante(estudianteUserId, vacanteId)) {
        return res.status(409).json({ message: "Ya existe un convenio para este estudiante en esta vacante" });
    }

    const convenio = await PracticaModel.createConvenio({
        estudianteUserId,
        estudiantePerfilId,
        estudianteNombre,
        // Si la crea la coordinadora, la empresa viene en el body; si la crea la empresa, es ella misma
        empresaId: empresaId || req.user.id,
        empresaNombre: empresaNombre || "la empresa",
        vacanteId,
        vacanteTitulo,
        tutorEmpresarial,
        tutorAcademico,
        modalidad,
        funciones,
        fechaInicio,
        fechaFin,
    });

    // Si viene de una entrevista/postulación, marcarla "aceptada" para que el
    // estudiante pueda confirmar su práctica (best-effort).
    if (postulacionId) {
        try {
            await fetch(`${PERFILES_URL}/postulaciones/${postulacionId}/estado`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json", Authorization: req.headers["authorization"] },
                body: JSON.stringify({ estado: "aceptada" }),
            });
        } catch (_) { /* best-effort */ }
    }

    await notificar(req.headers["authorization"], {
        userId: estudianteUserId,
        tipo: "convenio_creado",
        titulo: "Convenio de práctica creado",
        mensaje: `${convenio.empresa_nombre} formalizó tu convenio de práctica. Tutor empresarial: ${tutorEmpresarial}.`,
        meta: { convenioId: convenio.id },
    });

    auditar(req.headers["authorization"], {
        servicio: "practicas",
        accion: "crear_convenio",
        entidad: "convenio",
        entidadId: convenio.id,
        detalle: `Convenio de práctica creado para ${convenio.estudiante_nombre} en ${convenio.empresa_nombre}`,
    });

    return res.status(201).json(convenio);
});

// GET /convenios/empresa — convenios creados por la empresa autenticada
const misConveniosEmpresa = asyncHandler(async (req, res) => {
    if (req.user.rol !== "empresa") {
        return res.status(403).json({ message: "Solo empresas" });
    }
    const convenios = await PracticaModel.findByEmpresa(req.user.id);
    return res.json(convenios);
});

// GET /convenios/todos — todos los convenios (solo coordinadora/admin)
const todosLosConvenios = asyncHandler(async (req, res) => {
    if (req.user.rol !== "admin") {
        return res.status(403).json({ message: "Solo la coordinadora" });
    }
    const convenios = await PracticaModel.findAll();
    const conEval = await Promise.all(
        convenios.map(async (c) => ({ ...c, evaluaciones: await PracticaModel.findEvaluaciones(c.id) }))
    );
    return res.json(conEval);
});

// GET /convenios/me — convenios del estudiante autenticado
const misConveniosEstudiante = asyncHandler(async (req, res) => {
    const convenios = await PracticaModel.findByEstudiante(req.user.id);
    // Adjuntar evaluaciones a cada convenio
    const conEval = await Promise.all(
        convenios.map(async (c) => ({
            ...c,
            evaluaciones: await PracticaModel.findEvaluaciones(c.id),
        }))
    );
    return res.json(conEval);
});

// GET /convenios/:id — detalle de un convenio con sus evaluaciones
const getConvenio = asyncHandler(async (req, res) => {
    const convenio = await PracticaModel.findById(req.params.id);
    if (!convenio) return res.status(404).json({ message: "Convenio no encontrado" });

    // La coordinadora (admin), la empresa dueña o el estudiante pueden verlo
    const autorizado = req.user.rol === "admin" ||
        convenio.empresa_id === req.user.id || convenio.estudiante_user_id === req.user.id;
    if (!autorizado) return res.status(403).json({ message: "No autorizado" });

    const evaluaciones = await PracticaModel.findEvaluaciones(convenio.id);
    return res.json({ ...convenio, evaluaciones });
});

// POST /convenios/:id/evaluaciones — registrar evaluación parcial o final (RF13, HU15, HU16, CU07)
const crearEvaluacion = asyncHandler(async (req, res) => {
    if (req.user.rol !== "admin" && req.user.rol !== "empresa") {
        return res.status(403).json({ message: "No autorizado para evaluar" });
    }

    const convenio = await PracticaModel.findById(req.params.id);
    if (!convenio) return res.status(404).json({ message: "Convenio no encontrado" });
    // La coordinadora (admin) puede evaluar cualquier convenio; la empresa solo el suyo
    if (req.user.rol === "empresa" && convenio.empresa_id !== req.user.id) {
        return res.status(403).json({ message: "No autorizado para evaluar este convenio" });
    }

    const { tipo, calificacion, observaciones, evaluador } = req.body;
    const CORTES = { primer_corte: "Primer corte", segundo_corte: "Segundo corte", tercer_corte: "Tercer corte (final)" };
    if (!CORTES[tipo]) {
        return res.status(400).json({ message: "tipo debe ser primer_corte, segundo_corte o tercer_corte" });
    }
    const nota = Number(calificacion);
    if (isNaN(nota) || nota < 0 || nota > 5) {
        return res.status(400).json({ message: "La calificación debe estar entre 0 y 5" });
    }
    if (convenio.estado === "finalizado") {
        return res.status(400).json({ message: "La práctica ya está finalizada" });
    }

    // Evitar cortes duplicados
    const existentes = await PracticaModel.findEvaluaciones(convenio.id);
    if (existentes.some((e) => e.tipo === tipo)) {
        return res.status(409).json({ message: `El ${CORTES[tipo]} ya fue registrado` });
    }

    const evaluacion = await PracticaModel.createEvaluacion(convenio.id, {
        tipo,
        calificacion: nota,
        observaciones: observaciones || null,
        evaluador: evaluador || convenio.empresa_nombre,
    });

    // El tercer corte (40%) cierra la práctica y habilita el certificado
    let estadoConvenio = convenio.estado;
    if (tipo === "tercer_corte") {
        const actualizado = await PracticaModel.finalizarConvenio(convenio.id);
        estadoConvenio = actualizado.estado;
        await notificar(req.headers["authorization"], {
            userId: convenio.estudiante_user_id,
            tipo: "practica_finalizada",
            titulo: "Tercer corte registrado — práctica finalizada",
            mensaje: `Tu práctica en ${convenio.empresa_nombre} fue evaluada (${CORTES[tipo]}, nota ${nota}). Ya puedes descargar tu certificado.`,
            meta: { convenioId: convenio.id },
        });
    } else {
        await notificar(req.headers["authorization"], {
            userId: convenio.estudiante_user_id,
            tipo: "evaluacion_corte",
            titulo: `${CORTES[tipo]} registrado`,
            mensaje: `${convenio.empresa_nombre} registró tu ${CORTES[tipo]} (nota ${nota}).`,
            meta: { convenioId: convenio.id },
        });
    }

    auditar(req.headers["authorization"], {
        servicio: "practicas",
        accion: "evaluacion_" + tipo,
        entidad: "convenio",
        entidadId: convenio.id,
        detalle: `${CORTES[tipo]} (nota ${nota}) de la práctica de ${convenio.estudiante_nombre}`,
    });

    return res.status(201).json({ evaluacion, estadoConvenio });
});

// PATCH /convenios/:id/cancelar — la coordinadora cierra/cancela un convenio
// (p. ej. si la práctica no se concreta). Libera al estudiante y lo notifica.
const cancelarConvenio = asyncHandler(async (req, res) => {
    if (req.user.rol !== "admin") {
        return res.status(403).json({ message: "Solo la coordinadora puede cancelar convenios" });
    }
    const convenio = await PracticaModel.findById(req.params.id);
    if (!convenio) return res.status(404).json({ message: "Convenio no encontrado" });

    const actualizado = await PracticaModel.cancelarConvenio(convenio.id);

    await notificar(req.headers["authorization"], {
        userId: convenio.estudiante_user_id,
        tipo: "convenio_cancelado",
        titulo: "Convenio de práctica cerrado",
        mensaje: `Tu convenio de práctica con ${convenio.empresa_nombre} fue cerrado por la coordinación. Puedes volver a postularte.`,
        meta: { convenioId: convenio.id },
    });

    auditar(req.headers["authorization"], {
        servicio: "practicas", accion: "cancelar_convenio", entidad: "convenio", entidadId: convenio.id,
        detalle: `Convenio de ${convenio.estudiante_nombre} cancelado`,
    });

    return res.json(actualizado);
});

module.exports = {
    crearConvenio,
    misConveniosEmpresa,
    misConveniosEstudiante,
    todosLosConvenios,
    getConvenio,
    crearEvaluacion,
    cancelarConvenio,
};
