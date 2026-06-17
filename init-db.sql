-- ═══════════════════════════════════════════════════════════
-- EmpleoUni — Script de inicialización de base de datos local
-- ═══════════════════════════════════════════════════════════

CREATE DATABASE empleouni_auth;
CREATE DATABASE empleouni_perfiles;
CREATE DATABASE empleouni_vacantes;
CREATE DATABASE empleouni_practicas;

-- ════════════════════════════════════════════
-- SCHEMA: empleouni_auth
-- ════════════════════════════════════════════
\c empleouni_auth;

CREATE TABLE IF NOT EXISTS users (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nombre        VARCHAR(120) NOT NULL,
    email         VARCHAR(255) NOT NULL UNIQUE,
    -- Nullable: los usuarios que entran con Google no tienen contraseña local
    password_hash VARCHAR(255),
    rol           VARCHAR(20)  NOT NULL CHECK (rol IN ('estudiante', 'empresa', 'admin')),
    activo        BOOLEAN      NOT NULL DEFAULT TRUE,
    -- Inicio de sesión social (Google)
    google_id     VARCHAR(255) UNIQUE,
    auth_provider VARCHAR(20)  NOT NULL DEFAULT 'local',
    created_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

-- Restablecimiento de contraseña: guardamos solo el HASH del token (nunca el token en claro)
CREATE TABLE IF NOT EXISTS password_resets (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token_hash  VARCHAR(64) NOT NULL,
    expires_at  TIMESTAMPTZ NOT NULL,
    used        BOOLEAN     NOT NULL DEFAULT FALSE,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_password_resets_token ON password_resets(token_hash);

-- Usuario administrador institucional (acceso a analítica). Password: admin12345
INSERT INTO users (nombre, email, password_hash, rol)
VALUES ('Administrador EmpleoUni', 'admin@empleouni.co',
        '$2a$12$3v1XLaHedjTKzG.wsZq3UOdnhiH9/O1NPTK45UP/WDD0mDN0WOjhe', 'admin')
ON CONFLICT (email) DO NOTHING;

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
    contratado          BOOLEAN      NOT NULL DEFAULT FALSE,
    empresa_contratante VARCHAR(255),
    linkedin_url        VARCHAR(255),
    cv_url              VARCHAR(500),
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

-- Entrevistas: la empresa selecciona un candidato y agenda la entrevista; la
-- coordinadora la confirma y el estudiante confirma su asistencia.
CREATE TABLE IF NOT EXISTS entrevistas (
    id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    postulacion_id       UUID         NOT NULL,
    estudiante_user_id   UUID         NOT NULL,
    estudiante_perfil_id UUID,
    estudiante_nombre    VARCHAR(120),
    empresa_id           UUID,
    empresa_nombre       VARCHAR(150),
    vacante_id           UUID,
    vacante_titulo       VARCHAR(150),
    tipo                 VARCHAR(20)  NOT NULL CHECK (tipo IN ('virtual', 'presencial')),
    enlace               VARCHAR(500),
    lugar                VARCHAR(255),
    fecha                DATE,
    hora                 VARCHAR(10),
    estado               VARCHAR(20)  NOT NULL DEFAULT 'solicitada'
                          CHECK (estado IN ('solicitada', 'programada', 'confirmada', 'rechazada')),
    created_at           TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at           TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_entrevistas_estudiante ON entrevistas(estudiante_user_id);
CREATE INDEX IF NOT EXISTS idx_entrevistas_empresa    ON entrevistas(empresa_id);

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

-- ════════════════════════════════════════════
-- SCHEMA: empleouni_practicas  (Prácticas Profesionales — RF12, RF13, RF14)
-- ════════════════════════════════════════════
\c empleouni_practicas;

CREATE TABLE IF NOT EXISTS convenios (
    id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    estudiante_user_id   UUID         NOT NULL,                      -- id de usuario (auth) del estudiante
    estudiante_perfil_id UUID,                                       -- id de perfil del estudiante
    estudiante_nombre    VARCHAR(120) NOT NULL,
    empresa_id           UUID         NOT NULL,                      -- id de usuario (auth) de la empresa
    empresa_nombre       VARCHAR(150) NOT NULL,
    vacante_id           UUID,
    vacante_titulo       VARCHAR(150),
    tutor_empresarial    VARCHAR(120),
    tutor_academico      VARCHAR(120),
    modalidad            VARCHAR(20),
    funciones            TEXT,
    fecha_inicio         DATE,
    fecha_fin            DATE,
    estado               VARCHAR(20)  NOT NULL DEFAULT 'activo'
                          CHECK (estado IN ('activo', 'finalizado', 'cancelado')),
    created_at           TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at           TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS evaluaciones (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    convenio_id   UUID         NOT NULL REFERENCES convenios(id) ON DELETE CASCADE,
    tipo          VARCHAR(15)  NOT NULL CHECK (tipo IN ('primer_corte', 'segundo_corte', 'tercer_corte')),
    calificacion  NUMERIC(3,1) CHECK (calificacion >= 0 AND calificacion <= 5),
    observaciones TEXT,
    evaluador     VARCHAR(120),
    created_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_convenios_estudiante ON convenios(estudiante_user_id);
CREATE INDEX IF NOT EXISTS idx_convenios_empresa    ON convenios(empresa_id);
CREATE INDEX IF NOT EXISTS idx_evaluaciones_convenio ON evaluaciones(convenio_id);