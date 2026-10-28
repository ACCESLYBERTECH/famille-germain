-- =====================================================================
-- SÉCURITÉ — Un leader ne peut plus lire les données des autres groupes
-- À exécuter UNE FOIS dans Supabase > SQL Editor
--
-- Le site n'utilise pas ces droits : la page Platines et plus, le scanner,
-- les rapports et les achats passent tous par le serveur (supabaseAdmin).
-- On retire donc les accès qui permettaient de lire la base directement
-- depuis le navigateur (F12).
-- =====================================================================


-- ---------------------------------------------------------------------
-- 1. comptes : chacun lit SEULEMENT son propre compte
--    (admin et développeur lisent tout, comme avant)
--    AVANT : tout leader pouvait lire TOUS les comptes
-- ---------------------------------------------------------------------
ALTER POLICY comptes_select ON public.comptes
  USING ((auth.uid() = id) OR (get_my_role() IN ('admin', 'developpeur')));


-- ---------------------------------------------------------------------
-- 2. billets_banquets : chacun lit SEULEMENT ses propres banquets
--    AVANT : tout leader et tout portier pouvaient lire TOUS les banquets
-- ---------------------------------------------------------------------
ALTER POLICY billets_banquets_select ON public.billets_banquets
  USING ((compte_id = auth.uid()) OR (get_my_role() = 'admin'));


-- ---------------------------------------------------------------------
-- 3. billets : le portier ne lit plus tous les billets directement
--    (le scanner passe maintenant par /api/scan/recherche côté serveur)
--    AVANT : tout portier pouvait lire TOUS les billets de TOUS les événements
-- ---------------------------------------------------------------------
DROP POLICY IF EXISTS billets_select_portier ON public.billets;


-- ---------------------------------------------------------------------
-- 4. get_groupe_ids : appelable seulement par le serveur
--    AVANT : n'importe qui de connecté pouvait demander le groupe
--    de n'importe quel leader
-- ---------------------------------------------------------------------
DO $$
DECLARE r record;
BEGIN
  FOR r IN
    SELECT p.oid::regprocedure AS signature
    FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.proname = 'get_groupe_ids'
  LOOP
    EXECUTE format('REVOKE EXECUTE ON FUNCTION %s FROM PUBLIC, anon, authenticated', r.signature);
    EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO service_role', r.signature);
  END LOOP;
END $$;


-- ---------------------------------------------------------------------
-- 5. Fichiers carrousel et photos de leaders : admin et développeur seulement
--    AVANT : n'importe qui de connecté pouvait ajouter, remplacer ou
--    supprimer des images du carrousel et des photos de leaders
-- ---------------------------------------------------------------------
ALTER POLICY carrousel_storage_insert ON storage.objects
  WITH CHECK ((bucket_id = 'carrousel') AND (get_my_role() IN ('admin', 'developpeur')));
ALTER POLICY carrousel_storage_update ON storage.objects
  USING ((bucket_id = 'carrousel') AND (get_my_role() IN ('admin', 'developpeur')));
ALTER POLICY carrousel_storage_delete ON storage.objects
  USING ((bucket_id = 'carrousel') AND (get_my_role() IN ('admin', 'developpeur')));

ALTER POLICY leaders_photos_insert ON storage.objects
  WITH CHECK ((bucket_id = 'leaders-photos') AND (get_my_role() IN ('admin', 'developpeur')));
ALTER POLICY leaders_photos_update ON storage.objects
  USING ((bucket_id = 'leaders-photos') AND (get_my_role() IN ('admin', 'developpeur')));
ALTER POLICY leaders_photos_delete ON storage.objects
  USING ((bucket_id = 'leaders-photos') AND (get_my_role() IN ('admin', 'developpeur')));


-- ---------------------------------------------------------------------
-- 6. VÉRIFICATION — affiche les règles modifiées
--    Le mot 'leader' ne doit plus apparaître dans les 2 premières lignes
-- ---------------------------------------------------------------------
SELECT tablename, policyname, qual
FROM pg_policies
WHERE policyname IN ('comptes_select', 'billets_banquets_select', 'billets_select_portier')
ORDER BY tablename;
