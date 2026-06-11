const PerfilModel = require("../models/perfil.model");
const PostulacionModel = require("../models/postulacion.model");

const asyncHandler = (fn) => (req, res, next) =>
    Promise.resolve(fn(req, res, next)).catch(next);

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

// GET /postulaciones/vacante/:vacanteId — empresa ve todos los postulados a una vacante
// Devuelve los datos del perfil del estudiante junto con la postulación
const getPostuladosByVacante = asyncHandler(async (req, res) => {
    const { vacanteId } = req.params;
    if (!vacanteId) return res.status(400).json({ message: "vacanteId requerido" });

    const postulaciones = await PostulacionModel.findByVacanteId(vacanteId);
    return res.json(postulaciones);
});

module.exports = { getMyPostulaciones, createPostulacion, getPostuladosByVacante };