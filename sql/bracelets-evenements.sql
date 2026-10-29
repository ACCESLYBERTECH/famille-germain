-- =====================================================================
-- COULEURS DES BRACELETS — par événement (congrès avec banquet)
-- À exécuter UNE FOIS dans Supabase > SQL Editor
-- Les événements existants reçoivent les couleurs actuelles (Bleu, Vert, Or)
-- =====================================================================

ALTER TABLE public.evenements
  ADD COLUMN IF NOT EXISTS bracelet_regulier_couleur        text DEFAULT '#2E86C1',
  ADD COLUMN IF NOT EXISTS bracelet_regulier_nom            text DEFAULT 'Bleu',
  ADD COLUMN IF NOT EXISTS bracelet_sf_banquet_couleur      text DEFAULT '#4CAF7D',
  ADD COLUMN IF NOT EXISTS bracelet_sf_banquet_nom          text DEFAULT 'Vert',
  ADD COLUMN IF NOT EXISTS bracelet_sf_sans_banquet_couleur text DEFAULT '#C9A84C',
  ADD COLUMN IF NOT EXISTS bracelet_sf_sans_banquet_nom     text DEFAULT 'Or';

-- VÉRIFICATION
SELECT nom, a_banquet,
       bracelet_regulier_nom, bracelet_sf_banquet_nom, bracelet_sf_sans_banquet_nom
FROM public.evenements
ORDER BY date_debut DESC;
