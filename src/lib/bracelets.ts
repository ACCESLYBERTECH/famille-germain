// Couleurs des bracelets d'un événement avec banquet
// Enregistrées dans la table evenements (modifiables par l'admin dans le formulaire de l'événement)

export type TypeBracelet = 'regulier' | 'sf_banquet' | 'sf_sans_banquet'

export interface Bracelet {
  couleur: string // ex: '#E53935'
  nom: string     // ex: 'Rouge'
}

export const BRACELETS_DEFAUT: Record<TypeBracelet, Bracelet> = {
  regulier: { couleur: '#2E86C1', nom: 'Bleu' },
  sf_banquet: { couleur: '#4CAF7D', nom: 'Vert' },
  sf_sans_banquet: { couleur: '#C9A84C', nom: 'Or' },
}

export const LIBELLES_BRACELETS: Record<TypeBracelet, string> = {
  regulier: 'Billet régulier (banquet inclus)',
  sf_banquet: 'Sans frais — avec banquet',
  sf_sans_banquet: 'Sans frais — sans banquet',
}

// Couleurs courantes de bracelets (pastilles cliquables dans le formulaire)
export const PALETTE_BRACELETS: Bracelet[] = [
  { couleur: '#E53935', nom: 'Rouge' },
  { couleur: '#FB8C00', nom: 'Orange' },
  { couleur: '#FDD835', nom: 'Jaune' },
  { couleur: '#C0CA33', nom: 'Lime' },
  { couleur: '#43A047', nom: 'Vert' },
  { couleur: '#00ACC1', nom: 'Turquoise' },
  { couleur: '#1E88E5', nom: 'Bleu' },
  { couleur: '#1A237E', nom: 'Marine' },
  { couleur: '#8E24AA', nom: 'Mauve' },
  { couleur: '#EC407A', nom: 'Rose' },
  { couleur: '#6D4C41', nom: 'Brun' },
  { couleur: '#212121', nom: 'Noir' },
  { couleur: '#FFFFFF', nom: 'Blanc' },
  { couleur: '#9E9E9E', nom: 'Argent' },
  { couleur: '#C9A84C', nom: 'Or' },
]

// Les 3 bracelets d'un événement (valeurs par défaut si non configurés)
export function braceletsEvenement(ev: any): Record<TypeBracelet, Bracelet> {
  const lire = (type: TypeBracelet): Bracelet => ({
    couleur: ev?.[`bracelet_${type}_couleur`] || BRACELETS_DEFAUT[type].couleur,
    nom: ev?.[`bracelet_${type}_nom`] || BRACELETS_DEFAUT[type].nom,
  })
  return { regulier: lire('regulier'), sf_banquet: lire('sf_banquet'), sf_sans_banquet: lire('sf_sans_banquet') }
}

// Texte noir sur couleur pâle (jaune, blanc...), blanc sur couleur foncée
export function couleurTexte(fond: string): string {
  const hex = (fond || '').replace('#', '')
  if (hex.length !== 6) return '#FFFFFF'
  const r = parseInt(hex.slice(0, 2), 16)
  const g = parseInt(hex.slice(2, 4), 16)
  const b = parseInt(hex.slice(4, 6), 16)
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255
  return luminance > 0.62 ? '#1A2535' : '#FFFFFF'
}
