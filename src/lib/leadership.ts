// Accès aux conférences Leadership
// - Les leaders (et l'admin / le développeur) y ont toujours accès
// - Un PCI y a accès seulement si la case « Accès Leadership » est cochée sur sa fiche
//   (cochée par l'admin, ou par n'importe quel leader au-dessus de lui dans l'arbre)

export const ROLES_LEADERSHIP = ['leader', 'admin', 'developpeur']

export function aAccesLeadership(compte: { role?: string | null; acces_leadership?: boolean | null } | null | undefined): boolean {
  if (!compte) return false
  if (ROLES_LEADERSHIP.includes(compte.role ?? '')) return true
  return compte.acces_leadership === true
}

// Un événement « public » est ouvert à tous ; un événement « leadership » seulement à ceux qui ont l'accès
export function peutVoirEvenement(acces: string | null | undefined, compte: { role?: string | null; acces_leadership?: boolean | null } | null | undefined): boolean {
  if (acces !== 'leadership') return true
  return aAccesLeadership(compte)
}
