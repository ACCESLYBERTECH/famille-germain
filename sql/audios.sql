-- =====================================================================
-- AUDIOS — réservés aux nouveaux PCI pendant leur période sans frais
-- À exécuter UNE FOIS dans Supabase > SQL Editor
--
-- Fichiers dans un espace PRIVÉ (bucket « audios ») : jamais de lien public.
-- Les PCI reçoivent un lien temporaire généré par le serveur.
-- =====================================================================

-- 1. Catégories
CREATE TABLE IF NOT EXISTS public.audio_categories (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nom        text NOT NULL,
  ordre      integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 2. Audios
CREATE TABLE IF NOT EXISTS public.audios (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  categorie_id uuid REFERENCES public.audio_categories(id) ON DELETE SET NULL,
  titre        text NOT NULL,
  description  text,
  chemin       text NOT NULL,          -- chemin du fichier dans le bucket « audios »
  taille       bigint,
  ordre        integer NOT NULL DEFAULT 0,
  actif        boolean NOT NULL DEFAULT true,
  created_at   timestamptz NOT NULL DEFAULT now()
);

-- 3. Sécurité : seuls l'admin et le développeur lisent/écrivent directement.
--    Les PCI passent par le serveur (vérification de la période sans frais).
ALTER TABLE public.audio_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audios ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS audio_categories_admin ON public.audio_categories;
CREATE POLICY audio_categories_admin ON public.audio_categories
  FOR ALL USING (get_my_role() IN ('admin', 'developpeur'))
  WITH CHECK (get_my_role() IN ('admin', 'developpeur'));

DROP POLICY IF EXISTS audios_admin ON public.audios;
CREATE POLICY audios_admin ON public.audios
  FOR ALL USING (get_my_role() IN ('admin', 'developpeur'))
  WITH CHECK (get_my_role() IN ('admin', 'developpeur'));

GRANT SELECT, INSERT, UPDATE, DELETE ON public.audio_categories TO authenticated, service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.audios TO authenticated, service_role;

-- 4. Espace de stockage PRIVÉ (50 Mo max par fichier, MP3 et WAV seulement)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('audios', 'audios', false, 52428800,
        ARRAY['audio/mpeg', 'audio/mp3', 'audio/wav', 'audio/x-wav', 'audio/wave', 'audio/vnd.wave'])
ON CONFLICT (id) DO UPDATE
  SET public = false,
      file_size_limit = EXCLUDED.file_size_limit,
      allowed_mime_types = EXCLUDED.allowed_mime_types;

DROP POLICY IF EXISTS audios_storage_select ON storage.objects;
CREATE POLICY audios_storage_select ON storage.objects
  FOR SELECT USING ((bucket_id = 'audios') AND (get_my_role() IN ('admin', 'developpeur')));

DROP POLICY IF EXISTS audios_storage_insert ON storage.objects;
CREATE POLICY audios_storage_insert ON storage.objects
  FOR INSERT WITH CHECK ((bucket_id = 'audios') AND (get_my_role() IN ('admin', 'developpeur')));

DROP POLICY IF EXISTS audios_storage_update ON storage.objects;
CREATE POLICY audios_storage_update ON storage.objects
  FOR UPDATE USING ((bucket_id = 'audios') AND (get_my_role() IN ('admin', 'developpeur')));

DROP POLICY IF EXISTS audios_storage_delete ON storage.objects;
CREATE POLICY audios_storage_delete ON storage.objects
  FOR DELETE USING ((bucket_id = 'audios') AND (get_my_role() IN ('admin', 'developpeur')));

-- 5. VÉRIFICATION — le bucket doit être « public = false »
SELECT id, public, file_size_limit FROM storage.buckets WHERE id = 'audios';
