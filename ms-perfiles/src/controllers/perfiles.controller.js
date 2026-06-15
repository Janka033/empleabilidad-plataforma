const PerfilModel = require("../models/perfil.model");

const { Pool } = require("pg");
const pool = new Pool({
    host: process.env.DB_HOST,
    port: process.env.DB_PORT || 5432,
    database: process.env.DB_NAME,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
});

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

// PUT /perfiles/me — actualizar perfil del usuario autenticado
const updateMe = asyncHandler(async (req, res) => {
    let perfil = await PerfilModel.findByUserId(req.user.id);
    if (!perfil) return res.status(404).json({ message: "Perfil no encontrado" });

    const { nombre, bio, universidad, programa, semestre, habilidades } = req.body;
    const updated = await PerfilModel.update(perfil.id, {
        nombre, bio, universidad, programa, semestre, habilidades,
    });
    return res.json(updated);
});

// POST /perfiles — crear perfil (llamado desde ms-auth al registrar usuario)
const create = asyncHandler(async (req, res) => {
    const { userId, nombre, email } = req.body;
    const uid = userId || req.user.id;

    // Si ya existe, devolver el existente
    const existente = await PerfilModel.findByUserId(uid);
    if (existente) return res.json(existente);

    const perfil = await PerfilModel.create({ userId: uid, nombre: nombre || req.user.email, email: email || req.user.email });
    return res.status(201).json(perfil);
});
const liberarEstudiante = asyncHandler(async (req, res) => {
    if (req.user.rol !== "empresa") {
        return res.status(403).json({ message: "Solo empresas pueden liberar" });
    }
    const { id } = req.params; // id del perfil del estudiante
    const perfil = await PerfilModel.findById(id);
    if (!perfil) return res.status(404).json({ message: "Perfil no encontrado" });

    // Verificar que la empresa tiene derecho (empresa_contratante coincide con la empresa autenticada)
    // Nota: req.user.nombre no está en el token JWT por defecto. Debes incluir el nombre de la empresa en el token al hacer login.
    // Mientras tanto, puedes pasar el nombre de la empresa desde el frontend (menos seguro) o buscar la vacante asociada.
    // Opción simple: que el frontend envíe el nombre de la empresa en el body.
    const { empresaNombre } = req.body;
    if (perfil.empresa_contratante !== empresaNombre) {
        return res.status(403).json({ message: "No autorizado para liberar este estudiante" });
    }

    await pool.query(
        `UPDATE perfiles SET contratado = FALSE, empresa_contratante = NULL WHERE id = $1`,
        [id]
    );
    return res.json({ message: "Estudiante liberado, puede postularse nuevamente" });
});
module.exports = { getMe, getById, update, updateMe, create, liberarEstudiante };
