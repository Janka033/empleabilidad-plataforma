-- ═══════════════════════════════════════════════════════════
-- EmpleoUni — Migración: Notificaciones + vacante seleccionada
-- Ejecutar en la BD empleouni_perfiles
-- ═══════════════════════════════════════════════════════════

\c empleouni_perfiles;

-- Columna: vacante seleccionada por el estudiante (la que más le gusta)
ALTER TABLE postulaciones
    ADD COLUMN IF NOT EXISTS es_favorita BOOLEAN NOT NULL DEFAULT FALSE;

-- Columna: marca si el estudiante ya fue contratado (tiene empresa)
ALTER TABLE perfiles
    ADD COLUMN IF NOT EXISTS contratado BOOLEAN NOT NULL DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS empresa_contratante VARCHAR(150);

-- Tabla de notificaciones (para empresa y estudiante)
CREATE TABLE IF NOT EXISTS notificaciones (
    id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id     UUID        NOT NULL,         -- destinatario
    tipo        VARCHAR(50) NOT NULL,          -- 'postulacion_nueva' | 'estado_cambiado' | 'contratado'
    titulo      VARCHAR(200) NOT NULL,
    mensaje     TEXT        NOT NULL,
    leida       BOOLEAN     NOT NULL DEFAULT FALSE,
    meta        JSONB,                         -- datos extras (vacanteId, postulacionId, etc.)
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notificaciones_user  ON notificaciones(user_id);
CREATE INDEX IF NOT EXISTS idx_notificaciones_leida ON notificaciones(user_id, leida);