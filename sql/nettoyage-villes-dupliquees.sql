-- =====================================================================
-- NETTOYAGE — villes dupliquées dans les événements
-- À exécuter UNE FOIS dans Supabase > SQL Editor
-- Garde une seule ville par nom et par événement.
-- Ne supprime JAMAIS une ville liée à un portier ou à un billet scanné.
-- =====================================================================

-- 1. APERÇU : nombre de villes par événement (avant nettoyage)
SELECT e.nom AS evenement, v.nom_ville, count(*) AS nombre
FROM public.evenement_villes v
JOIN public.evenements e ON e.id = v.evenement_id
GROUP BY e.nom, v.nom_ville
HAVING count(*) > 1
ORDER BY e.nom;

-- 2. NETTOYAGE
WITH villes AS (
  SELECT v.id,
         (EXISTS (SELECT 1 FROM public.portiers_comptes p WHERE p.evenement_ville_id = v.id)
          OR EXISTS (SELECT 1 FROM public.billets b WHERE b.scanne_ville_id = v.id)) AS utilisee,
         row_number() OVER (
           PARTITION BY v.evenement_id, lower(trim(v.nom_ville))
           ORDER BY
             (EXISTS (SELECT 1 FROM public.portiers_comptes p WHERE p.evenement_ville_id = v.id)
              OR EXISTS (SELECT 1 FROM public.billets b WHERE b.scanne_ville_id = v.id)) DESC,
             v.created_at, v.id
         ) AS rang
  FROM public.evenement_villes v
)
DELETE FROM public.evenement_villes
WHERE id IN (SELECT id FROM villes WHERE rang > 1 AND NOT utilisee);

-- 3. VÉRIFICATION : doit retourner AUCUNE ligne
SELECT e.nom AS evenement, v.nom_ville, count(*) AS nombre
FROM public.evenement_villes v
JOIN public.evenements e ON e.id = v.evenement_id
GROUP BY e.nom, v.nom_ville
HAVING count(*) > 1;
