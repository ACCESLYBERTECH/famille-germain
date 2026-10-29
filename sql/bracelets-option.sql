-- =====================================================================
-- OPTION « AVEC BRACELETS » par événement
-- À exécuter UNE FOIS dans Supabase > SQL Editor
-- Les événements existants avec banquet restent « avec bracelets »
-- =====================================================================

ALTER TABLE public.evenements
  ADD COLUMN IF NOT EXISTS a_bracelets boolean DEFAULT true;

-- VÉRIFICATION
SELECT nom, a_banquet, a_bracelets FROM public.evenements ORDER BY date_debut DESC;
