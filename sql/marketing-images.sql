-- =====================================================================
-- Images bannières du courriel promo (page Marketing)
-- Bucket public « marketing » : l'image doit être accessible par Gmail/Outlook
-- Seuls l'admin et le développeur peuvent ajouter, modifier ou retirer une image
-- =====================================================================

-- 1. Bucket public, 5 Mo maximum, JPG / PNG / WebP seulement
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('marketing', 'marketing', true, 5242880,
        ARRAY['image/jpeg', 'image/png', 'image/webp'])
ON CONFLICT (id) DO UPDATE
  SET public = true,
      file_size_limit = EXCLUDED.file_size_limit,
      allowed_mime_types = EXCLUDED.allowed_mime_types;

-- 2. Règles d'accès
DROP POLICY IF EXISTS marketing_storage_insert ON storage.objects;
CREATE POLICY marketing_storage_insert ON storage.objects
  FOR INSERT WITH CHECK ((bucket_id = 'marketing') AND (get_my_role() IN ('admin', 'developpeur')));

DROP POLICY IF EXISTS marketing_storage_update ON storage.objects;
CREATE POLICY marketing_storage_update ON storage.objects
  FOR UPDATE USING ((bucket_id = 'marketing') AND (get_my_role() IN ('admin', 'developpeur')));

DROP POLICY IF EXISTS marketing_storage_delete ON storage.objects;
CREATE POLICY marketing_storage_delete ON storage.objects
  FOR DELETE USING ((bucket_id = 'marketing') AND (get_my_role() IN ('admin', 'developpeur')));

-- 3. VÉRIFICATION — doit afficher : marketing | true | 5242880
SELECT id, public, file_size_limit FROM storage.buckets WHERE id = 'marketing';
