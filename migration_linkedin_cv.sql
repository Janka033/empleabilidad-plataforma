\c empleouni_perfiles;
ALTER TABLE perfiles ADD COLUMN IF NOT EXISTS linkedin_url VARCHAR(255);
ALTER TABLE perfiles ADD COLUMN IF NOT EXISTS cv_url VARCHAR(500);
