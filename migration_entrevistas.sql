-- Migración: tabla de entrevistas (selección de candidatos + agenda).
-- Ejecutar: docker exec -i empleouni_postgres psql -U postgres < migration_entrevistas.sql

\c empleouni_perfiles;

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
