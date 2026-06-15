\c empleouni_perfiles;

-- 1. Columnas para favorita
ALTER TABLE postulaciones
    ADD COLUMN IF NOT EXISTS es_favorita BOOLEAN NOT NULL DEFAULT FALSE;

-- 2. Columnas para contratado
ALTER TABLE perfiles
    ADD COLUMN IF NOT EXISTS contratado BOOLEAN NOT NULL DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS empresa_contratante VARCHAR(150);

-- 3. Tabla de notificaciones
CREATE TABLE IF NOT EXISTS notificaciones (
    id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id     UUID        NOT NULL,
    tipo        VARCHAR(50) NOT NULL,
    titulo      VARCHAR(200) NOT NULL,
    mensaje     TEXT        NOT NULL,
    leida       BOOLEAN     NOT NULL DEFAULT FALSE,
    meta        JSONB,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notificaciones_user ON notificaciones(user_id);
CREATE INDEX IF NOT EXISTS idx_notificaciones_leida ON notificaciones(user_id, leida);

-- 4. ⭐ NUEVO: Permitir estados 'confirmada' y 'rechazada_por_estudiante'
ALTER TABLE postulaciones DROP CONSTRAINT IF EXISTS postulaciones_estado_check;
ALTER TABLE postulaciones ADD CONSTRAINT postulaciones_estado_check
  CHECK (estado IN ('enviada','vista','entrevista','rechazada','aceptada','confirmada','rechazada_por_estudiante'));