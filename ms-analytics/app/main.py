"""
ms-analytics - Microservicio de analítica institucional (Python + FastAPI).

Cubre RF15 (métricas por programa/facultad/sede), RF16 (exportar informes),
HU17 (descarga de informes) y HU18 (dashboard de indicadores). CU08.

Acceso restringido al rol administrador (RBAC, RF18).
"""

import csv
import io
import os

import jwt
from fastapi import Depends, FastAPI, Header, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse

from . import db

JWT_SECRET = os.environ.get("JWT_SECRET", "empleouni_secret_dev_change_in_prod")
CORS_ORIGIN = os.environ.get("CORS_ORIGIN", "*")

app = FastAPI(title="ms-analytics", description="Analítica institucional EmpleoUni")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[CORS_ORIGIN] if CORS_ORIGIN != "*" else ["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


def solo_admin(authorization: str = Header(default="")):
    """Valida el JWT y exige rol administrador (RF18)."""
    if not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Token requerido")
    token = authorization.split(" ", 1)[1]
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=["HS256"])
    except jwt.PyJWTError:
        raise HTTPException(status_code=401, detail="Token inválido o expirado")
    if payload.get("rol") != "admin":
        raise HTTPException(status_code=403, detail="Solo administradores")
    return payload


@app.get("/health")
def health():
    return {"status": "ok", "service": "ms-analytics"}


@app.get("/analytics/resumen")
def resumen(_admin: dict = Depends(solo_admin)):
    """Indicadores globales para el dashboard institucional (HU18)."""
    return {"resumen": db.resumen(), "porPrograma": db.por_programa()}


@app.get("/analytics/reporte.csv")
def reporte_csv(_admin: dict = Depends(solo_admin)):
    """Exporta el informe de indicadores en CSV (compatible con Excel) — RF16, HU17."""
    data = db.resumen()
    programas = db.por_programa()

    buffer = io.StringIO()
    writer = csv.writer(buffer)

    writer.writerow(["Informe de empleabilidad - EmpleoUni"])
    writer.writerow([])
    writer.writerow(["Indicador", "Valor"])
    writer.writerow(["Vacantes totales", data["vacantes"]["total"]])
    writer.writerow(["Vacantes activas", data["vacantes"]["activas"]])
    writer.writerow(["Estudiantes registrados", data["estudiantes"]["total"]])
    writer.writerow(["Estudiantes contratados", data["estudiantes"]["contratados"]])
    writer.writerow(["Tasa de empleabilidad (%)", data["tasaEmpleabilidad"]])
    writer.writerow(["Postulaciones totales", data["postulaciones"]["total"]])
    writer.writerow(["Convenios de practica", data["practicas"]["totalConvenios"]])
    writer.writerow(["Practicas finalizadas", data["practicas"]["finalizadas"]])
    writer.writerow(["Nota promedio de practicas", data["practicas"]["notaPromedio"]])
    writer.writerow([])
    writer.writerow(["Postulaciones por estado"])
    writer.writerow(["Estado", "Cantidad"])
    for e in data["postulaciones"]["porEstado"]:
        writer.writerow([e["estado"], e["cantidad"]])
    writer.writerow([])
    writer.writerow(["Indicadores por programa"])
    writer.writerow(["Programa", "Estudiantes", "Contratados", "Tasa (%)"])
    for p in programas:
        writer.writerow([p["programa"], p["estudiantes"], p["contratados"], p["tasa"]])

    buffer.seek(0)
    return StreamingResponse(
        iter([buffer.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=informe_empleabilidad.csv"},
    )
