const { Pool } = require("pg");

const pool = new Pool({
    host:     process.env.DB_HOST,
    port:     process.env.DB_PORT || 5432,
    database: process.env.DB_NAME,
    user:     process.env.DB_USER,
    password: process.env.DB_PASSWORD,
});

// Incluir los nuevos estados
const ESTADOS_VALIDOS = ["enviada", "vista", "entrevista", "rechazada", "aceptada", "confirmada", "rechazada_por_estudiante"];

const PostulacionModel = {
    // Estudiante: mis postulaciones
    async findByPerfilId(perfilId) {
        const { rows } = await pool.query(
            `SELECT
                p.id,
                p.vacante_id           AS "vacanteId",
                p.carta_motivacion     AS "cartaMotivacion",
                p.expectativa_salarial AS "expectativaSalarial",
                p.disponibilidad,
                p.fecha_disponible     AS "fechaDisponible",
                p.estado,
                p.es_favorita          AS "esFavorita",
                p.created_at           AS fecha
             FROM postulaciones p
             WHERE p.perfil_id = $1
             ORDER BY p.es_favorita DESC, p.created_at DESC`,
            [perfilId]
        );
        return rows;
    },

    // Empresa: ver todos los postulados a una vacante con datos de perfil
    async findByVacanteId(vacanteId) {
        const { rows } = await pool.query(
            `SELECT
                p.id,
                p.vacante_id           AS "vacanteId",
                p.carta_motivacion     AS "cartaMotivacion",
                p.expectativa_salarial AS "expectativaSalarial",
                p.disponibilidad,
                p.fecha_disponible     AS "fechaDisponible",
                p.estado,
                p.created_at           AS fecha,
                pf.id                  AS "perfilId",
                pf.nombre,
                pf.email,
                pf.universidad,
                pf.programa,
                pf.semestre,
                pf.habilidades,
                pf.completitud,
                pf.contratado,
                pf.empresa_contratante AS "empresaContratante"
             FROM postulaciones p
             JOIN perfiles pf ON pf.id = p.perfil_id
             WHERE p.vacante_id = $1
             ORDER BY p.created_at DESC`,
            [vacanteId]
        );
        return rows;
    },

    // Verificar doble postulación
    async existsByPerfilAndVacante(perfilId, vacanteId) {
        const { rows } = await pool.query(
            `SELECT 1 FROM postulaciones WHERE perfil_id = $1 AND vacante_id = $2 LIMIT 1`,
            [perfilId, vacanteId]
        );
        return rows.length > 0;
    },

    async create({ perfilId, vacanteId, cartaMotivacion, expectativaSalarial, disponibilidad }) {
        const fechaDisponible = disponibilidad === "inmediata"
            ? null
            : new Date().toISOString().split("T")[0];

        const { rows } = await pool.query(
            `INSERT INTO postulaciones
                (perfil_id, vacante_id, carta_motivacion, expectativa_salarial, disponibilidad, fecha_disponible)
             VALUES ($1, $2, $3, $4, $5, $6)
             RETURNING
                id,
                vacante_id             AS "vacanteId",
                carta_motivacion       AS "cartaMotivacion",
                expectativa_salarial   AS "expectativaSalarial",
                disponibilidad,
                fecha_disponible       AS "fechaDisponible",
                estado,
                es_favorita            AS "esFavorita",
                created_at             AS fecha`,
            [perfilId, vacanteId, cartaMotivacion, String(expectativaSalarial || ""), disponibilidad, fechaDisponible]
        );
        return rows[0];
    },

    // Empresa: cambiar estado
    async updateEstado(postulacionId, estado) {
        if (!ESTADOS_VALIDOS.includes(estado)) return null;

        const { rows } = await pool.query(
            `UPDATE postulaciones
             SET estado = $2
             WHERE id = $1
             RETURNING
                id,
                vacante_id             AS "vacanteId",
                carta_motivacion       AS "cartaMotivacion",
                expectativa_salarial   AS "expectativaSalarial",
                disponibilidad,
                estado,
                created_at             AS fecha`,
            [postulacionId, estado]
        );
        return rows[0] || null;
    },

    async findById(id) {
        const { rows } = await pool.query(
            `SELECT id, vacante_id AS "vacanteId", estado FROM postulaciones WHERE id = $1 LIMIT 1`,
            [id]
        );
        return rows[0] || null;
    },
};

module.exports = PostulacionModel;