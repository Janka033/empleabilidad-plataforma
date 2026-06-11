const { Pool } = require("pg");

const pool = new Pool({
    host: process.env.DB_HOST,
    port: process.env.DB_PORT || 5432,
    database: process.env.DB_NAME,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
});

const PostulacionModel = {
    // Estudiante: mis postulaciones
    async findByPerfilId(perfilId) {
        const { rows } = await pool.query(
            `SELECT
                 p.id,
                 p.vacante_id            AS "vacanteId",
                 p.carta_motivacion      AS "cartaMotivacion",
                 p.expectativa_salarial  AS "expectativaSalarial",
                 p.disponibilidad,
                 p.fecha_disponible      AS "fechaDisponible",
                 p.estado,
                 p.created_at            AS fecha
             FROM postulaciones p
             WHERE p.perfil_id = $1
             ORDER BY p.created_at DESC`,
            [perfilId]
        );
        return rows;
    },

    // Empresa: ver todos los postulados a una vacante, con datos del perfil
    async findByVacanteId(vacanteId) {
        const { rows } = await pool.query(
            `SELECT
                 p.id,
                 p.vacante_id            AS "vacanteId",
                 p.carta_motivacion      AS "cartaMotivacion",
                 p.expectativa_salarial  AS "expectativaSalarial",
                 p.disponibilidad,
                 p.fecha_disponible      AS "fechaDisponible",
                 p.estado,
                 p.created_at            AS fecha,
                 pf.id                   AS "perfilId",
                 pf.nombre,
                 pf.email,
                 pf.universidad,
                 pf.programa,
                 pf.semestre,
                 pf.habilidades,
                 pf.completitud
             FROM postulaciones p
                      JOIN perfiles pf ON pf.id = p.perfil_id
             WHERE p.vacante_id = $1
             ORDER BY p.created_at DESC`,
            [vacanteId]
        );
        return rows;
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
                vacante_id              AS "vacanteId",
                carta_motivacion        AS "cartaMotivacion",
                expectativa_salarial    AS "expectativaSalarial",
                disponibilidad,
                fecha_disponible        AS "fechaDisponible",
                estado,
                created_at              AS fecha`,
            [
                perfilId,
                vacanteId,
                cartaMotivacion,
                String(expectativaSalarial || ""),
                disponibilidad,
                fechaDisponible,
            ]
        );
        return rows[0];
    },
};

module.exports = PostulacionModel;