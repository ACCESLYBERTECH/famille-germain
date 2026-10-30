-- =====================================================================
-- UNICITÉ DES COMPTES : courriel et numéro Amway
-- À exécuter UNE FOIS dans Supabase > SQL Editor
--
-- S'il existe déjà des doublons, le script S'ARRÊTE sans rien modifier
-- et affiche la liste : corrigez-les dans Gestion PCI, puis relancez.
-- =====================================================================

-- 1. Vérifier les doublons (en ignorant majuscules, espaces et tirets)
DO $$
DECLARE doublons text;
BEGIN
  SELECT string_agg(liste, ' | ') INTO doublons FROM (
    SELECT 'Courriel ' || lower(trim(courriel)) || ' : ' || string_agg(prenom_1 || ' ' || nom_1, ', ') AS liste
    FROM public.comptes
    WHERE courriel IS NOT NULL AND trim(courriel) <> ''
    GROUP BY lower(trim(courriel)) HAVING count(*) > 1
    UNION ALL
    SELECT 'Amway ' || upper(regexp_replace(numero_amway, '[\s-]', '', 'g')) || ' : ' || string_agg(prenom_1 || ' ' || nom_1, ', ')
    FROM public.comptes
    WHERE numero_amway IS NOT NULL AND trim(numero_amway) <> ''
    GROUP BY upper(regexp_replace(numero_amway, '[\s-]', '', 'g')) HAVING count(*) > 1
  ) d;

  IF doublons IS NOT NULL THEN
    RAISE EXCEPTION 'DOUBLONS À CORRIGER AVANT DE CONTINUER : %', doublons;
  END IF;
END $$;

-- 2. Uniformiser les données existantes
UPDATE public.comptes SET courriel = lower(trim(courriel))
WHERE courriel IS NOT NULL AND courriel <> lower(trim(courriel));

UPDATE public.comptes SET numero_amway = upper(regexp_replace(numero_amway, '[\s-]', '', 'g'))
WHERE numero_amway IS NOT NULL AND numero_amway <> upper(regexp_replace(numero_amway, '[\s-]', '', 'g'));

UPDATE public.comptes SET numero_amway = NULL
WHERE numero_amway IS NOT NULL AND trim(numero_amway) = '';

-- 3. Interdire les doublons dans la base (même en cas de bogue)
CREATE UNIQUE INDEX IF NOT EXISTS comptes_courriel_minuscule_unique
  ON public.comptes (lower(courriel));

CREATE UNIQUE INDEX IF NOT EXISTS comptes_numero_amway_unique
  ON public.comptes (numero_amway)
  WHERE numero_amway IS NOT NULL;

-- 4. Sécurité : l'inscription se fait maintenant sur le serveur.
--    On retire le droit de créer sa propre fiche depuis le navigateur
--    (ce droit permettait, en théorie, de s'inscrire directement avec le rôle « admin »).
DROP POLICY IF EXISTS comptes_insert_own ON public.comptes;

-- 5. VÉRIFICATION
SELECT indexname FROM pg_indexes WHERE tablename = 'comptes' ORDER BY indexname;
