-- Migración: crea el usuario administrador institucional (acceso a analítica).
-- Email: admin@empleouni.co  ·  Password: admin12345
-- Ejecutar contra el contenedor en marcha:
--   docker exec -i empleouni_postgres psql -U postgres < migration_admin.sql

\c empleouni_auth;

INSERT INTO users (nombre, email, password_hash, rol)
VALUES ('Administrador EmpleoUni', 'admin@empleouni.co',
        '$2a$12$3v1XLaHedjTKzG.wsZq3UOdnhiH9/O1NPTK45UP/WDD0mDN0WOjhe', 'admin')
ON CONFLICT (email) DO NOTHING;
