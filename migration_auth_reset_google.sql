-- ═══════════════════════════════════════════════════════════
-- Migración: restablecimiento de contraseña + inicio de sesión con Google
-- Ejecutar contra la base de datos en ejecución:
--   docker exec -i empleouni_postgres psql -U postgres < migration_auth_reset_google.sql
-- ═══════════════════════════════════════════════════════════
\c empleouni_auth;

-- Contraseña opcional (usuarios de Google no tienen una local)
ALTER TABLE users ALTER COLUMN password_hash DROP NOT NULL;

-- Columnas para login social
ALTER TABLE users ADD COLUMN IF NOT EXISTS google_id VARCHAR(255);
ALTER TABLE users ADD COLUMN IF NOT EXISTS auth_provider VARCHAR(20) NOT NULL DEFAULT 'local';

-- Índice único de google_id (si no existe)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'users_google_id_key') THEN
        ALTER TABLE users ADD CONSTRAINT users_google_id_key UNIQUE (google_id);
    END IF;
END$$;

-- Tabla de restablecimiento de contraseña
CREATE TABLE IF NOT EXISTS password_resets (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token_hash  VARCHAR(64) NOT NULL,
    expires_at  TIMESTAMPTZ NOT NULL,
    used        BOOLEAN     NOT NULL DEFAULT FALSE,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_password_resets_token ON password_resets(token_hash);
