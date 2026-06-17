const { MongoClient } = require("mongodb");

const MONGO_URL = process.env.MONGO_URL || "mongodb://mongo:27017";
const MONGO_DB = process.env.MONGO_DB || "empleouni_audit";

let db = null;

async function connect() {
    if (db) return db;
    const client = new MongoClient(MONGO_URL);
    await client.connect();
    db = client.db(MONGO_DB);
    // Índices para consultas rápidas de logs (RNF: consultas rápidas de auditoría)
    await db.collection("audit_logs").createIndex({ created_at: -1 });
    await db.collection("audit_logs").createIndex({ servicio: 1, accion: 1 });
    await db.collection("audit_logs").createIndex({ usuario_id: 1 });
    console.log("[ms-audit] Conectado a MongoDB");
    return db;
}

function getDb() {
    if (!db) throw new Error("MongoDB no conectado");
    return db;
}

module.exports = { connect, getDb };
