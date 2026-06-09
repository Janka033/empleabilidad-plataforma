const PerfilModel = require("../models/perfil.model");

const asyncHandler = (fn) => (req, res, next) =>
    Promise.resolve(fn(req, res, next)).catch(next);

/**
 * @swagger
 * /perfiles/me:
 *   get:
 *     summary: Obtener perfil del usuario autenticado
 *     tags: [Perfiles]
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: Perfil del usuario }
 *       404: { description: Perfil no encontrado }
 */
const getMe = asyncHandler(async (req, res) => {
    const perfil = await PerfilModel.findByUserId(req.user.id);
    if (!perfil) return res.status(404).json({ message: "Perfil no encontrado" });
    return res.json(perfil);
});

/**
 * @swagger
 * /perfiles/{id}:
 *   get:
 *     summary: Obtener perfil por ID
 *     tags: [Perfiles]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200: { description: Perfil encontrado }
 *       404: { description: No encontrado }
 */
const getById = asyncHandler(async (req, res) => {
    const { id } = req.params;
    // "me" es alias para el usuario autenticado
    const perfil =
        id === "me"
            ? await PerfilModel.findByUserId(req.user.id)
            : await PerfilModel.findById(id);

    if (!perfil) return res.status(404).json({ message: "Perfil no encontrado" });
    return res.json(perfil);
});

/**
 * @swagger
 * /perfiles/{id}:
 *   put:
 *     summary: Actualizar perfil
 *     tags: [Perfiles]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               nombre:      { type: string }
 *               bio:         { type: string }
 *               universidad: { type: string }
 *               programa:    { type: string }
 *               semestre:    { type: number }
 *               habilidades: { type: array, items: { type: string } }
 *     responses:
 *       200: { description: Perfil actualizado }
 *       403: { description: No autorizado }
 *       404: { description: No encontrado }
 */
const update = asyncHandler(async (req, res) => {
    const { id } = req.params;

    // Solo el dueño puede editar su perfil
    const existente =
        id === "me"
            ? await PerfilModel.findByUserId(req.user.id)
            : await PerfilModel.findById(id);

    if (!existente) return res.status(404).json({ message: "Perfil no encontrado" });

    if (existente.user_id !== req.user.id) {
        return res.status(403).json({ message: "No autorizado" });
    }

    // Extraer solo campos de lista blanca
    const { nombre, bio, universidad, programa, semestre, habilidades } = req.body;
    const updated = await PerfilModel.update(existente.id, {
        nombre, bio, universidad, programa, semestre, habilidades,
    });

    return res.json(updated);
});

module.exports = { getMe, getById, update };
