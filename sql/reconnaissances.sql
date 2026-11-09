-- =====================================================================
-- Reconnaissances sur scène (congrès et sessions payantes)
--   - Liste des reconnaissances gérée par l'admin
--   - Virtuel : une fiche par personne (nommée sur scène dans toutes les salles)
--   - Sur place : un nombre par ville et par reconnaissance, par leader
-- Les leaders passent par le serveur (routes /api/reconnaissances) : les tables
-- ne sont lisibles et modifiables directement que par l'admin et le développeur.
-- =====================================================================

-- 1. Réglages sur l'événement
ALTER TABLE evenements
  ADD COLUMN IF NOT EXISTS a_reconnaissances boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS reconnaissances_date_limite date;   -- vide = jusqu'au début de l'événement

-- 2. Liste des reconnaissances (l'ordre = l'ordre sur la scène)
CREATE TABLE IF NOT EXISTS reconnaissance_types (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nom text NOT NULL,
  ordre integer NOT NULL DEFAULT 0,
  actif boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 3. Virtuel : une fiche par personne
CREATE TABLE IF NOT EXISTS reconnaissances_virtuel (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  evenement_id uuid NOT NULL REFERENCES evenements(id),
  leader_id uuid NOT NULL REFERENCES comptes(id),      -- le leader qui a fait l'entrée (propriétaire)
  compte_id uuid REFERENCES comptes(id),                -- le PCI choisi dans la liste (vide = écrit à la main)
  nom text NOT NULL,                                    -- Prénom et nom
  nom_2 text,                                           -- Co-PCI (optionnel)
  ville text,
  province text,
  pays text,
  type_ids uuid[] NOT NULL DEFAULT '{}',                -- reconnaissances cochées
  autre text,                                           -- « Autre » en texte libre
  created_at timestamptz NOT NULL DEFAULT now(),
  modifie_le timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS reconnaissances_virtuel_evenement_idx ON reconnaissances_virtuel (evenement_id);

-- 4. Sur place : un nombre par ville, par reconnaissance, par leader
CREATE TABLE IF NOT EXISTS reconnaissances_sur_place (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  evenement_id uuid NOT NULL REFERENCES evenements(id),
  leader_id uuid NOT NULL REFERENCES comptes(id),
  ville_id uuid REFERENCES evenement_villes(id),        -- vide = événement à une seule salle
  type_id uuid NOT NULL REFERENCES reconnaissance_types(id),
  nombre integer NOT NULL CHECK (nombre > 0),
  modifie_le timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS reconnaissances_sur_place_evenement_idx ON reconnaissances_sur_place (evenement_id);

-- 5. Sécurité : admin et développeur seulement (les leaders passent par le serveur)
ALTER TABLE reconnaissance_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE reconnaissances_virtuel ENABLE ROW LEVEL SECURITY;
ALTER TABLE reconnaissances_sur_place ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS reconnaissance_types_admin ON reconnaissance_types;
CREATE POLICY reconnaissance_types_admin ON reconnaissance_types
  FOR ALL USING (get_my_role() IN ('admin', 'developpeur')) WITH CHECK (get_my_role() IN ('admin', 'developpeur'));

DROP POLICY IF EXISTS reconnaissances_virtuel_admin ON reconnaissances_virtuel;
CREATE POLICY reconnaissances_virtuel_admin ON reconnaissances_virtuel
  FOR ALL USING (get_my_role() IN ('admin', 'developpeur')) WITH CHECK (get_my_role() IN ('admin', 'developpeur'));

DROP POLICY IF EXISTS reconnaissances_sur_place_admin ON reconnaissances_sur_place;
CREATE POLICY reconnaissances_sur_place_admin ON reconnaissances_sur_place
  FOR ALL USING (get_my_role() IN ('admin', 'developpeur')) WITH CHECK (get_my_role() IN ('admin', 'developpeur'));

-- 5b. Permissions des tables (sur ce projet Supabase, les nouvelles tables n'en reçoivent pas automatiquement)
GRANT ALL ON TABLE reconnaissance_types, reconnaissances_virtuel, reconnaissances_sur_place TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE reconnaissance_types, reconnaissances_virtuel, reconnaissances_sur_place TO authenticated;

-- 6. La liste de départ (seulement si la table est vide)
INSERT INTO reconnaissance_types (nom, ordre)
SELECT t.nom, t.ordre FROM (VALUES
  ('1re fois feuille 30 jours', 1), ('Feuille 90 jours', 2), ('4 à 6 overviews', 3),
  ('7 à 10 overviews', 4), ('11 à 15 overviews', 5), ('16 et plus overviews', 6),
  ('Aigle Start', 7), ('Aigle Dash', 8), ('Aigle Sprint', 9), ('Aigle', 10),
  ('Double aigle', 11), ('Triple aigle', 12), ('1000 pv', 13), ('2000 pv', 14),
  ('4000 pv', 15), ('7500 pv', 16), ('3 EN 90', 17), ('Démarrage en force', 18),
  ('Fondement Bronze', 19), ('Développeur Bronze', 20)
) AS t(nom, ordre)
WHERE NOT EXISTS (SELECT 1 FROM reconnaissance_types);

-- 7. VÉRIFICATION — doit afficher 20 reconnaissances, puis les 2 colonnes de l'événement
SELECT count(*) AS nombre_reconnaissances FROM reconnaissance_types;
SELECT column_name FROM information_schema.columns
WHERE table_name = 'evenements' AND column_name IN ('a_reconnaissances', 'reconnaissances_date_limite');
