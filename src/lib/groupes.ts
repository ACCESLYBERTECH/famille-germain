// Groupes et sous-groupes créés par les leaders (champ libre comptes.groupe)
//
// - Un sous-groupe s'écrit avec « / » : MORIN / TREMBLAY / LATOUR
// - Majuscules et espaces ne comptent pas : « morin/tremblay » = « MORIN / TREMBLAY »
// - Un groupe appartient au leader du PCI (comptes.leader_id) : le MORIN d'un leader
//   n'est jamais mélangé avec le MORIN d'un autre leader
// - Filtrer sur MORIN inclut tous ses sous-groupes (MORIN / TREMBLAY, MORIN / TREMBLAY / LATOUR...)

export const SANS_GROUPE = '__aucun__'
export const SEPARATEUR = ' / '
const SEP_VALEUR = '::' // sépare le leader propriétaire et le chemin dans la valeur du filtre

// Forme unique d'un nom de groupe : « morin /  tremblay » → « MORIN / TREMBLAY »
export function cleGroupe(groupe: string | null | undefined): string {
  return (groupe ?? '')
    .split('/')
    .map(partie => partie.trim().replace(/\s+/g, ' ').toLocaleUpperCase('fr-CA'))
    .filter(Boolean)
    .join(SEPARATEUR)
}

// Valeur du filtre : « idLeader::CHEMIN » (idLeader vide = PCI sans leader)
export function valeurFiltreGroupe(leaderId: string | null | undefined, chemin: string): string {
  return `${leaderId ?? ''}${SEP_VALEUR}${chemin}`
}

function lireFiltre(filtre: string): { proprietaire: string | null; chemin: string } {
  const i = filtre.indexOf(SEP_VALEUR)
  if (i === -1) return { proprietaire: null, chemin: cleGroupe(filtre) } // ancienne forme : tous les leaders
  return { proprietaire: filtre.slice(0, i), chemin: filtre.slice(i + SEP_VALEUR.length) }
}

// Le chemin seul, pour l'afficher (titres de rapports, noms de fichiers)
export function libelleFiltreGroupe(filtre: string): string {
  if (!filtre) return 'Tous les groupes'
  if (filtre === SANS_GROUPE) return 'Sans groupe'
  return lireFiltre(filtre).chemin
}

// Le PCI fait-il partie du groupe filtré (ou d'un de ses sous-groupes) ?
// filtre : '' = tous, SANS_GROUPE = sans groupe, sinon une valeur de valeurFiltreGroupe()
export function correspondGroupe(
  groupe: string | null | undefined,
  filtre: string,
  leaderId?: string | null
): boolean {
  if (!filtre) return true
  const cle = cleGroupe(groupe)
  if (filtre === SANS_GROUPE) return cle === ''
  const { proprietaire, chemin } = lireFiltre(filtre)
  if (proprietaire !== null && (leaderId ?? '') !== proprietaire) return false
  return cle === chemin || cle.startsWith(chemin + SEPARATEUR)
}

export interface NoeudGroupe {
  valeur: string   // valeur du filtre
  chemin: string   // MORIN / TREMBLAY
  nom: string      // TREMBLAY
  niveau: number   // 0 = groupe, 1 = sous-groupe, 2 = sous-sous-groupe...
  nombre: number   // PCI dans ce groupe ET ses sous-groupes
}

export interface SectionGroupes {
  leaderId: string // '' = PCI sans leader
  noeuds: NoeudGroupe[]
}

// Arbre des groupes, une section par leader propriétaire
export function arbreGroupes(
  elements: { groupe: string | null | undefined; leader_id: string | null | undefined }[],
  filtreLeader = ''
): { sections: SectionGroupes[]; sansGroupe: number } {
  const parLeader = new Map<string, Map<string, number>>()
  let sansGroupe = 0
  for (const e of elements) {
    if (filtreLeader && e.leader_id !== filtreLeader) continue
    const cle = cleGroupe(e.groupe)
    if (!cle) { sansGroupe++; continue }
    const leaderId = e.leader_id ?? ''
    if (!parLeader.has(leaderId)) parLeader.set(leaderId, new Map())
    const compte = parLeader.get(leaderId)!
    // Le PCI compte dans son groupe et dans chaque groupe parent
    const parties = cle.split(SEPARATEUR)
    for (let i = 1; i <= parties.length; i++) {
      const chemin = parties.slice(0, i).join(SEPARATEUR)
      compte.set(chemin, (compte.get(chemin) ?? 0) + 1)
    }
  }
  const comparer = (a: string, b: string) => {
    const pa = a.split(SEPARATEUR), pb = b.split(SEPARATEUR)
    for (let i = 0; i < Math.min(pa.length, pb.length); i++) {
      const c = pa[i].localeCompare(pb[i], 'fr-CA')
      if (c !== 0) return c
    }
    return pa.length - pb.length
  }
  const sections = Array.from(parLeader.entries()).map(([leaderId, compte]) => ({
    leaderId,
    noeuds: Array.from(compte.keys()).sort(comparer).map(chemin => {
      const parties = chemin.split(SEPARATEUR)
      return {
        valeur: valeurFiltreGroupe(leaderId, chemin),
        chemin,
        nom: parties[parties.length - 1],
        niveau: parties.length - 1,
        nombre: compte.get(chemin) ?? 0,
      }
    }),
  }))
  return { sections, sansGroupe }
}

// Tous les chemins existants (groupes + parents) d'un leader, pour les suggestions
export function cheminsGroupes(
  elements: { groupe: string | null | undefined; leader_id: string | null | undefined }[],
  leaderId: string
): string[] {
  const { sections } = arbreGroupes(elements.filter(e => (e.leader_id ?? '') === leaderId))
  return sections.flatMap(s => s.noeuds.map(n => n.chemin))
}
