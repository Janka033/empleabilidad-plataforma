"""
Acceso de solo lectura a las bases de datos de los microservicios para calcular
indicadores institucionales (RF15).

Analytics es un consumidor de solo lectura: no escribe en ninguna base. Como todo
corre en una misma instancia de PostgreSQL, abre una conexión por base de datos
(PostgreSQL no permite consultas entre bases) y combina los resultados en Python.
En un entorno productivo esto se reemplazaría por un data warehouse o vistas
materializadas, sin cambiar la interfaz pública de este módulo.
"""

import os

import psycopg2
from psycopg2.extras import RealDictCursor

DB_HOST = os.environ.get("DB_HOST", "postgres")
DB_PORT = os.environ.get("DB_PORT", "5432")
DB_USER = os.environ.get("DB_USER", "postgres")
DB_PASSWORD = os.environ.get("DB_PASSWORD", "postgres")

DB_PERFILES = os.environ.get("DB_PERFILES", "empleouni_perfiles")
DB_VACANTES = os.environ.get("DB_VACANTES", "empleouni_vacantes")
DB_PRACTICAS = os.environ.get("DB_PRACTICAS", "empleouni_practicas")


def _query(dbname, sql):
    """Ejecuta una consulta y devuelve filas como lista de dicts."""
    conn = psycopg2.connect(
        host=DB_HOST, port=DB_PORT, user=DB_USER, password=DB_PASSWORD, dbname=dbname
    )
    try:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute(sql)
            return cur.fetchall()
    finally:
        conn.close()


def resumen():
    """KPIs institucionales globales (RF15, HU18)."""
    vac = _query(DB_VACANTES,
        "SELECT COUNT(*) AS total, COUNT(*) FILTER (WHERE activa) AS activas FROM vacantes"
    )[0]

    perf = _query(DB_PERFILES,
        "SELECT COUNT(*) AS total, COUNT(*) FILTER (WHERE contratado) AS contratados FROM perfiles"
    )[0]

    post_estados = _query(DB_PERFILES,
        "SELECT estado, COUNT(*) AS cantidad FROM postulaciones GROUP BY estado ORDER BY cantidad DESC"
    )
    total_postulaciones = sum(int(r["cantidad"]) for r in post_estados)

    prac = _query(DB_PRACTICAS,
        "SELECT COUNT(*) AS total, COUNT(*) FILTER (WHERE estado = 'finalizado') AS finalizados FROM convenios"
    )[0]

    nota = _query(DB_PRACTICAS,
        "SELECT ROUND(AVG(calificacion), 2) AS promedio FROM evaluaciones WHERE tipo = 'tercer_corte'"
    )[0]

    total_estudiantes = int(perf["total"])
    contratados = int(perf["contratados"])
    tasa_empleabilidad = round(contratados / total_estudiantes * 100, 1) if total_estudiantes else 0.0

    return {
        "vacantes": {"total": int(vac["total"]), "activas": int(vac["activas"])},
        "estudiantes": {"total": total_estudiantes, "contratados": contratados},
        "tasaEmpleabilidad": tasa_empleabilidad,
        "postulaciones": {
            "total": total_postulaciones,
            "porEstado": [{"estado": r["estado"], "cantidad": int(r["cantidad"])} for r in post_estados],
        },
        "practicas": {
            "totalConvenios": int(prac["total"]),
            "finalizadas": int(prac["finalizados"]),
            "notaPromedio": float(nota["promedio"]) if nota["promedio"] is not None else None,
        },
    }


def por_programa():
    """Indicadores agrupados por programa académico (RF15)."""
    rows = _query(DB_PERFILES,
        """SELECT COALESCE(NULLIF(programa, ''), 'Sin programa') AS programa,
                  COUNT(*)                           AS estudiantes,
                  COUNT(*) FILTER (WHERE contratado) AS contratados
           FROM perfiles
           GROUP BY 1
           ORDER BY estudiantes DESC"""
    )
    return [
        {
            "programa": r["programa"],
            "estudiantes": int(r["estudiantes"]),
            "contratados": int(r["contratados"]),
            "tasa": round(int(r["contratados"]) / int(r["estudiantes"]) * 100, 1) if int(r["estudiantes"]) else 0.0,
        }
        for r in rows
    ]
