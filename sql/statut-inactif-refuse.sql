-- =====================================================================
-- STATUTS DE COMPTE — ajoute 'refuse' (demandes d'inscription refusées)
-- À exécuter UNE FOIS dans Supabase > SQL Editor
--
-- en_attente : inscription pas encore traitée
-- actif      : compte normal
-- inactif    : retiré des listes actives (billets et historique conservés)
-- refuse     : demande d'inscription refusée par l'administrateur
-- =====================================================================

-- 1. Retirer l'ancienne contrainte sur le statut (s'il y en a une) et la recréer
DO $$
DECLARE r record;
BEGIN
  FOR r IN
    SELECT conname FROM pg_constraint
    WHERE conrelid = 'public.comptes'::regclass
      AND contype = 'c'
      AND pg_get_constraintdef(oid) ILIKE '%statut%'
  LOOP
    EXECUTE format('ALTER TABLE public.comptes DROP CONSTRAINT %I', r.conname);
  END LOOP;
END $$;

ALTER TABLE public.comptes
  ADD CONSTRAINT comptes_statut_check
  CHECK (statut IN ('en_attente', 'actif', 'inactif', 'refuse'));


-- 2. VÉRIFICATION — liste des comptes déjà inactifs
--    Avant aujourd'hui, le bouton « Refuser » mettait le statut à 'inactif'.
--    Si des comptes de cette liste sont en fait des inscriptions refusées,
--    envoie la liste à Claude pour les passer à 'refuse'.
SELECT prenom_1, nom_1, courriel, role, periode_sf_debut, created_at
FROM public.comptes
WHERE statut = 'inactif' AND role IN ('pci', 'leader')
ORDER BY created_at;
