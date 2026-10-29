// Groupes (sous-groupes créés par les leaders — champ libre comptes.groupe)
// Les variantes d'écriture sont regroupées : « Brisson », « BRISSON » et « brisson » = même groupe

export const SANS_GROUPE = '__aucun__'

export function cleGroupe(groupe: string | null | undefined): string {
  return (groupe ?? '').trim().replace(/\s+/g, ' ').toLocaleUpperCase('fr-CA')
}

// filtre : '' = tous, SANS_GROUPE = sans groupe, sinon la clé du groupe
export function correspondGroupe(groupe: string | null | undefined, filtre: string): boolean {
  if (!filtre) return true
  if (filtre === SANS_GROUPE) return cleGroupe(groupe) === ''
  return cleGroupe(groupe) === filtre
}

export interface OptionGroupe {
  cle: string
  nombre: number
}

// Liste des groupes existants (avec nombre), limitée au leader choisi s'il y en a un
export function optionsGroupes(
  elements: { groupe: string | null | undefined; leader_id: string | null | undefined }[],
  filtreLeader = ''
): { groupes: OptionGroupe[]; sansGroupe: number } {
  const compte = new Map<string, number>()
  let sansGroupe = 0
  for (const e of elements) {
    if (filtreLeader && e.leader_id !== filtreLeader) continue
    const cle = cleGroupe(e.groupe)
    if (!cle) { sansGroupe++; continue }
    compte.set(cle, (compte.get(cle) ?? 0) + 1)
  }
  const groupes = Array.from(compte.entries())
    .map(([cle, nombre]) => ({ cle, nombre }))
    .sort((a, b) => a.cle.localeCompare(b.cle, 'fr-CA'))
  return { groupes, sansGroupe }
}
