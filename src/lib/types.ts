export type Role = 'pci' | 'leader' | 'portier' | 'admin'
export type Statut = 'en_attente' | 'actif' | 'inactif'
export type StatutBillet = 'vendu' | 'utilise' | 'rembourse'
export type StatutEvenement = 'actif' | 'inactif' | 'archive'
export type AccesEvenement = 'public' | 'platine'
export type StripeAccount = 'principal' | 'banquet'

export interface Compte {
  id: string
  courriel: string
  role: Role
  prenom_1: string
  nom_1: string
  prenom_2?: string | null
  nom_2?: string | null
  numero_amway?: string | null
  date_inscription_amway?: string | null
  adresse?: string | null
  ville?: string | null
  province?: string | null
  pays: string
  code_postal?: string | null
  telephone?: string | null
  leader_id?: string | null
  statut: Statut
  periode_sf_debut?: string | null
  periode_sf_fin?: string | null
  consentement_communications: boolean
  created_at: string
  groupe?: string | null
  photo_url?: string | null
  visible_inscription?: boolean | null
}

export interface Evenement {
  id: string
  nom: string
  description?: string | null
  date_debut: string
  date_fin: string
  lieu?: string | null
  acces: AccesEvenement
  a_billets: boolean
  a_banquet: boolean
  stripe_account: StripeAccount
  evenement_parent_id?: string | null
  statut: StatutEvenement
  created_at: string
  paliers?: EvenementPalier[]
  villes?: EvenementVille[]
}

export interface EvenementPalier {
  id: string
  evenement_id: string
  prix: number
  date_fin: string
  ordre: number
  created_at: string
}

export interface EvenementVille {
  id: string
  evenement_id: string
  nom_ville: string
  ordre: number
  created_at: string
}

export interface Billet {
  id: string
  evenement_id: string
  compte_id: string
  nom_pci: string
  leader_id?: string | null
  est_sans_frais: boolean
  offert_par_admin?: boolean
  prix_paye: number
  tps?: number | null
  tvq?: number | null
  frais_stripe?: number | null
  prix_total?: number | null
  allergies?: string | null
  mode_participation?: string | null
  stripe_payment_intent_id?: string | null
  stripe_refund_id?: string | null
  qr_code_token: string
  statut: StatutBillet
  scanne_le?: string | null
  scanne_ville_id?: string | null
  scanne_par_id?: string | null
  rembourse_le?: string | null
  rembourse_par?: string | null
  created_at: string
  evenement?: Evenement
  compte?: Compte
}

export interface Portier {
  id: string
  compte_id: string
  evenement_id: string
  evenement_ville_id?: string | null
  nom_poste?: string | null
  created_at: string
}