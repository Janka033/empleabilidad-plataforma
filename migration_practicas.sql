-- Migración: crea la base de datos y tablas del módulo de Prácticas Profesionales.
-- Ejecutar contra el contenedor en marcha:
--   docker exec -i empleouni_postgres psql -U postgres < migration_practicas.sql

SELECT 'CREATE DATABASE empleouni_practicas'
WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'empleouni_practicas')\gexec

\c empleouni_practicas;

CREATE TABLE IF NOT EXISTS convenios (
    id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    estudiante_user_id   UUID         NOT NULL,
    estudiante_perfil_id UUID,
    estudiante_nombre    VARCHAR(120) NOT NULL,
    empresa_id           UUID         NOT NULL,
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
    tipo          VARCHAR(10)  NOT NULL CHECK (tipo IN ('parcial', 'final')),
    calificacion  NUMERIC(3,1) CHECK (calificacion >= 0 AND calificacion <= 5),
    observaciones TEXT,
    evaluador     VARCHAR(120),
    created_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_convenios_estudiante ON convenios(estudiante_user_id);
CREATE INDEX IF NOT EXISTS idx_convenios_empresa    ON convenios(empresa_id);
CREATE INDEX IF NOT EXISTS idx_evaluaciones_convenio ON evaluaciones(convenio_id);
