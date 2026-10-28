-- =====================================================================
-- RÔLE DÉVELOPPEUR — ACCESLYBERTECH
-- À exécuter UNE FOIS dans Supabase > SQL Editor
--
-- Le développeur a accès à : Gestion PCI, Gestion événements, Portiers,
-- Documents, Carrousel, Marketing, Scanner.
-- AUCUNE règle n'est ajoutée sur les tables billets et billets_banquets :
-- le développeur ne peut jamais les lire directement.
-- =====================================================================


-- ---------------------------------------------------------------------
-- 1. Autoriser la valeur 'developpeur' dans comptes.role
--    (retire l'ancienne contrainte sur le rôle s'il y en a une, puis la recrée)
-- ---------------------------------------------------------------------
DO $$
DECLARE r record;
BEGIN
  FOR r IN
    SELECT conname FROM pg_constraint
    WHERE conrelid = 'public.comptes'::regclass
      AND contype = 'c'
      AND pg_get_constraintdef(oid) ILIKE '%role%'
  LOOP
    EXECUTE format('ALTER TABLE public.comptes DROP CONSTRAINT %I', r.conname);
  END LOOP;
END $$;

ALTER TABLE public.comptes
  ADD CONSTRAINT comptes_role_check
  CHECK (role IN ('pci', 'leader', 'portier', 'admin', 'developpeur'));


-- ---------------------------------------------------------------------
-- 2. comptes — lecture + modification protégée
-- ---------------------------------------------------------------------
ALTER POLICY comptes_select ON public.comptes
  USING ((auth.uid() = id) OR (get_my_role() IN ('admin', 'developpeur', 'leader')));

-- Le développeur peut modifier les comptes (approuver, refuser, etc.)
-- SAUF les comptes admin/développeur, et il ne peut jamais donner ces rôles.
DROP POLICY IF EXISTS comptes_update_developpeur ON public.comptes;
CREATE POLICY comptes_update_developpeur ON public.comptes
  FOR UPDATE
  USING (get_my_role() = 'developpeur' AND role NOT IN ('admin', 'developpeur'))
  WITH CHECK (get_my_role() = 'developpeur' AND role NOT IN ('admin', 'developpeur'));


-- ---------------------------------------------------------------------
-- 3. Événements, paliers, villes
-- ---------------------------------------------------------------------
ALTER POLICY evenements_all_admin ON public.evenements
  USING (get_my_role() IN ('admin', 'developpeur'));

ALTER POLICY paliers_all_admin ON public.evenement_paliers
  USING (get_my_role() IN ('admin', 'developpeur'));

ALTER POLICY villes_all_admin ON public.evenement_villes
  USING (get_my_role() IN ('admin', 'developpeur'));


-- ---------------------------------------------------------------------
-- 4. Documents (table + fichiers)
-- ---------------------------------------------------------------------
ALTER POLICY documents_all_admin ON public.documents
  USING (get_my_role() IN ('admin', 'developpeur'));

ALTER POLICY documents_select ON public.documents
  USING ((actif = true) AND ((section = 'pci') OR ((section = 'platine') AND (get_my_role() IN ('leader', 'admin', 'developpeur')))));

ALTER POLICY documents_upload_admin ON storage.objects
  WITH CHECK ((bucket_id = 'documents') AND (get_my_role() IN ('admin', 'developpeur')));

ALTER POLICY documents_delete_admin ON storage.objects
  USING ((bucket_id = 'documents') AND (get_my_role() IN ('admin', 'developpeur')));


-- ---------------------------------------------------------------------
-- 5. Carrousel
-- ---------------------------------------------------------------------
ALTER POLICY carrousel_images_insert ON public.carrousel_images
  WITH CHECK (get_my_role() IN ('admin', 'developpeur'));

ALTER POLICY carrousel_images_update ON public.carrousel_images
  USING (get_my_role() IN ('admin', 'developpeur'));

ALTER POLICY carrousel_images_delete ON public.carrousel_images
  USING (get_my_role() IN ('admin', 'developpeur'));


-- ---------------------------------------------------------------------
-- 6. VÉRIFICATION — doit retourner AUCUNE ligne
--    (aucune règle sur billets / billets_banquets ne mentionne developpeur)
-- ---------------------------------------------------------------------
SELECT tablename, policyname
FROM pg_policies
WHERE tablename IN ('billets', 'billets_banquets')
  AND (coalesce(qual, '') ILIKE '%developpeur%' OR coalesce(with_check, '') ILIKE '%developpeur%');


-- =====================================================================
-- CRÉATION DU COMPTE DÉVELOPPEUR (à faire APRÈS l'inscription du compte)
-- 1. Inscris-toi normalement sur le site avec le courriel du compte développeur
-- 2. Remplace le courriel ci-dessous, puis exécute :
-- =====================================================================
-- UPDATE public.comptes
-- SET role = 'developpeur', statut = 'actif', leader_id = NULL, visible_inscription = false
-- WHERE courriel = 'courriel-du-developpeur@exemple.com';
