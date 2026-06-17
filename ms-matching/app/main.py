"""
ms-matching - Microservicio de emparejamiento inteligente (Python + FastAPI).

Cubre RF07 (algoritmo de compatibilidad perfil-vacante), RF08 / HU10
(recomendaciones automaticas) y HU11 (puntaje de compatibilidad con desglose).

Obtiene los datos de los microservicios duenos (ms-perfiles y ms-vacantes)
reenviando el JWT del estudiante, respetando el patron database-per-service.
"""

import os

import httpx
import jwt
from fastapi import Depends, FastAPI, Header, HTTPException
from fastapi.middleware.cors import CORSMiddleware

from .matching import evaluar_compatibilidad, rankear_vacantes

JWT_SECRET = os.environ.get("JWT_SECRET", "empleouni_secret_dev_change_in_prod")
PERFILES_URL = os.environ.get("PERFILES_SERVICE_URL", "http://ms-perfiles:3002")
VACANTES_URL = os.environ.get("VACANTES_SERVICE_URL", "http://ms-vacantes:3003")
CORS_ORIGIN = os.environ.get("CORS_ORIGIN", "*")
MAX_VACANTES = 100

app = FastAPI(title="ms-matching", description="Emparejamiento inteligente EmpleoUni")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[CORS_ORIGIN] if CORS_ORIGIN != "*" else ["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


# ── Autenticacion ──────────────────────────────────────────────────────────
def auth(authorization: str = Header(default="")):
    """Valida el JWT (HS256) igual que los demas microservicios."""
    if not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Token requerido")
    token = authorization.split(" ", 1)[1]
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=["HS256"])
    except jwt.PyJWTError:
        raise HTTPException(status_code=401, detail="Token invalido o expirado")
    return {"payload": payload, "token": token}


# ── Clientes HTTP a otros microservicios ───────────────────────────────────
async def _get_perfil(token: str):
    async with httpx.AsyncClient(timeout=5.0) as client:
        r = await client.get(
            f"{PERFILES_URL}/perfiles/me",
            headers={"Authorization": f"Bearer {token}"},
        )
    if r.status_code == 404:
        raise HTTPException(status_code=404, detail="Perfil no encontrado")
    if r.status_code != 200:
        raise HTTPException(status_code=502, detail="No se pudo obtener el perfil")
    return r.json()


async def _get_vacantes(token: str):
    async with httpx.AsyncClient(timeout=5.0) as client:
        r = await client.get(
            f"{VACANTES_URL}/vacantes",
            headers={"Authorization": f"Bearer {token}"},
            params={"limit": MAX_VACANTES},
        )
    if r.status_code != 200:
        raise HTTPException(status_code=502, detail="No se pudieron obtener las vacantes")
    data = r.json()
    return data.get("vacantes", [])


async def _get_vacante(token: str, vacante_id: str):
    async with httpx.AsyncClient(timeout=5.0) as client:
        r = await client.get(
            f"{VACANTES_URL}/vacantes/{vacante_id}",
            headers={"Authorization": f"Bearer {token}"},
        )
    if r.status_code == 404:
        raise HTTPException(status_code=404, detail="Vacante no encontrada")
    if r.status_code != 200:
        raise HTTPException(status_code=502, detail="No se pudo obtener la vacante")
    return r.json()


# ── Endpoints ──────────────────────────────────────────────────────────────
@app.get("/health")
def health():
    return {"status": "ok", "service": "ms-matching"}


@app.get("/matching/recomendaciones")
async def recomendaciones(ctx: dict = Depends(auth), limit: int = 20):
    """
    Ranking de vacantes recomendadas para el estudiante autenticado
    (RF07, RF08, HU10, CU04).
    """
    token = ctx["token"]
    perfil = await _get_perfil(token)
    vacantes = await _get_vacantes(token)

    ranking = rankear_vacantes(perfil, vacantes)
    return {
        "perfil": {
            "programa": perfil.get("programa"),
            "habilidades": perfil.get("habilidades") or [],
        },
        "total": len(ranking),
        "recomendaciones": ranking[: max(1, limit)],
    }


@app.get("/matching/compatibilidad/{vacante_id}")
async def compatibilidad(vacante_id: str, ctx: dict = Depends(auth)):
    """
    Puntaje de compatibilidad y desglose entre el perfil del estudiante y una
    vacante puntual (RF07, HU11).
    """
    token = ctx["token"]
    perfil = await _get_perfil(token)
    vacante = await _get_vacante(token, vacante_id)

    evaluacion = evaluar_compatibilidad(perfil, vacante)
    return {"vacanteId": vacante_id, **evaluacion}
