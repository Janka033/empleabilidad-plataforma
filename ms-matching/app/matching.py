"""
Algoritmo de emparejamiento perfil <-> vacante (RF07).

Calcula un puntaje de compatibilidad 0-100 a partir de tres componentes
ponderados y devuelve un desglose explicable (HU11):

  - Habilidades (60%): coincidencia entre las habilidades del estudiante y
    los requisitos de la vacante.
  - Area/Programa (25%): alineacion del programa academico con el area de la
    vacante.
  - Tipo de contrato (15%): una practica profesional es la etapa ideal del
    estudiante, por lo que aporta mas puntaje.

El algoritmo es deterministico y sin dependencias pesadas para mantener el
contenedor liviano. Puede sustituirse por TF-IDF + scikit-learn en el futuro
sin cambiar la interfaz publica `evaluar_compatibilidad`.
"""

import unicodedata

PESO_HABILIDADES = 60
PESO_AREA = 25
PESO_TIPO = 15

# Mapa programa academico -> palabras clave del area afin
PROGRAMA_KEYWORDS = {
    "ingenieria de software": {
        "tecnologia", "software", "sistemas", "desarrollo", "ti", "it",
        "programacion", "datos", "backend", "frontend", "fullstack", "devops",
    },
    "ingenieria de sistemas": {
        "tecnologia", "software", "sistemas", "desarrollo", "ti", "it",
        "programacion", "datos", "redes", "infraestructura",
    },
    "administracion de empresas": {
        "administracion", "negocios", "gestion", "comercial", "mercadeo",
        "ventas", "logistica", "recursos humanos", "talento",
    },
    "diseno grafico": {
        "diseno", "grafico", "ux", "ui", "creativo", "multimedia",
        "publicidad", "branding", "audiovisual",
    },
    "contaduria publica": {
        "contabilidad", "contaduria", "financiero", "finanzas", "auditoria",
        "tributario", "costos", "nomina",
    },
    "derecho": {
        "derecho", "legal", "juridico", "abogado", "cumplimiento", "normativo",
    },
}

# Puntaje del componente "tipo" segun la modalidad de contratacion
TIPO_SCORES = {
    "practica": PESO_TIPO,
    "medio tiempo": 10,
    "tiempo completo": 6,
}


def _normalizar(texto):
    """minusculas, sin tildes y sin espacios sobrantes."""
    if not texto:
        return ""
    texto = str(texto).strip().lower()
    texto = unicodedata.normalize("NFKD", texto)
    return "".join(c for c in texto if not unicodedata.combining(c))


def _nivel(score):
    if score >= 70:
        return "Alta"
    if score >= 40:
        return "Media"
    return "Baja"


def _evaluar_habilidades(habilidades, requisitos, texto_vacante):
    """Devuelve (puntos, coincidencias_visibles, motivo)."""
    perfil = {_normalizar(h): h for h in habilidades if _normalizar(h)}
    if not perfil:
        return 0, [], "No has registrado habilidades en tu perfil"

    req_norm = {_normalizar(r): r for r in (requisitos or []) if _normalizar(r)}

    if req_norm:
        # Coincidencia directa contra los requisitos declarados
        comunes = [perfil[k] for k in perfil if k in req_norm]
        ratio = len(comunes) / len(req_norm)
        puntos = round(PESO_HABILIDADES * min(ratio, 1.0))
        if comunes:
            motivo = (
                f"Coinciden {len(comunes)} de {len(req_norm)} habilidades "
                f"requeridas: {', '.join(comunes[:5])}"
            )
        else:
            motivo = "Tus habilidades no coinciden con los requisitos de la vacante"
        return puntos, comunes, motivo

    # Sin requisitos declarados: buscar las habilidades del perfil en el texto
    encontradas = [perfil[k] for k in perfil if k and k in texto_vacante]
    if encontradas:
        ratio = len(encontradas) / len(perfil)
        puntos = round(PESO_HABILIDADES * min(ratio, 1.0))
        motivo = (
            f"La vacante menciona {len(encontradas)} de tus habilidades: "
            f"{', '.join(encontradas[:5])}"
        )
        return puntos, encontradas, motivo

    return 0, [], "La vacante no especifica requisitos para comparar"


def _evaluar_area(programa, area, texto_vacante):
    """Devuelve (puntos, motivo)."""
    keywords = PROGRAMA_KEYWORDS.get(_normalizar(programa))
    if not keywords:
        return 0, "Completa tu programa academico para mejorar la recomendacion"

    area_norm = _normalizar(area)
    # Coincidencia fuerte: el area declarada cae dentro de las palabras afines
    if any(k in area_norm or area_norm in k for k in keywords if area_norm):
        return PESO_AREA, f"Tu programa ({programa}) encaja con el area {area}"

    # Coincidencia parcial: alguna palabra clave aparece en el texto
    if any(k in texto_vacante for k in keywords):
        return round(PESO_AREA / 2), f"El cargo se relaciona con tu programa ({programa})"

    return 0, f"El area {area} no es afin a tu programa"


def _evaluar_tipo(tipo):
    """Devuelve (puntos, motivo)."""
    tipo_norm = _normalizar(tipo)
    puntos = TIPO_SCORES.get(tipo_norm, 6)
    if tipo_norm == "practica":
        motivo = "Es una practica profesional, ideal para tu etapa academica"
    elif tipo_norm == "medio tiempo":
        motivo = "Modalidad de medio tiempo, compatible con tus estudios"
    else:
        motivo = "Vacante de tiempo completo"
    return puntos, motivo


def evaluar_compatibilidad(perfil, vacante):
    """
    Calcula la compatibilidad entre un perfil estudiantil y una vacante.

    perfil:  dict con habilidades (list), programa (str)
    vacante: dict con requisitos (list|None), area, tipo, titulo, descripcion

    Devuelve un dict con score, nivel, motivos y desglose.
    """
    habilidades = perfil.get("habilidades") or []
    programa = perfil.get("programa") or ""

    texto_vacante = _normalizar(
        f"{vacante.get('titulo', '')} {vacante.get('descripcion', '')} {vacante.get('area', '')}"
    )

    pts_hab, comunes, motivo_hab = _evaluar_habilidades(
        habilidades, vacante.get("requisitos"), texto_vacante
    )
    pts_area, motivo_area = _evaluar_area(programa, vacante.get("area", ""), texto_vacante)
    pts_tipo, motivo_tipo = _evaluar_tipo(vacante.get("tipo", ""))

    score = min(pts_hab + pts_area + pts_tipo, 100)

    return {
        "score": score,
        "nivel": _nivel(score),
        "motivos": [motivo_hab, motivo_area, motivo_tipo],
        "habilidadesCoincidentes": comunes,
        "desglose": {
            "habilidades": pts_hab,
            "area": pts_area,
            "tipo": pts_tipo,
        },
    }


def rankear_vacantes(perfil, vacantes):
    """
    Evalua todas las vacantes y devuelve la lista ordenada por compatibilidad
    descendente (RF07, RF08, CU04).
    """
    resultados = []
    for vacante in vacantes:
        evaluacion = evaluar_compatibilidad(perfil, vacante)
        resultados.append({"vacante": vacante, **evaluacion})

    resultados.sort(key=lambda r: r["score"], reverse=True)
    return resultados
