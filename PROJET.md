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
id UUID, courriel, role, prenom_1, nom_1, prenom_2, nom_2,
numero_amway, date_inscription_amway, adresse, ville, province,
pays, code_postal, telephone, leader_id, statut,
periode_sf_debut, periode_sf_fin, consentement_communications,
groupe, photo_url, visible_inscription BOOLEAN DEFAULT true,
created_at
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
│   └── ScanInterface.tsx
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
│   └── carrousel/page.tsx + AdminCarrouselClient.tsx
└── leader/
    └── platines-et-plus/page.tsx + PlatinesEtPlus.tsx
```

### API Routes
```
src/app/api/
├── auth/resoudre-identifiant/route.ts
├── public/leaders/route.ts              — Filtre visible_inscription=true
├── stripe/
│   ├── create-payment-intent/route.ts   — TPS/TVQ/gross-up, allergies par personne, modes
│   └── create-payment-intent-banquet/route.ts
├── admin/
│   ├── modifier-compte/route.ts
│   ├── creer-pci/route.ts              — Création manuelle + email bienvenue
│   ├── portiers/route.ts
│   ├── rapport-excel/route.ts
│   ├── banquet/route.ts                — CRUD banquets via supabaseAdmin (contourne RLS)
│   ├── rapport-banquets-excel/route.ts
│   └── rapport-banquets-pdf/route.ts   — HTML imprimable dans nouvel onglet
├── billets/offrir/route.ts
├── remboursement/route.ts
├── scan/route.ts
├── facture/billet/route.ts             — PDF @react-pdf/renderer
├── leader/modifier-groupe/route.ts
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
└── CarrouselAccueil.tsx
```

---

## Fonctionnalités complétées ✅

### Auth & Navigation
- Inscription 4 étapes (province dynamique, dropdown leaders filtrés, conditions d'utilisation)
- Connexion avec logos Germain + Yager en en-tête navy
- Mot de passe oublié / réinitialisation
- Navbar sticky avec logos, menu déroulant "Gestion" admin
- Page de remerciement après inscription

### Gestion PCI (Admin)
- Liste PCI actifs avec recherche (nom, courriel, # Amway)
- Filtre par leader + détection orphelins (badge ⚠️ Sans leader)
- Bouton alerte orange cliquable si orphelins existent
- Modal modification complet
- **Ajout manuel de PCI** avec mot de passe temporaire + email bienvenue
- Approbation/refus des PCI en attente
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
- Stockées dans `billets.allergies` (JSON par personne) et `billets_banquets.allergies`

### Mode participation
- Question Sur place / Virtuel par personne à l'achat
- Affiché sous chaque nom coché individuellement
- Stocké dans `billets.mode_participation`
- Stats par événement dans Gestion billets et Platines et plus
- Filtre Sur place / Virtuel dans Gestion billets
- Un billet Virtuel peut quand même être scanné à la porte

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
- **Rapport PDF** — HTML professionnel dans nouvel onglet, imprimable avec Ctrl+P

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

### Emails (Resend)
- Domaine `acceslybertech.com` vérifié dans WHC DNS
- Templates : bienvenue PCI, confirmation billet, confirmation remboursement, billet offert, notification admin

---

## Patterns techniques importants

### Supabase
- **Toujours `supabaseAdmin` (service role)** pour les requêtes admin côté serveur
- **RLS policies bloquent les inserts côté client** → utiliser API routes avec supabaseAdmin
- `get_my_role()` SECURITY DEFINER pour éviter récursion RLS
- Jointures explicites : `comptes!billets_compte_id_fkey`
- `get_groupe_ids` RPC pour hiérarchie leaders
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
- Pas de mode accessibilité (retiré — trop complexe)

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

1. **Apple Wallet / Google Wallet** — intégration passes numériques
2. **Traductions FR/EN** — passe finale avec next-intl (différé après toutes les features)
3. **Rapport financier détaillé événement** — détails à confirmer avec les admins
4. **Amélioration visuel emails** — templates Resend + logos
5. **Personnalisation emails Supabase en français** — templates auth Supabase
6. **Adaptation responsive** — tablette et cellulaire
7. **Email marketing** — Resend Broadcasts pour annonces événements
8. **Nom complet + co-PCI dans navbar** — coin supérieur droit
9. **Domaine acceslybertech.com** — DNS WHC → Vercel (dernière étape absolue)

---

## Règles de développement
- Fournir le fichier complet pour les modifications (pas de diffs partiels)
- Pour fichiers >500 lignes, demander avant de fournir
- Toujours utiliser `supabaseAdmin` côté serveur pour les requêtes admin
- Commits descriptifs après chaque groupe logique de features
- Mario travaille sur Windows, VS Code, terminal intégré
- GitHub auth via personal access token (classic, repo scope)

---

*Dernière mise à jour : Septembre 2026 — Session 5*