const PerfilModel      = require("../models/perfil.model");
const PostulacionModel = require("../models/postulacion.model");

const asyncHandler = (fn) => (req, res, next) =>
    Promise.resolve(fn(req, res, next)).catch(next);

const ESTADOS_VALIDOS = ["enviada", "vista", "entrevista", "rechazada", "aceptada"];

// GET /postulaciones/me — estudiante ve sus postulaciones
const getMyPostulaciones = asyncHandler(async (req, res) => {
    const perfil = await PerfilModel.findByUserId(req.user.id);
    if (!perfil) return res.status(404).json({ message: "Perfil no encontrado" });

    const postulaciones = await PostulacionModel.findByPerfilId(perfil.id);
    return res.json(postulaciones);
});

// POST /postulaciones — estudiante crea postulación
const createPostulacion = asyncHandler(async (req, res) => {
    const { vacanteId, cartaMotivacion, expectativaSalarial, disponibilidad } = req.body;

    if (!vacanteId || !cartaMotivacion || !expectativaSalarial || !disponibilidad) {
        return res.status(400).json({ message: "Faltan campos obligatorios" });
    }

    const perfil = await PerfilModel.findByUserId(req.user.id);
    if (!perfil) return res.status(404).json({ message: "Perfil no encontrado" });

    const postulacion = await PostulacionModel.create({
        perfilId: perfil.id,
        vacanteId,
        cartaMotivacion,
        expectativaSalarial,
        disponibilidad,
    });

    return res.status(201).json(postulacion);
});

// GET /postulaciones/vacante/:vacanteId — empresa ve postulados a su vacante
const getPostuladosByVacante = asyncHandler(async (req, res) => {
    const { vacanteId } = req.params;
    if (!vacanteId) return res.status(400).json({ message: "vacanteId requerido" });

    const postulaciones = await PostulacionModel.findByVacanteId(vacanteId);
    return res.json(postulaciones);
});

/**
 * @swagger
 * /postulaciones/{id}/estado:
 *   patch:
 *     summary: Actualizar estado de una postulación (solo empresas)
 *     tags: [Postulaciones]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - { in: path, name: id, required: true, schema: { type: string } }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [estado]
 *             properties:
 *               estado:
 *                 type: string
 *                 enum: [enviada, vista, entrevista, rechazada, aceptada]
 *     responses:
 *       200: { description: Estado actualizado }
 *       400: { description: Estado inválido }
 *       403: { description: Solo empresas }
 *       404: { description: Postulación no encontrada }
 */
const updateEstado = asyncHandler(async (req, res) => {
    // Solo empresas pueden cambiar el estado
    if (req.user.rol !== "empresa") {
        return res.status(403).json({ message: "Solo las empresas pueden cambiar el estado" });
    }

    const { id } = req.params;
    const { estado } = req.body;

    if (!estado || !ESTADOS_VALIDOS.includes(estado)) {
        return res.status(400).json({
            message: `Estado inválido. Debe ser uno de: ${ESTADOS_VALIDOS.join(", ")}`,
        });
    }

    const postulacion = await PostulacionModel.updateEstado(id, estado);
    if (!postulacion) return res.status(404).json({ message: "Postulación no encontrada" });

    return res.json(postulacion);
});

module.exports = { getMyPostulaciones, createPostulacion, getPostuladosByVacante, updateEstado };
