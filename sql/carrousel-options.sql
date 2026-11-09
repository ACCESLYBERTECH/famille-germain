-- =====================================================================
-- Carrousel : bouton sur l'image, dates d'affichage et masquer sans supprimer
-- =====================================================================

ALTER TABLE carrousel_images
  ADD COLUMN IF NOT EXISTS texte_bouton text,          -- ex. « Acheter mon billet » (vide = petit indicateur 🔗)
  ADD COLUMN IF NOT EXISTS date_debut date,            -- visible à partir de cette date (vide = tout de suite)
  ADD COLUMN IF NOT EXISTS date_fin date,              -- visible jusqu'à cette date incluse (vide = toujours)
  ADD COLUMN IF NOT EXISTS visible boolean NOT NULL DEFAULT true;  -- false = caché sans être supprimé

-- VÉRIFICATION — doit afficher les 4 nouvelles colonnes
SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_name = 'carrousel_images'
  AND column_name IN ('texte_bouton', 'date_debut', 'date_fin', 'visible')
ORDER BY column_name;
