// Reconnaissances sur scène — règles partagées (page leader, routes serveur, rapport admin)

export interface TypeReconnaissance {
  id: string
  nom: string
  ordre: number
  actif: boolean
}

export interface VilleEvenement {
  id: string
  nom_ville: string
  ordre: number
}

export interface EvenementReconnaissances {
  id: string
  nom: string
  date_debut: string
  date_fin: string
  reconnaissances_date_limite: string | null
  villes: VilleEvenement[]
}

export interface EntreeVirtuel {
  id: string
  evenement_id: string
  leader_id: string
  compte_id: string | null
  nom: string
  nom_2: string | null
  numero_amway: string | null
  ville: string | null
  province: string | null
  pays: string | null
  type_ids: string[]
  autre: string | null
}

// Ordre des leaders en dessous, comme un arbre : CHAMARD, puis HEBERT (équipe de CHAMARD)...
export interface LeaderOrdonne {
  id: string
  parentId: string
  niveau: number   // 1 = directement sous le leader connecté
}

export function ordonnerLeaders(
  moiId: string,
  leaders: { id: string; leader_id: string | null; prenom_1: string | null; nom_1: string | null }[]
): LeaderOrdonne[] {
  const enfants = new Map<string, typeof leaders>()
  for (const l of leaders) {
    const parent = l.leader_id ?? ''
    if (!enfants.has(parent)) enfants.set(parent, [])
    enfants.get(parent)!.push(l)
  }
  const parNom = (a: typeof leaders[number], b: typeof leaders[number]) =>
    `${a.nom_1 ?? ''} ${a.prenom_1 ?? ''}`.localeCompare(`${b.nom_1 ?? ''} ${b.prenom_1 ?? ''}`, 'fr-CA')
  const resultat: LeaderOrdonne[] = []
  const vus = new Set<string>([moiId])
  const visiter = (parentId: string, niveau: number) => {
    for (const l of [...(enfants.get(parentId) ?? [])].sort(parNom)) {
      if (vus.has(l.id)) continue
      vus.add(l.id)
      resultat.push({ id: l.id, parentId, niveau })
      visiter(l.id, niveau + 1)
    }
  }
  visiter(moiId, 1)
  // Leaders du groupe rattachés autrement : à la fin
  for (const l of [...leaders].sort(parNom)) if (!vus.has(l.id)) { vus.add(l.id); resultat.push({ id: l.id, parentId: moiId, niveau: 1 }) }
  return resultat
}

export interface LigneSurPlace {
  evenement_id: string
  leader_id: string
  ville_id: string | null
  type_id: string
  nombre: number
}

// Date du jour au Québec (AAAA-MM-JJ)
export function aujourdhuiQuebec(): string {
  return new Date().toLocaleDateString('en-CA', { timeZone: 'America/Toronto' })
}

// Dernier jour pour entrer ou corriger : la date limite choisie par l'admin,
// sinon la veille du début de l'événement
export function dateLimiteSaisie(ev: { date_debut: string; reconnaissances_date_limite: string | null }): string {
  if (ev.reconnaissances_date_limite) return ev.reconnaissances_date_limite
  const debut = new Date(ev.date_debut)
  debut.setDate(debut.getDate() - 1)
  return debut.toLocaleDateString('en-CA', { timeZone: 'America/Toronto' })
}

export function saisieOuverte(ev: { date_debut: string; reconnaissances_date_limite: string | null }, aujourdhui = aujourdhuiQuebec()): boolean {
  return aujourdhui <= dateLimiteSaisie(ev)
}

export function dateLongue(d: string): string {
  const date = /^\d{4}-\d{2}-\d{2}$/.test(d) ? new Date(`${d}T12:00:00`) : new Date(d)
  return date.toLocaleDateString('fr-CA', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
}

export const LONGUEURS = { nom: 120, lieu: 80, autre: 200 }

// Numéro de PCI : seulement les chiffres et lettres (« 1234 567 » = « 1234567 »)
export function cleNumero(numero: string | null | undefined): string {
  return (numero ?? '').toUpperCase().replace(/[^0-9A-Z]/g, '')
}

// La même personne est-elle déjà inscrite en virtuel pour cette conférence ?
// On se fie au NUMÉRO DE PCI (unique) — jamais au nom : deux Julie Tremblay peuvent exister.
export function trouverDoublon<T extends { id: string; compte_id: string | null; numero_amway: string | null }>(
  entrees: T[],
  personne: { compte_id: string | null; numero_amway: string | null },
  saufId?: string
): T | undefined {
  const cle = cleNumero(personne.numero_amway)
  return entrees.find(e => e.id !== saufId && (
    (personne.compte_id !== null && e.compte_id === personne.compte_id) || (cle !== '' && cleNumero(e.numero_amway) === cle)
  ))
}
