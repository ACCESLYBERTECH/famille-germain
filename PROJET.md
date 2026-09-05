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
├── page.tsx                          — Redirect vers /accueil ou /connexion
├── accueil/page.tsx                  — Page d'accueil PCI/leader (carrousel + photo leader)
├── connexion/page.tsx                — Login avec logos navy
├── inscription/page.tsx              — Inscription 4 étapes
├── inscription/merci/page.tsx        — Page de remerciement
├── mot-de-passe-oublie/page.tsx
├── reinitialiser-mot-de-passe/page.tsx
├── conditions/page.tsx
├── evenements/
│   ├── page.tsx                      — Liste événements PCI
│   ├── ListeEvenements.tsx
│   ├── achat/page.tsx                — Achat billet
│   ├── achat/FormulaireAchat.tsx
│   ├── confirmation/page.tsx         — Confirmation paiement billet
│   ├── achat-banquet/page.tsx        — Achat banquet
│   ├── achat-banquet/FormulaireAchatBanquet.tsx
│   ├── confirmation-banquet/page.tsx
│   └── mes-billets/
│       ├── page.tsx
│       └── MesBilletsClient.tsx
├── documents/page.tsx
├── contact/page.tsx
├── scan/
│   ├── page.tsx
│   └── ScanInterface.tsx
├── admin/
│   ├── page.tsx                      — Dashboard admin avec stats
│   ├── pci/page.tsx + GestionPCI.tsx
│   ├── evenements/
│   │   ├── page.tsx
│   │   ├── GestionEvenements.tsx
│   │   └── FormulaireEvenement.tsx
│   ├── billets/page.tsx + GestionBillets.tsx
│   ├── banquets/page.tsx + GestionBanquets.tsx — NOUVEAU
│   ├── portiers/page.tsx + GestionPortiers.tsx
│   ├── documents/page.tsx + GestionDocuments.tsx
│   └── carrousel/page.tsx + AdminCarrouselClient.tsx
└── leader/
    └── platines-et-plus/page.tsx + PlatinesEtPlus.tsx
```

### API Routes
```
src/app/api/
├── auth/resoudre-identifiant/route.ts    — Résolution identifiant portier
├── public/leaders/route.ts              — Leaders visibles pour inscription
├── stripe/
│   ├── create-payment-intent/route.ts   — PaymentIntent billets
│   └── create-payment-intent-banquet/route.ts
├── admin/
│   ├── modifier-compte/route.ts
│   ├── creer-pci/route.ts              — Création manuelle PCI
│   ├── portiers/route.ts
│   ├── rapport-excel/route.ts
│   ├── banquet/route.ts                — CRUD banquets via supabaseAdmin
│   ├── rapport-banquets-excel/route.ts
│   └── rapport-banquets-pdf/route.ts
├── billets/offrir/route.ts
├── remboursement/route.ts
├── scan/route.ts
├── facture/billet/route.ts             — PDF facture @react-pdf/renderer
├── leader/modifier-groupe/route.ts
└── emails/
    ├── bienvenue-pci/route.ts
    ├── confirmation-billet-offert/route.ts
    └── notification-admin/route.ts
```

### Composants
```
src/components/
├── Navbar.tsx                          — Navbar sticky avec rôles
├── QRCode.tsx
└── CarrouselAccueil.tsx
```

---

## Fonctionnalités complétées

### Auth & Navigation
- Inscription 4 étapes (province dynamique, dropdown leaders, conditions d'utilisation)
- Connexion avec logos Germain + Yager en en-tête navy
- Mot de passe oublié / réinitialisation
- Navbar sticky avec logos, menu déroulant "Gestion" admin
- Page de remerciement après inscription

### Gestion PCI (Admin)
- Liste PCI actifs avec recherche (nom, courriel, # Amway)
- Filtre par leader + détection orphelins (badge ⚠️ Sans leader)
- Modal modification complet (identité, contact, adresse, Amway, rôle, leader, groupe, SF)
- Ajout manuel de PCI avec mot de passe temporaire + email bienvenue
- Approbation/refus des PCI en attente
- Photo leader (bucket `leaders-photos`)
- Visibilité leader : Régulier / Invisible (caché du dropdown inscription et du carrousel)
- Badge 👁️ Invisible dans la liste admin

### Événements
- Création/édition/duplication/activation
- Paliers de prix automatiques (max 4)
- Multi-villes
- Toggle `a_billets` / `a_banquet`
- Configuration banquet (nom + prix) via API supabaseAdmin
- Badges Session/Congrès/Banquet/Platine
- Countdown jours restants
- Description avec Voir plus/moins

### Paiements
- TPS (5%) + TVQ (9.975%) calculées sur le prix
- Frais Stripe gross-up : `(sous-total + taxes + 0.30) / (1 - 0.029)`
- Stripe principal pour billets, Stripe séparé pour banquets
- Confirmation Stripe avec sauvegarde taxes dans BD
- Remboursement 100% (admin seulement)

### Système Banquet
- Banquet lié à un événement (table `banquets`)
- Disponible aux PCI sans frais après achat du billet
- Achat séparé avec Stripe banquet
- 3 résultats de scan :
  - 🔵 Billet régulier (payant)
  - 🟢 Sans frais avec banquet
  - 🟡 Sans frais sans banquet
- Non remboursable
- Indicateur "Avec/Sans banquet" dans Gestion billets et Platines et plus

### Allergies alimentaires
- Demandées aux billets payants avec banquet (étape 1.5)
- Demandées à l'achat du banquet (sans frais)
- Options : Noix/arachides, Gluten, Lactose, Œufs, Poisson, Crustacés, Végétarien, Végétalien + texte libre
- Stockées dans `billets.allergies` et `billets_banquets.allergies`

### Mode participation
- Question Sur place / Virtuel par personne à l'achat
- Affiché sous chaque nom coché
- Stocké dans `billets.mode_participation`
- Stats par événement dans Gestion billets et Platines et plus
- Filtre Sur place / Virtuel dans Gestion billets
- Export CSV inclut le mode

### QR Codes & Scan
- QR code unique par billet (`qr_code_token`)
- Scanner portier avec étape de confirmation obligatoire
- Recherche manuelle par nom
- 3 couleurs de résultat pour banquet
- Légende bracelets si événement avec banquet
- Stats par ville (admin seulement)
- Multi-ville par portier

### Mes billets (PCI)
- Liste billets actifs (30 jours après l'événement)
- Zoom QR code en modal
- Bouton 📄 Télécharger la facture (billets payants)
- Bouton 📄 Facture pour banquets achetés
- Indicateur banquet si événement a banquet

### Factures PDF
- Générées à la volée avec `@react-pdf/renderer`
- Numéro facture : `BIL-XXXXXXXX` ou `BAN-XXXXXXXX`
- Détail : sous-total, TPS, TVQ, frais Stripe, total, badge PAYÉ
- API : `/api/facture/billet?billet_id=X&type=billet|banquet`

### Page d'accueil
- Carrousel avec photo leader côte-à-côte (navy)
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
- Export CSV avec colonne Banquet et Mode
- Onglet Profils PCI avec modification du groupe

### Rapport Banquets (Admin — NOUVEAU)
- Page `/admin/banquets`
- Liste tous les billets des événements avec banquet
- Affiche : Sans frais avec banquet, Sans frais sans banquet, Régulier (banquet inclus)
- Filtres : par événement, par leader, par statut banquet
- Export Excel (3 feuilles : rapport, résumé, allergies seulement)
- Rapport PDF imprimable dans nouvel onglet

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
- API : `/api/auth/resoudre-identifiant` dans publicRoutes

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
- RLS policies bloquent les inserts côté client → utiliser API routes avec supabaseAdmin
- `get_my_role()` SECURITY DEFINER pour éviter récursion RLS
- Jointures explicites : `comptes!billets_compte_id_fkey`
- `get_groupe_ids` RPC pour hiérarchie leaders

### Next.js
- **Pas de `admin/layout.tsx`** — double navbar
- Chaque page admin a sa propre `<Navbar />`
- Page carrousel admin : `page.tsx` (serveur) + `AdminCarrouselClient.tsx` (client)
- `window.location.href = '/'` plus fiable que `router.push` pour redirections post-login
- Imports sans extension `.tsx` (cause erreur TypeScript en production)

### TypeScript (production)
- Vercel fait un check TypeScript strict — les erreurs locales silencieuses échouent en prod
- Tous les champs nullable doivent avoir `?? ''` ou `?? null`
- `renderToBuffer()` → wrapper avec `as any` pour @react-pdf/renderer
- Buffer → `new Uint8Array(buffer)` pour NextResponse

### Stripe
- Gross-up formula : `(sous-total-taxé + 0.30) / (1 - 0.029)`
- Taxes et frais stockés dans les metadata du PaymentIntent
- Récupérés depuis les metadata à la confirmation
- Carte test : `4242 4242 4242 4242`

### CSS/Tailwind
- `font-size: 18px` dans `globals.css` pour meilleure lisibilité
- Styles inline avec `style={{ color: '#1A2535' }}` partout
- JSX attributs sur une seule ligne (évite erreurs parser)

---

## Middleware
```typescript
// Routes publiques
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

## À faire (liste prioritaire)

1. **Apple Wallet / Google Wallet** — intégration passes numériques
2. **Traductions FR/EN** — passe finale avec next-intl (différé après toutes les features)
3. **Rapport financier détaillé événement** — détails à confirmer avec les admins
4. **Amélioration visuel emails** — templates Resend + logos
5. **Personnalisation emails Supabase en français** — templates auth Supabase
6. **Adaptation responsive** — tablette et cellulaire
7. **Email marketing** — Resend Broadcasts pour annonces événements
8. **Nom complet + co-PCI dans navbar** — coin supérieur droit
9. **Domaine acceslybertech.com** — DNS WHC → Vercel (dernière étape)

---

## Déploiement production

### Vercel
- URL : https://famille-germain.vercel.app
- Plan : Hobby (repo public)
- Auto-deploy sur `git push` vers `main`

### Supabase
- Site URL : https://famille-germain.vercel.app
- Redirect URLs : https://famille-germain.vercel.app/**

### Pour déployer
```bash
git add .
git commit -m "description"
git push
# Vercel déploie automatiquement
```

---

## Règles de développement
- Fournir le fichier complet pour les modifications (pas de diffs partiels)
- Pour fichiers >500 lignes, demander avant de fournir
- Toujours utiliser `supabaseAdmin` côté serveur pour les requêtes admin
- Tester localement avant de pousser
- Commits descriptifs après chaque groupe logique de features

---

*Dernière mise à jour : Septembre 2026*