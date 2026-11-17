-- ============================================================
-- Conférences LEADERSHIP (remplace « Platine+ seulement »)
-- À lancer UNE fois dans Supabase > SQL Editor
-- ============================================================

-- 1) Nouvelle case sur la fiche : accès aux conférences Leadership (non cochée par défaut)
ALTER TABLE comptes ADD COLUMN IF NOT EXISTS acces_leadership boolean NOT NULL DEFAULT false;

-- 2) Retirer l'ancienne règle qui n'acceptait que 'public' / 'platine' (s'il y en a une)
DO $$
DECLARE c record;
BEGIN
  FOR c IN
    SELECT conname FROM pg_constraint
    WHERE conrelid = 'public.evenements'::regclass AND contype = 'c'
      AND pg_get_constraintdef(oid) ILIKE '%acces%'
  LOOP
    EXECUTE format('ALTER TABLE evenements DROP CONSTRAINT %I', c.conname);
  END LOOP;
END $$;

-- 3) Les événements « platine » deviennent « leadership »
UPDATE evenements SET acces = 'leadership' WHERE acces = 'platine';

-- 4) Nouvelle règle : 'public' ou 'leadership'
ALTER TABLE evenements ADD CONSTRAINT evenements_acces_check CHECK (acces IN ('public', 'leadership'));

-- 5) Rafraîchir le cache de l'API
NOTIFY pgrst, 'reload schema';

-- Vérification
SELECT acces, count(*) FROM evenements GROUP BY acces;
