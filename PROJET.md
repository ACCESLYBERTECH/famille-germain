# PROJET ACCESLYBERTECH — Famille Germain Yager Group

## Vue d'ensemble
Plateforme web privée full-stack pour la gestion des événements, billets, membres et communications du réseau PCI Famille Germain – Yager Group (Amway).

## Informations générales
- **Client :** Famille Germain – Yager Group
- **Développeur :** Mario
- **GitHub :** Org `ACCESLYBERTECH`, repo `famille-germain` (public)
- **Production :** https://famille-germain.vercel.app
- **Domaine acheté :** acceslybertech.com (hébergé WHC — à configurer en dernière étape)

---

## Stack technique
- **Frontend/Backend :** Next.js 16.2.7 (TypeScript, App Router, Tailwind CSS, src/)
- **Base de données :** Supabase (Auth + PostgreSQL + Storage)
- **Paiements :** Stripe (deux comptes séparés : billets + banquets)
- **Emails :** Resend (domaine acceslybertech.com vérifié dans WHC DNS)
- **Déploiement :** Vercel (Hobby plan, repo public)
- **IDE :** VS Code avec terminal intégré, Windows

---

## Couleurs de marque
```
Navy  : #1A2535
Gold  : #C9A84C
Cream : #F5F3EE
Green : #4CAF7D
Blue  : #2E86C1
Red   : #E57373
```

---

## Terminologie imposée
- **"PCI"** — jamais "membre"
- **"sans frais"** — jamais "gratuit"
- **"Billet offert"** — billet gratuit donné par l'admin
- **"HE"** — Heure de l'Est
- **"Yager Group"** — jamais traduit

---

## Rôles utilisateurs
- `pci` — membre standard
- `leader` — leader avec accès Platines et plus
- `portier` — compte indépendant pour scanner les billets
- `admin` — accès complet à tout
- `developpeur` — compte séparé du développeur (Mario). Voir section « Rôle développeur »

## Statuts de compte (`comptes.statut`)
- `en_attente` — inscription pas encore traitée
- `actif` — compte normal
- `inactif` — retiré des listes actives ; **billets, banquets et historique conservés**. Peut se connecter et voir « Mes billets », ne peut plus acheter. Leader inactif = plus d'accès à Platines et plus
- `refuse` — inscription refusée (bouton Refuser)
- Contrainte SQL `comptes_statut_check`
- **Ne jamais effacer un PCI** : on le rend Inactif (historique des ventes avec les noms)

---

## Variables d'environnement (.env.local)
```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# Stripe — Billets (compte principal)
STRIPE_SECRET_KEY=
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=
STRIPE_WEBHOOK_SECRET=

# Stripe — Banquet (compte séparé)
STRIPE_BANQUET_SECRET_KEY=
NEXT_PUBLIC_STRIPE_BANQUET_PUBLISHABLE_KEY=
STRIPE_BANQUET_PUBLISHABLE_KEY=
STRIPE_BANQUET_WEBHOOK_SECRET=

RESEND_API_KEY=
NEXT_PUBLIC_APP_URL=https://famille-germain.vercel.app
```

---

## Base de données Supabase — Tables principales

### comptes
```sql
id UUID, courriel, role ('pci'|'leader'|'portier'|'admin'|'developpeur'), prenom_1, nom_1, prenom_2, nom_2,
numero_amway, date_inscription_amway, adresse, ville, province,
pays, code_postal, telephone, leader_id, statut,
periode_sf_debut, periode_sf_fin, consentement_communications,
groupe, photo_url, visible_inscription BOOLEAN DEFAULT true,
created_at
-- statut : 'en_attente'|'actif'|'inactif'|'refuse'
```

### evenements
```sql
id UUID, nom, description, date_debut, date_fin, lieu,
acces ('public'|'platine'), a_billets, a_banquet,
stripe_account ('principal'|'banquet'), statut, created_at
```

### evenement_paliers
```sql
id UUID, evenement_id, prix, date_fin, ordre, created_at
```

### evenement_villes
```sql
id UUID, evenement_id, nom_ville, ordre, created_at
```

### billets
```sql
id UUID, evenement_id, compte_id, nom_pci, leader_id,
est_sans_frais, offert_par_admin, prix_paye, tps, tvq,
frais_stripe, prix_total, allergies TEXT, mode_participation TEXT DEFAULT 'sur_place',
stripe_payment_intent_id, stripe_refund_id, qr_code_token UNIQUE,
statut ('vendu'|'utilise'|'rembourse'), scanne_le, scanne_ville_id,
scanne_par_id, rembourse_le, rembourse_par, created_at
```

### banquets
```sql
id UUID, evenement_id, nom, prix, statut DEFAULT 'actif', cree_at
```

### billets_banquets
```sql
id UUID, billet_id, banquet_id, compte_id, nom_pci,
prix_paye, tps, tvq, frais_stripe, prix_total,
allergies TEXT, stripe_payment_intent_id, qr_code_token UNIQUE,
statut DEFAULT 'vendu', cree_at
```

### portiers_comptes
```sql
id UUID, compte_id, identifiant, nom_affichage, actif,
evenement_id, evenement_ville_id, created_at
```

### carrousel_images
```sql
id UUID, url, ordre, lien, cree_at
```

---

## Structure des fichiers clés

### Pages
```
src/app/
├── page.tsx                          — Dashboard admin ou redirect
├── accueil/page.tsx                  — Page d'accueil PCI/leader (carrousel + photo leader)
├── connexion/page.tsx                — Login avec logos navy en-tête
├── inscription/page.tsx              — Inscription 4 étapes
├── inscription/merci/page.tsx        — Page de remerciement
├── mot-de-passe-oublie/page.tsx
├── reinitialiser-mot-de-passe/page.tsx
├── conditions/page.tsx
├── evenements/
│   ├── page.tsx                      — Liste événements PCI
│   ├── ListeEvenements.tsx
│   ├── achat/page.tsx                — Achat billet
│   ├── achat/FormulaireAchat.tsx     — Allergies par personne si banquet
│   ├── confirmation/page.tsx
│   ├── achat-banquet/page.tsx        — Achat banquet (sans frais)
│   ├── achat-banquet/FormulaireAchatBanquet.tsx
│   ├── confirmation-banquet/page.tsx
│   └── mes-billets/
│       ├── page.tsx
│       └── MesBilletsClient.tsx      — QR zoom, factures PDF
├── documents/page.tsx
├── contact/page.tsx
├── scan/
│   ├── page.tsx
│   └── ScanInterface.tsx             — Recherche et stats via API serveur (plus de lecture directe de billets)
├── admin/
│   ├── page.tsx                      — Dashboard admin avec stats live
│   ├── pci/page.tsx + GestionPCI.tsx — Recherche, filtres, orphelins, ajout manuel
│   ├── evenements/
│   │   ├── page.tsx
│   │   ├── GestionEvenements.tsx
│   │   └── FormulaireEvenement.tsx   — Config banquet via API
│   ├── billets/page.tsx + GestionBillets.tsx
│   ├── banquets/page.tsx + GestionBanquets.tsx — Rapport banquets + Excel + PDF
│   ├── portiers/page.tsx + GestionPortiers.tsx
│   ├── documents/page.tsx + GestionDocuments.tsx
│   ├── carrousel/page.tsx + AdminCarrouselClient.tsx
│   └── marketing/page.tsx + GestionMarketing.tsx — Envoi promo courriels par événement
└── leader/
    └── platines-et-plus/page.tsx + PlatinesEtPlus.tsx
```

### API Routes
```
src/app/api/
├── auth/resoudre-identifiant/route.ts
├── scan/
│   ├── route.ts                         — Portier / admin / développeur
│   ├── recherche/route.ts               — Recherche billet par nom (serveur)
│   └── stats/route.ts                   — Nb de scans par ville (admin / développeur)
├── public/leaders/route.ts              — Filtre visible_inscription=true
├── stripe/
│   ├── create-payment-intent/route.ts   — TPS/TVQ/gross-up, allergies par personne, modes
│   └── create-payment-intent-banquet/route.ts
├── admin/
│   ├── modifier-compte/route.ts
│   ├── creer-pci/route.ts              — Création manuelle + email bienvenue (déplacé dans api/ — corrigeait un 404)
│   ├── portiers/route.ts
│   ├── rapport-excel/route.ts
│   ├── banquet/route.ts                — CRUD banquets via supabaseAdmin (contourne RLS)
│   ├── rapport-banquets-excel/route.ts
│   ├── rapport-banquets-pdf/route.ts   — HTML imprimable Lettre paysage + Imprimer/Envoyer
│   ├── rapport-banquets-envoyer/route.ts — Envoi PDF en pièce jointe (Resend)
│   └── marketing/
│       ├── envoyer/route.ts            — Envoi promo à tous les PCI/leaders actifs+consentants
│       └── test/route.ts               — Envoi de test à l'admin connecté
├── billets/offrir/route.ts
├── remboursement/route.ts
├── facture/billet/route.ts             — PDF @react-pdf/renderer
├── leader/modifier-groupe/route.ts
├── leader/modifier-statut/route.ts     — Leader rend Actif/Inactif un PCI de son groupe
└── emails/
    ├── bienvenue-pci/route.ts
    ├── confirmation-billet-offert/route.ts
    └── notification-admin/route.ts
```

### Composants
```
src/components/
├── Navbar.tsx                          — Sticky, logos, menu Gestion admin
├── QRCode.tsx
├── CarrouselAccueil.tsx
├── NonAccessibleDeveloppeur.tsx        — Page 🔒 « Non accessible au développeur »
├── CompteNonActif.tsx                  — Message selon statut (en attente / inactif / refusé)
├── FiltreGroupe.tsx                    — Filtre par groupe (variantes regroupées)
└── BoutonPartager.tsx                  — Partage d'un document (menu du téléphone / copie du lien)

src/lib/
├── acces.ts                            — estAdmin, estDeveloppeur, estAdminOuDeveloppeur, peutScanner
├── allergies.ts                        — formaterAllergies (2 formats JSON)
├── rapportBanquets.ts / rapportBanquetsPDF.ts
├── types.ts
└── email.ts

sql/                                    — Scripts SQL exécutés dans Supabase (historique)
├── role-developpeur.sql
├── securite-rls-leaders.sql
└── statut-inactif-refuse.sql
```

---

## Fonctionnalités complétées ✅

### Auth & Navigation
- Inscription 4 étapes (province dynamique, dropdown leaders filtrés, conditions d'utilisation)
- Connexion avec logos Germain + Yager en en-tête navy
- Mot de passe oublié / réinitialisation
- Navbar sticky avec logos, menu déroulant "Gestion" admin
- Page de remerciement après inscription

### Rôle développeur (Session 7)
- Compte séparé, rôle `developpeur` (assigné par SQL ou par l'admin dans Gestion PCI)
- **Accès 100 %** : Gestion PCI, Gestion événements, Portiers, Documents, Carrousel, Marketing, Scanner
- **Tableau de bord** : visible, chiffres masqués « ••• », case Derniers billets 🔒
- **Non accessible** (page 🔒 avec message, menus quand même visibles) : Gestion billets, Rapport banquets, Platines et plus
- Exports, remboursement, offrir un billet : réservés à l'admin
- Garde-fou : le développeur ne peut pas modifier un compte admin/développeur ni donner ces rôles (code + RLS `comptes_update_developpeur`)
- Aucune règle RLS sur `billets` / `billets_banquets` pour le développeur

### Gestion PCI (Admin)
- Liste PCI actifs avec recherche (nom, courriel, # Amway)
- Filtre par leader + détection orphelins (badge ⚠️ Sans leader)
- Bouton alerte orange cliquable si orphelins existent
- Modal modification complet
- **Ajout manuel de PCI** avec mot de passe temporaire + email bienvenue
- Approbation/refus des PCI en attente (refus → statut `refuse`)
- **Onglet PCI inactifs** + choix ● Actif ○ Inactif dans la fenêtre Modifier
- Photo leader (bucket `leaders-photos`)
- **Visibilité leader : Régulier / Invisible** (caché du dropdown inscription et du carrousel)
- Badge 👁️ Invisible dans la liste admin

### Événements
- Création/édition/duplication/activation
- Paliers de prix automatiques (max 4)
- Multi-villes
- Toggle `a_billets` / `a_banquet`
- **Configuration banquet (nom + prix) via API supabaseAdmin** (contourne RLS)
- Badges Session/Congrès/Banquet/Platine
- Countdown jours restants
- Description avec Voir plus/moins

### Paiements
- TPS (5%) + TVQ (9.975%) sur billets payants
- Frais Stripe gross-up : `(sous-total + taxes + 0.30) / (1 - 0.029)`
- Stripe principal pour billets, Stripe séparé pour banquets
- Confirmation Stripe avec sauvegarde taxes dans BD
- Remboursement 100% admin (non remboursable pour banquets)
- Carte test : `4242 4242 4242 4242`

### Système Banquet
- Banquet lié à un événement (table `banquets`)
- Disponible aux PCI sans frais après achat du billet dans page Événements
- Achat séparé avec Stripe banquet
- 3 résultats de scan :
  - 🔵 Billet régulier (payant — banquet inclus)
  - 🟢 Sans frais avec banquet
  - 🟡 Sans frais sans banquet
- Non remboursable
- Indicateur "Avec/Sans banquet" dans Gestion billets et Platines et plus (si événement a banquet)
- Légende bracelets dans scanner si événement avec banquet

### Allergies alimentaires
- **Billets payants avec banquet** : demandées à l'étape 1.5, **une section par personne** (Claude / Véronique séparés)
- **Achat du banquet sans frais** : demandées dans FormulaireAchatBanquet
- Options : Noix/arachides, Gluten, Lactose, Œufs, Poisson, Crustacés, Végétarien, Végétalien + texte libre
- Stockées dans `billets.allergies` (JSON **par personne** : `{"Claude": ["…"]}`) et `billets_banquets.allergies` (JSON **liste** : `["…"]`)
- **Toujours formater avec `formaterAllergies()` de `src/lib/allergies.ts`** (gère les 2 formats ; jamais `JSON.parse(...).join()`)
- Les libellés contiennent des émojis (🌾 🥛 🥜…) : à retirer dans les PDF

### Mode participation
- Question Sur place / Virtuel par personne à l'achat
- Affiché sous chaque nom coché individuellement
- Stocké dans `billets.mode_participation`
- Stats par événement dans Gestion billets et Platines et plus
- Filtre Sur place / Virtuel dans Gestion billets
- Un billet Virtuel peut quand même être scanné à la porte

### Bracelets (congrès avec banquet)
- Case **🎗️ Avec bracelets** dans la config du banquet (`evenements.a_bracelets`, défaut true)
- 3 couleurs + noms par événement : `bracelet_regulier_*`, `bracelet_sf_banquet_*`, `bracelet_sf_sans_banquet_*` (`_couleur`, `_nom`)
- Formulaire : 15 pastilles cliquables + couleur libre + « Nom affiché » ; copiés à la duplication
- Scanner : résultat dans la couleur du bracelet + « 🎗️ BRACELET ROUGE » ; texte noir auto sur couleur pâle
- Sans bracelets : couleurs standard (bleu/vert/or), « Légende des billets », aucune mention de bracelet
- Logique : `src/lib/bracelets.ts`

### Groupes (sous-groupes des leaders)
- Champ libre `comptes.groupe` (modifiable par le leader dans Platines et plus). Exemple affiché : « Ex: GROUPEA, EQUIPE-1... »
- Filtre Groupe (liste déroulante, liée au filtre Leader) : Gestion billets (+ colonne CSV), Rapport banquets (+ PDF, envoi, Excel), Gestion PCI, Platines et plus
- Variantes regroupées (casse/espaces) : `src/lib/groupes.ts` + composant `src/components/FiltreGroupe.tsx`

### Audios (nouveaux PCI)
- Page `/audios` visible seulement par un PCI/leader **actif en période sans frais** (lien du menu caché sinon) — `src/lib/audios.ts` (`aAccesAudios`)
- Écoute seulement (`controlsList="nodownload"`, pas de clic droit), un seul audio à la fois
- Bucket Storage **privé** `audios` (50 Mo max, MP3/WAV) — liens signés de 3 h générés côté serveur
- Tables `audio_categories` et `audios` (RLS admin + développeur) — SQL : `sql/audios.sql`
- Admin `/admin/audios` : catégories (ajouter, renommer, ordre, effacer), audios (ajouter, modifier, ordre, activer/désactiver, effacer)
- ⚠️ Plan gratuit Supabase : 1 Go de stockage, 5 Go de bande passante/mois — privilégier le MP3 « voix »

### QR Codes & Scan
- QR code unique par billet (`qr_code_token`)
- Scanner portier avec étape de confirmation obligatoire
- Recherche manuelle par nom
- 3 couleurs de résultat pour banquet
- Légende bracelets si événement avec banquet
- Stats par ville (admin seulement)

### Mes billets (PCI)
- Liste billets actifs (30 jours après l'événement)
- Zoom QR code en modal
- Bouton 📄 Télécharger la facture (billets payants)
- Bouton 📄 Facture pour banquets achetés

### Factures PDF
- Générées à la volée avec `@react-pdf/renderer`
- Numéro : `BIL-XXXXXXXX` ou `BAN-XXXXXXXX`
- Détail : sous-total, TPS, TVQ, frais Stripe, total, badge PAYÉ
- API : `/api/facture/billet?billet_id=X&type=billet|banquet`

### Rapport Banquets (Admin)
- Page `/admin/banquets` dans menu Gestion
- 3 types affichés : Régulier (banquet inclus), SF avec banquet, SF sans banquet
- Filtres : événement, leader, statut banquet (cliquables depuis stats)
- **Export Excel** (SheetJS/xlsx) — 3 feuilles : Rapport complet, Résumé, Allergies seulement
- **Rapport PDF** — HTML dans nouvel onglet, **Lettre paysage**, boutons 🖨️ Imprimer et 📧 Envoyer
- **Envoi par courriel** : PDF en pièce jointe (`@react-pdf`, sans courriels des PCI) à un leader actif (liste) ou à un courriel saisi — admin seulement
- Données partagées : `src/lib/rapportBanquets.ts` ; PDF : `src/lib/rapportBanquetsPDF.ts` (retire les émojis, police Helvetica)

### Page d'accueil
- Carrousel avec photo leader côte-à-côte (fond navy)
- Images admin uploadables avec liens cliquables
- Bouton Pause/Play
- Leader invisible → pas de photo affichée

### Admin Carrousel
- Upload, drag-and-drop ordre, liens par image
- Bucket `carrousel` dans Supabase Storage

### Platines et plus (Leader)
- Billets du groupe + billets personnels du leader
- Filtre par leader, événement, groupe
- Indicateur banquet + mode participation
- Stats Sur place/Virtuel par événement
- Export CSV avec colonnes Banquet et Mode
- Onglet Profils PCI avec modification du groupe
- **Onglet PCI inactifs** + statut Actif/Inactif dans le Profil (pas pour soi-même ; vérification du groupe côté serveur)
- Billets des PCI inactifs toujours affichés et comptés

### Gestion Billets (Admin)
- Filtres : statut, événement, leader, mode participation
- Recherche par nom/courriel/# Amway
- Stats Sur place/Virtuel par événement
- Export CSV + Rapport Excel par email
- Offrir un billet (avec email de confirmation)
- Remboursement Stripe

### Portiers
- Comptes indépendants (table `portiers_comptes`)
- Identifiant format : `PORTIER1-LONGUEUIL`
- Assignés à un événement + ville
- Login via `/api/auth/resoudre-identifiant` (dans publicRoutes)

### Documents
- Upload PDF dans Supabase Storage (bucket `documents`)
- Sections : Documents PCI, Documents Platine+
- Types : pdf, lien, youtube
- **Bouton 📤 Partager — section Platine+ seulement** (`src/components/BoutonPartager.tsx`) : sur écran tactile, menu de partage du téléphone (`navigator.share`, https requis) ; sur ordinateur, copie le lien (« Lien copié ✓ »)
- ⚠️ Le bucket `documents` est public : un lien partagé s'ouvre même sans compte

### Emails (Resend) — refonte Session 7
- **Gabarit commun** `src/emails/Gabarit.tsx` : en-tête marine avec les 2 logos (`NEXT_PUBLIC_APP_URL/logo-*.png`), filet or, texte aéré, bouton or, pied de page
- Composants : `Paragraphe`, `Bouton`, `Encadre`, `LigneEncadre`, `Note`, `Separateur` — tout nouveau courriel doit utiliser ce gabarit
- **Mot de passe oublié envoyé par le site** (plus par Supabase) : `/api/auth/mot-de-passe-oublie` → `auth.admin.generateLink({ type: 'recovery' })` → courriel `ReinitialisationMotDePasse` → lien `/reinitialiser-mot-de-passe?token_hash=…&type=recovery` → `verifyOtp` au moment d'enregistrer
- Protections : réponse toujours identique, 1 envoi/adresse/minute (table `demandes_mot_de_passe`), URL du lien jamais tirée de la requête
- Aucun gabarit Supabase à configurer

- Domaine `acceslybertech.com` vérifié dans WHC DNS
- Templates : bienvenue PCI, confirmation billet, confirmation remboursement, billet offert, notification admin

### Marketing (Admin)
- Page `/admin/marketing` — envoi de courriels promo en un clic par événement
- Sélection événement, sujet et image bannière modifiables, envoi de test à soi-même avant l'envoi réel
- Envoi aux PCI/leaders actifs et consentants (`consentement_communications`), par lots de 100 via Resend
- Template `PromoEvenement` : logos, badges (Session/Congrès/Platine/Banquet), paliers de prix avec dates, section banquet, gère aussi les événements sans billets (informatif) et multi-villes
- Historique des envois (table `campagnes_email`) affiché dans l'admin

---

## Patterns techniques importants

### Supabase
- **Toujours `supabaseAdmin` (service role)** pour les requêtes admin côté serveur
- **RLS policies bloquent les inserts côté client** → utiliser API routes avec supabaseAdmin
- `get_my_role()` SECURITY DEFINER pour éviter récursion RLS
- Jointures explicites : `comptes!billets_compte_id_fkey`
- `get_groupe_ids` RPC pour hiérarchie leaders — **service_role seulement** (ne filtre pas par statut)
- **RLS durcies (Session 7)** : un leader ne lit que son propre compte et ses propres banquets ; le portier ne lit plus `billets` directement ; uploads carrousel / photos leaders = admin + développeur
- **Règle** : toute lecture de données d'autres utilisateurs passe par une route API avec `supabaseAdmin` + vérification du rôle, jamais par le navigateur
- Vérification des rôles centralisée dans `src/lib/acces.ts`
- **Villes d'un événement : mises à jour en place** (update par id), jamais effacer-puis-recréer — `portiers_comptes.evenement_ville_id` et `billets.scanne_ville_id` y sont liés (ancien bogue : villes dupliquées à chaque sauvegarde)
- Listes de leaders pour affichage historique : `.in('statut', ['actif', 'inactif'])` (sinon le nom d'un leader inactif disparaît)
- GRANT explicites requis pour chaque table

### Next.js / TypeScript
- **Pas de `admin/layout.tsx`** — double navbar
- Chaque page admin a sa propre `<Navbar />`
- `window.location.href = '/'` plus fiable que `router.push` pour redirections post-login
- **Imports sans extension `.tsx`** — cause erreur TypeScript en production Vercel
- Champs nullable doivent avoir `?? ''` ou `?? null`
- `renderToBuffer()` → wrapper avec `as any` pour @react-pdf/renderer
- Buffer → `new Uint8Array(buffer)` pour NextResponse

### Stripe
- Gross-up : `(sous-total-taxé + 0.30) / (1 - 0.029)`
- Taxes et frais stockés dans metadata PaymentIntent
- Récupérés depuis metadata à la confirmation
- Allergies par personne stockées en JSON dans metadata

### CSS/Tailwind
- `font-size: 18px` dans `globals.css` pour meilleure lisibilité
- Styles inline avec `style={{ color: '#1A2535' }}` partout
- JSX attributs sur une seule ligne (évite erreurs parser)
- **Fichiers en fins de ligne Windows (CRLF)** — à conserver lors des modifications
- Pas de mode accessibilité (retiré — trop complexe)
- **Responsive (Session 7)** : toutes les pages vérifiées à 375 px (aucun défilement horizontal). Patterns : rangées de liste `flex flex-col sm:flex-row sm:items-center sm:justify-between` ; groupes de boutons `flex gap-2 flex-wrap` ; `select` avec `max-w-full` ; champs `flex-1` toujours avec `min-w-0` ; boutons `w-full sm:w-auto` sur cellulaire
- Tailwind v4 : `bg-opacity-*` ne fonctionne plus → utiliser la syntaxe `/10`

---

## Middleware
```typescript
const publicRoutes = [
  '/connexion', '/inscription', '/mot-de-passe-oublie',
  '/reinitialiser-mot-de-passe', '/api/auth', '/api/public', '/conditions'
]
```

---

## Supabase Storage buckets
- `leaders-photos` — photos des leaders
- `documents` — documents PCI/Platine (public)
- `carrousel` — images du carrousel page d'accueil

---

## Déploiement production

### Vercel
- URL : https://famille-germain.vercel.app
- Plan : Hobby (repo public — obligatoire pour Hobby)
- Auto-deploy sur `git push` vers `main`
- Variables d'environnement configurées dans Vercel dashboard

### Supabase
- Site URL : https://famille-germain.vercel.app
- Redirect URLs : https://famille-germain.vercel.app/**

### Commande déploiement
```bash
git add .
git commit -m "description"
git push
# Vercel déploie automatiquement en ~1 minute
```

---

## À faire (liste prioritaire)

1. **Rapport financier détaillé événement** — détails à confirmer avec les admins
2. **Apple Wallet / Google Wallet** — intégration passes numériques (comptes développeur Apple/Google requis)
3. **Traductions FR/EN** — passe finale avec next-intl (différé après toutes les features)
4. **Domaine acceslybertech.com** — DNS WHC → Vercel (dernière étape absolue)

### Notés / reportés
- Bouton Effacer un portier (reporté — Désactiver suffit)
- Lien « Se désabonner » en un clic dans le courriel promo (actuellement : via page Contact)
- Vercel Hobby = usage non commercial → probablement plan Pro avant le lancement à tous les PCI
- Supabase gratuit : 1 Go stockage, 5 Go bande passante/mois (surveiller avec les audios)
- Documents Platine confidentiels : si certains ne doivent jamais sortir du groupe, prévoir des liens qui expirent (bucket privé)

### Terminés (Session 7)
- Rôle développeur · RLS durcies · Statut Actif/Inactif + refusé · Rapport banquets (imprimer/envoyer) · Correction allergies · Bracelets par événement · Correction villes dupliquées · Filtre Groupe · Page Audios · Courriels professionnels + mot de passe oublié en français · Courriel promo · Nom complet + co-PCI dans la navbar · Unicité courriel / numéro Amway · Responsive complet (cellulaire et tablette) · Bouton Partager (documents Platine+)

---

## Règles de développement
- **Depuis Session 7 : Claude a accès au dossier local et écrit lui-même les fichiers**, après validation de Mario. Claude présente les changements, Mario valide, Claude écrit et vérifie TypeScript (`tsc`), Mario teste (`npm run dev`) puis fait git add/commit/push
- Claude ne peut pas exécuter de commandes sur le PC ni effacer de fichiers : Mario s'en charge
- Toujours utiliser `supabaseAdmin` côté serveur pour les requêtes admin
- Commits descriptifs après chaque groupe logique de features
- Mario travaille sur Windows, VS Code, terminal intégré
- GitHub auth via personal access token (classic, repo scope)

---

*Dernière mise à jour : 30 octobre 2026 — Session 7*