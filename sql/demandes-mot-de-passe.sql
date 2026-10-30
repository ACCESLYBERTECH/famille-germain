-- =====================================================================
-- MOT DE PASSE OUBLIÉ — limite d'envoi (1 courriel par adresse par minute)
-- À exécuter UNE FOIS dans Supabase > SQL Editor
-- Table utilisée seulement par le serveur (aucun accès depuis le navigateur)
-- =====================================================================

CREATE TABLE IF NOT EXISTS public.demandes_mot_de_passe (
  courriel         text PRIMARY KEY,
  derniere_demande timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.demandes_mot_de_passe ENABLE ROW LEVEL SECURITY;
-- Aucune règle : seul le serveur (service_role) y a accès
GRANT SELECT, INSERT, UPDATE, DELETE ON public.demandes_mot_de_passe TO service_role;

-- VÉRIFICATION
SELECT count(*) AS demandes FROM public.demandes_mot_de_passe;
