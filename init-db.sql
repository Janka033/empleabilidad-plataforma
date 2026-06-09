-- ═══════════════════════════════════════════════════════════
-- EmpleoUni — Script de inicialización de base de datos local
-- Se ejecuta automáticamente al levantar el contenedor postgres
-- ═══════════════════════════════════════════════════════════

-- ── Crear bases de datos por microservicio ────────────────────
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
                                        id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id        UUID         NOT NULL UNIQUE,
    nombre         VARCHAR(120) NOT NULL,
    email          VARCHAR(255) NOT NULL,
    universidad    VARCHAR(200),
    programa       VARCHAR(200),
    semestre       SMALLINT,
    bio            TEXT,
    habilidades    TEXT[],
    completitud    SMALLINT     NOT NULL DEFAULT 0,
    created_at     TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at     TIMESTAMPTZ  NOT NULL DEFAULT NOW()
    );

CREATE TABLE IF NOT EXISTS postulaciones (
                                             id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    perfil_id            UUID        NOT NULL REFERENCES perfiles(id) ON DELETE CASCADE,
    vacante_id           UUID        NOT NULL,
    carta_motivacion     TEXT,
    expectativa_salarial VARCHAR(50),
    disponibilidad       VARCHAR(30) NOT NULL DEFAULT 'inmediata',
    fecha_disponible     DATE,
    estado               VARCHAR(30) NOT NULL DEFAULT 'enviada' CHECK (estado IN ('enviada','vista','entrevista','rechazada','aceptada')),
    created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

CREATE INDEX IF NOT EXISTS idx_postulaciones_perfil ON postulaciones(perfil_id);

-- ════════════════════════════════════════════
-- SCHEMA: empleouni_vacantes
-- ════════════════════════════════════════════
\c empleouni_vacantes;

CREATE TABLE IF NOT EXISTS vacantes (
                                        id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    empresa_id      UUID         NOT NULL,
    titulo          VARCHAR(150) NOT NULL,
    empresa         VARCHAR(150) NOT NULL,
    descripcion     TEXT         NOT NULL,
    requisitos      TEXT[],
    modalidad       VARCHAR(20)  NOT NULL CHECK (modalidad IN ('Presencial','Remoto','Híbrido')),
    tipo            VARCHAR(30)  NOT NULL CHECK (tipo IN ('Práctica','Tiempo completo','Medio tiempo')),
    ciudad          VARCHAR(100) NOT NULL,
    area            VARCHAR(100) NOT NULL,
    salario         VARCHAR(80),
    activa          BOOLEAN      NOT NULL DEFAULT TRUE,
    fecha_cierre    DATE,
    created_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW()
    );

CREATE INDEX IF NOT EXISTS idx_vacantes_area     ON vacantes(area);
CREATE INDEX IF NOT EXISTS idx_vacantes_modalidad ON vacantes(modalidad);
CREATE INDEX IF NOT EXISTS idx_vacantes_tipo      ON vacantes(tipo);
CREATE INDEX IF NOT EXISTS idx_vacantes_activa    ON vacantes(activa);

-- Datos de prueba
INSERT INTO vacantes (empresa_id, titulo, empresa, descripcion, requisitos, modalidad, tipo, ciudad, area, salario)
VALUES
    (gen_random_uuid(), 'Desarrollador Frontend Junior', 'TechCorp S.A.S.', 'Buscamos estudiante para apoyar el desarrollo de interfaces web modernas.', ARRAY['React o Vue.js','HTML/CSS','Git'], 'Híbrido', 'Práctica', 'Armenia, Quindío', 'Tecnología', '$800.000 - $1.200.000'),
    (gen_random_uuid(), 'Analista de Datos', 'DataSolutions', 'Apoyo en análisis de datos y dashboards para clientes del sector financiero.', ARRAY['Python o R','SQL','Power BI'], 'Remoto', 'Medio tiempo', 'Bogotá (Remoto)', 'Tecnología', '$1.000.000'),
    (gen_random_uuid(), 'Auxiliar Contable', 'Grupo Empresarial Eje', 'Práctica profesional para estudiantes de Contaduría Pública.', ARRAY['Contabilidad básica','Excel'], 'Presencial', 'Práctica', 'Manizales, Caldas', 'Administración', '$600.000');
