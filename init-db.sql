-- ═══════════════════════════════════════════════════════════
-- EmpleoUni — Script de inicialización de base de datos local
-- ═══════════════════════════════════════════════════════════

CREATE DATABASE empleouni_auth;
CREATE DATABASE empleouni_perfiles;
CREATE DATABASE empleouni_vacantes;

-- ════════════════════════════════════════════
-- SCHEMA: empleouni_auth
-- ════════════════════════════════════════════
\c empleouni_auth;

CREATE TABLE IF NOT EXISTS users (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nombre        VARCHAR(120) NOT NULL,
    email         VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    rol           VARCHAR(20)  NOT NULL CHECK (rol IN ('estudiante', 'empresa', 'admin')),
    activo        BOOLEAN      NOT NULL DEFAULT TRUE,
    created_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

-- ════════════════════════════════════════════
-- SCHEMA: empleouni_perfiles
-- ════════════════════════════════════════════
\c empleouni_perfiles;

CREATE TABLE IF NOT EXISTS perfiles (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id             UUID         NOT NULL UNIQUE,
    nombre              VARCHAR(120) NOT NULL,
    email               VARCHAR(255) NOT NULL,
    universidad         VARCHAR(200),
    programa            VARCHAR(200),
    semestre            SMALLINT,
    bio                 TEXT,
    habilidades         TEXT[],
    completitud         SMALLINT     NOT NULL DEFAULT 0,
    contratado          BOOLEAN      NOT NULL DEFAULT FALSE,      -- ← NUEVO
    empresa_contratante VARCHAR(255),                             -- ← NUEVO
    created_at          TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS postulaciones (
    id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    perfil_id            UUID         NOT NULL REFERENCES perfiles(id) ON DELETE CASCADE,
    vacante_id           UUID         NOT NULL,
    carta_motivacion     TEXT         NOT NULL,
    expectativa_salarial VARCHAR(100),
    disponibilidad       VARCHAR(50),
    fecha_disponible     DATE,
    estado               VARCHAR(50)  NOT NULL DEFAULT 'enviada',
    es_favorita          BOOLEAN      NOT NULL DEFAULT FALSE,     -- ← NUEVO
    created_at           TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at           TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS notificaciones (                       -- ← NUEVA TABLA
    id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id    UUID         NOT NULL,
    tipo       VARCHAR(50)  NOT NULL,
    titulo     VARCHAR(255) NOT NULL,
    mensaje    TEXT         NOT NULL,
    meta       JSONB,
    leida      BOOLEAN      NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_postulaciones_perfil    ON postulaciones(perfil_id);
CREATE INDEX IF NOT EXISTS idx_postulaciones_vacante   ON postulaciones(vacante_id);
CREATE INDEX IF NOT EXISTS idx_notificaciones_user     ON notificaciones(user_id);
CREATE INDEX IF NOT EXISTS idx_notificaciones_leida    ON notificaciones(user_id, leida);

-- ════════════════════════════════════════════
-- SCHEMA: empleouni_vacantes
-- ════════════════════════════════════════════
\c empleouni_vacantes;

CREATE TABLE IF NOT EXISTS vacantes (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    empresa_id   UUID         NOT NULL,
    titulo       VARCHAR(150) NOT NULL,
    empresa      VARCHAR(150) NOT NULL,
    descripcion  TEXT         NOT NULL,
    requisitos   TEXT[],
    modalidad    VARCHAR(20)  NOT NULL CHECK (modalidad IN ('Presencial','Remoto','Híbrido')),
    tipo         VARCHAR(30)  NOT NULL CHECK (tipo IN ('Práctica','Tiempo completo','Medio tiempo')),
    ciudad       VARCHAR(100) NOT NULL,
    area         VARCHAR(100) NOT NULL,
    salario      VARCHAR(80),
    activa       BOOLEAN      NOT NULL DEFAULT TRUE,
    fecha_cierre DATE,
    created_at   TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at   TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_vacantes_area      ON vacantes(area);
CREATE INDEX IF NOT EXISTS idx_vacantes_modalidad ON vacantes(modalidad);
CREATE INDEX IF NOT EXISTS idx_vacantes_tipo      ON vacantes(tipo);
CREATE INDEX IF NOT EXISTS idx_vacantes_activa    ON vacantes(activa);