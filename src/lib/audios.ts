// Accès à la page Audios : PCI ou leader ACTIF, pendant sa période sans frais
// (admin et développeur : accès complet pour gérer et vérifier)

export function estEnPeriodeSansFrais(compte: { periode_sf_debut?: string | null; periode_sf_fin?: string | null } | null | undefined, maintenant = new Date()): boolean {
  if (!compte?.periode_sf_debut || !compte?.periode_sf_fin) return false
  const debut = new Date(compte.periode_sf_debut)
  const fin = new Date(compte.periode_sf_fin)
  return debut <= maintenant && maintenant <= fin
}

export function aAccesAudios(compte: { role?: string | null; statut?: string | null; periode_sf_debut?: string | null; periode_sf_fin?: string | null } | null | undefined): boolean {
  if (!compte) return false
  if (compte.role === 'admin' || compte.role === 'developpeur') return true
  if (compte.role !== 'pci' && compte.role !== 'leader') return false
  if (compte.statut !== 'actif') return false
  return estEnPeriodeSansFrais(compte)
}

// Durée de validité des liens d'écoute (3 h : assez pour un long audio)
export const DUREE_LIEN_AUDIO_SECONDES = 3 * 60 * 60
