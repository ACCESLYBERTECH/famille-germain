// Carrousel de l'accueil : liens « faciles » choisis par l'admin, sans taper d'adresse.
// Le lien est gardé dans carrousel_images.lien :
//   (vide)                     → image non cliquable
//   /evenements#ev-<id>        → la carte de cet événement dans la page Événements
//   /documents, /audios, ...   → une page du site
//   https://...                → un site externe (nouvel onglet)

export type TypeLien = 'aucun' | 'evenement' | 'page' | 'externe'

export const PAGES_DU_SITE = [
  { href: '/evenements', label: 'Événements' },
  { href: '/evenements/mes-billets', label: 'Mes billets' },
  { href: '/factures', label: 'Mes factures' },
  { href: '/documents', label: 'Documents' },
  { href: '/audios', label: 'Audios' },
  { href: '/contact', label: 'Contact' },
]

const PREFIXE_EVENEMENT = '/evenements#ev-'

export function lienEvenement(id: string) {
  return `${PREFIXE_EVENEMENT}${id}`
}

export function lireLien(lien: string | null | undefined): { type: TypeLien; valeur: string } {
  const l = (lien ?? '').trim()
  if (!l) return { type: 'aucun', valeur: '' }
  if (l.startsWith(PREFIXE_EVENEMENT)) return { type: 'evenement', valeur: l.slice(PREFIXE_EVENEMENT.length) }
  if (/^https?:\/\//i.test(l)) return { type: 'externe', valeur: l }
  return { type: 'page', valeur: l }
}

// Date du jour au Québec (AAAA-MM-JJ), pour comparer avec date_debut / date_fin
export function aujourdhuiQuebec(): string {
  return new Date().toLocaleDateString('en-CA', { timeZone: 'America/Toronto' })
}

export function etatAffichage(img: { visible?: boolean | null; date_debut?: string | null; date_fin?: string | null }, aujourdhui = aujourdhuiQuebec()):
  'visible' | 'cache' | 'programme' | 'expire' {
  if (img.visible === false) return 'cache'
  if (img.date_debut && img.date_debut > aujourdhui) return 'programme'
  if (img.date_fin && img.date_fin < aujourdhui) return 'expire'
  return 'visible'
}
