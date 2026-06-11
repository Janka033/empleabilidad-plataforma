const VacanteModel = require("../models/vacante.model");

const asyncHandler = (fn) => (req, res, next) =>
    Promise.resolve(fn(req, res, next)).catch(next);

/**
 * @swagger
 * /vacantes:
 *   get:
 *     summary: Listar vacantes activas con filtros opcionales
 *     tags: [Vacantes]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: query
 *         name: modalidad
 *         schema: { type: string, enum: [Presencial, Remoto, Híbrido] }
 *       - in: query
 *         name: tipo
 *         schema: { type: string, enum: [Práctica, "Tiempo completo", "Medio tiempo"] }
 *       - in: query
 *         name: area
 *         schema: { type: string }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 50 }
 *       - in: query
 *         name: offset
 *         schema: { type: integer, default: 0 }
 *     responses:
 *       200:
 *         description: Lista de vacantes
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 vacantes: { type: array }
 *                 total: { type: integer }
 */
const list = asyncHandler(async (req, res) => {
    const { modalidad, tipo, area, limit, offset } = req.query;
    const result = await VacanteModel.findAll({
        modalidad,
        tipo,
        area,
        limit: limit ? parseInt(limit) : 50,
        offset: offset ? parseInt(offset) : 0,
    });
    return res.json(result);
});

/**
 * @swagger
 * /vacantes/{id}:
 *   get:
 *     summary: Obtener vacante por ID
 *     tags: [Vacantes]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200: { description: Vacante encontrada }
 *       404: { description: No encontrada }
 */
const getById = asyncHandler(async (req, res) => {
    const vacante = await VacanteModel.findById(req.params.id);
    if (!vacante) return res.status(404).json({ message: "Vacante no encontrada" });
    return res.json(vacante);
});

/**
 * @swagger
 * /vacantes:
 *   post:
 *     summary: Crear nueva vacante (solo empresas)
 *     tags: [Vacantes]
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [titulo, empresa, descripcion, modalidad, tipo, ciudad, area]
 *             properties:
 *               titulo:      { type: string }
 *               empresa:     { type: string }
 *               descripcion: { type: string }
 *               requisitos:  { type: array, items: { type: string } }
 *               modalidad:   { type: string }
 *               tipo:        { type: string }
 *               ciudad:      { type: string }
 *               area:        { type: string }
 *               salario:     { type: string }
 *     responses:
 *       201: { description: Vacante creada }
 *       400: { description: Datos inválidos }
 */
const create = asyncHandler(async (req, res) => {
    const { titulo, empresa, descripcion, modalidad, tipo, ciudad, area } = req.body;

    if (!titulo || !empresa || !descripcion || !modalidad || !tipo || !ciudad || !area) {
        return res.status(400).json({ message: "Faltan campos obligatorios" });
    }

    const MODALIDADES_VALIDAS = ["Presencial", "Remoto", "Híbrido"];
    const TIPOS_VALIDOS = ["Práctica", "Tiempo completo", "Medio tiempo"];

    if (!MODALIDADES_VALIDAS.includes(modalidad)) {
        return res.status(400).json({ message: "Modalidad inválida" });
    }
    if (!TIPOS_VALIDOS.includes(tipo)) {
        return res.status(400).json({ message: "Tipo inválido" });
    }

    // Extraer solo campos permitidos para evitar mass assignment
    const { requisitos, salario } = req.body;
    const vacante = await VacanteModel.create({
        empresa_id: req.user.id,
        titulo,
        empresa,
        descripcion,
        requisitos,
        modalidad,
        tipo,
        ciudad,
        area,
        salario,
    });

    return res.status(201).json(vacante);
});

/**
 * @swagger
 * /vacantes/{id}:
 *   put:
 *     summary: Actualizar vacante (solo la empresa dueña)
 *     tags: [Vacantes]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200: { description: Vacante actualizada }
 *       403: { description: No autorizado }
 *       404: { description: No encontrada }
 */
const update = asyncHandler(async (req, res) => {
    const existente = await VacanteModel.findById(req.params.id);
    if (!existente) return res.status(404).json({ message: "Vacante no encontrada" });

    if (existente.empresa_id !== req.user.id) {
        return res.status(403).json({ message: "No autorizado para editar esta vacante" });
    }

    // Whitelist de campos editables — empresa_id NO puede ser modificado
    const { titulo, empresa, descripcion, requisitos, modalidad, tipo, ciudad, area, salario } = req.body;
    const updated = await VacanteModel.update(req.params.id, {
        titulo,
        empresa,
        descripcion,
        requisitos,
        modalidad,
        tipo,
        ciudad,
        area,
        salario,
    });
    return res.json(updated);
});

module.exports = { list, getById, create, update };