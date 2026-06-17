-- Migración: evaluaciones por cortes (primer 30%, segundo 30%, tercer 40%).
-- Ejecutar: docker exec -i empleouni_postgres psql -U postgres < migration_cortes.sql

\c empleouni_practicas;

-- Agrandar la columna para los nuevos valores
ALTER TABLE evaluaciones ALTER COLUMN tipo TYPE VARCHAR(15);

-- Migrar datos existentes (parcial→primer_corte, final→tercer_corte)
UPDATE evaluaciones SET tipo = 'primer_corte' WHERE tipo = 'parcial';
UPDATE evaluaciones SET tipo = 'tercer_corte' WHERE tipo = 'final';

ALTER TABLE evaluaciones DROP CONSTRAINT IF EXISTS evaluaciones_tipo_check;
ALTER TABLE evaluaciones ADD CONSTRAINT evaluaciones_tipo_check
    CHECK (tipo IN ('primer_corte', 'segundo_corte', 'tercer_corte'));
