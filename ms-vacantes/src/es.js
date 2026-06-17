const { Client } = require("@elastic/elasticsearch");

const ES_URL = process.env.ES_URL || "http://elasticsearch:9200";
const INDEX = "vacantes";

const client = new Client({ node: ES_URL });

// Extrae el primer número del salario ("$800.000 - $1.200.000" → 800000)
function salarioNum(salario) {
    if (!salario) return 0;
    const limpio = String(salario).split("-")[0].replace(/[^0-9]/g, "");
    return limpio ? parseInt(limpio.slice(0, 12), 10) : 0;
}

function toDoc(v) {
    return {
        titulo: v.titulo,
        descripcion: v.descripcion,
        empresa: v.empresa,
        area: v.area,
        requisitos: Array.isArray(v.requisitos) ? v.requisitos.join(" ") : (v.requisitos || ""),
        modalidad: v.modalidad,
        tipo: v.tipo,
        ciudad: v.ciudad,
        salario_num: salarioNum(v.salario),
        activa: v.activa,
        created_at: v.created_at,
    };
}

async function ensureIndex() {
    const exists = await client.indices.exists({ index: INDEX });
    if (!exists) {
        await client.indices.create({
            index: INDEX,
            mappings: {
                properties: {
                    titulo: { type: "text" },
                    descripcion: { type: "text" },
                    empresa: { type: "text" },
                    area: { type: "text" },
                    requisitos: { type: "text" },
                    modalidad: { type: "keyword" },
                    tipo: { type: "keyword" },
                    ciudad: { type: "keyword" },
                    salario_num: { type: "long" },
                    activa: { type: "boolean" },
                    created_at: { type: "date" },
                },
            },
        });
        console.log("[ms-vacantes] Índice ElasticSearch 'vacantes' creado");
    }
}

// Indexa o actualiza una vacante (best-effort)
async function indexVacante(v) {
    try {
        await client.index({ index: INDEX, id: v.id, document: toDoc(v) });
    } catch (e) {
        console.error("[ms-vacantes] Error indexando en ES:", e.message);
    }
}

// Reindexa todas las vacantes existentes (al arrancar)
async function reindexAll(vacantes) {
    if (!vacantes.length) return;
    const operations = vacantes.flatMap((v) => [
        { index: { _index: INDEX, _id: v.id } },
        toDoc(v),
    ]);
    await client.bulk({ refresh: true, operations });
    console.log(`[ms-vacantes] Reindexadas ${vacantes.length} vacantes en ElasticSearch`);
}

/**
 * Búsqueda avanzada (RF06): multi_match con tolerancia a errores tipográficos
 * (fuzziness AUTO) y ranking por relevancia. Solo vacantes activas.
 * Devuelve los IDs ordenados por relevancia y el total.
 */
async function buscar({ q, modalidad, tipo, area, salarioMin, limit = 50, offset = 0 }) {
    const must = [];
    const filter = [{ term: { activa: true } }];

    if (q && q.trim()) {
        must.push({
            multi_match: {
                query: q.trim(),
                fields: ["titulo^3", "empresa^2", "area^2", "descripcion", "requisitos"],
                fuzziness: "AUTO",
            },
        });
    } else {
        must.push({ match_all: {} });
    }

    if (modalidad) filter.push({ term: { modalidad } });
    if (tipo) filter.push({ term: { tipo } });
    if (area && area.trim()) must.push({ match: { area: area.trim() } });
    if (salarioMin && Number(salarioMin) > 0) {
        filter.push({ range: { salario_num: { gte: Number(salarioMin) } } });
    }

    const res = await client.search({
        index: INDEX,
        from: offset,
        size: limit,
        query: { bool: { must, filter } },
        sort: q && q.trim() ? ["_score"] : [{ created_at: "desc" }],
    });

    const ids = res.hits.hits.map((h) => h._id);
    const total = typeof res.hits.total === "object" ? res.hits.total.value : res.hits.total;
    return { ids, total };
}

module.exports = { client, ensureIndex, indexVacante, reindexAll, buscar };
