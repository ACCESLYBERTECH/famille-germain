-- =====================================================================
-- Reconnaissances en virtuel : le numéro de PCI (unique) identifie la personne
-- Deux « Julie Tremblay » différentes ne sont plus confondues
-- =====================================================================

ALTER TABLE reconnaissances_virtuel ADD COLUMN IF NOT EXISTS numero_amway text;
CREATE INDEX IF NOT EXISTS reconnaissances_virtuel_numero_idx ON reconnaissances_virtuel (evenement_id, numero_amway);

-- VÉRIFICATION — doit afficher : numero_amway
SELECT column_name FROM information_schema.columns
WHERE table_name = 'reconnaissances_virtuel' AND column_name = 'numero_amway';
