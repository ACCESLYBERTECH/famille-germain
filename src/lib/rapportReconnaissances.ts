// Rapport des reconnaissances d'une conférence (admin) et contenu de la feuille de scène
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { cleNumero, type TypeReconnaissance, type VilleEvenement } from '@/lib/reconnaissances'

const supabaseAdmin = createAdminClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export interface PersonneVirtuel {
  id: string
  nom: string
  nom_2: string | null
  numero_amway: string | null
  ville: string | null
  province: string | null
  pays: string | null
  type_ids: string[]
  autre: string | null
  leader_id: string
  leader: string
}

export interface RapportReconnaissances {
  evenement: { id: string; nom: string; date_debut: string; date_fin: string; reconnaissances_date_limite: string | null }
  salles: { cle: string; nom: string }[]       // 'unique' si l'événement n'a qu'une salle
  types: TypeReconnaissance[]                    // actifs + désactivés qui ont des entrées, dans l'ordre
  surPlace: Record<string, Record<string, number>>                       // type_id → salle → total
  surPlaceParLeader: { leader_id: string; leader: string; salle: string; type_id: string; nombre: number }[]
  virtuel: PersonneVirtuel[]
  doublons: { numero: string; personnes: PersonneVirtuel[] }[]           // même numéro inscrit plus d'une fois
  autres: PersonneVirtuel[]                                              // fiches avec « Autre »
}

export const cleSalle = (villeId: string | null) => villeId ?? 'unique'

export function lieuPersonne(p: { ville: string | null; province: string | null; pays: string | null }) {
  return [p.ville, p.province, p.pays].filter(Boolean).join(', ')
}

export function nomsPersonne(p: { nom: string; nom_2: string | null }) {
  return p.nom_2 ? `${p.nom} & ${p.nom_2}` : p.nom
}

export async function chargerRapport(evenementId: string): Promise<RapportReconnaissances | null> {
  const { data: evenement } = await supabaseAdmin
    .from('evenements')
    .select('id, nom, date_debut, date_fin, reconnaissances_date_limite, a_reconnaissances, villes:evenement_villes(id, nom_ville, ordre)')
    .eq('id', evenementId)
    .single()
  if (!evenement || !evenement.a_reconnaissances) return null

  const [{ data: tousTypes }, { data: virtuelBrut }, { data: surPlaceBrut }] = await Promise.all([
    supabaseAdmin.from('reconnaissance_types').select('id, nom, ordre, actif').order('ordre', { ascending: true }),
    supabaseAdmin.from('reconnaissances_virtuel').select('*').eq('evenement_id', evenementId),
    supabaseAdmin.from('reconnaissances_sur_place').select('leader_id, ville_id, type_id, nombre').eq('evenement_id', evenementId),
  ])

  const idsLeaders = Array.from(new Set([...(virtuelBrut ?? []).map(v => v.leader_id), ...(surPlaceBrut ?? []).map(l => l.leader_id)]))
  const { data: leaders } = idsLeaders.length > 0
    ? await supabaseAdmin.from('comptes').select('id, prenom_1, nom_1').in('id', idsLeaders)
    : { data: [] as { id: string; prenom_1: string; nom_1: string }[] }
  const nomLeader = (id: string) => { const l = (leaders ?? []).find(x => x.id === id); return l ? `${l.prenom_1} ${l.nom_1}` : '?' }

  const villes = ((evenement as any).villes ?? []) as VilleEvenement[]
  const salles = villes.length > 0
    ? [...villes].sort((a, b) => a.ordre - b.ordre).map(v => ({ cle: v.id, nom: v.nom_ville }))
    : [{ cle: 'unique', nom: 'Salle unique' }]

  // Reconnaissances : les actives, plus les désactivées qui ont quand même des entrées
  const utilisees = new Set<string>([...(virtuelBrut ?? []).flatMap(v => v.type_ids ?? []), ...(surPlaceBrut ?? []).map(l => l.type_id)])
  const types = ((tousTypes ?? []) as TypeReconnaissance[]).filter(t => t.actif || utilisees.has(t.id))

  const surPlace: Record<string, Record<string, number>> = {}
  for (const l of surPlaceBrut ?? []) {
    const salle = cleSalle(l.ville_id)
    surPlace[l.type_id] ??= {}
    surPlace[l.type_id][salle] = (surPlace[l.type_id][salle] ?? 0) + l.nombre
  }
  const surPlaceParLeader = (surPlaceBrut ?? []).map(l => ({ leader_id: l.leader_id, leader: nomLeader(l.leader_id), salle: cleSalle(l.ville_id), type_id: l.type_id, nombre: l.nombre }))

  const virtuel: PersonneVirtuel[] = (virtuelBrut ?? [])
    .map(v => ({
      id: v.id, nom: v.nom, nom_2: v.nom_2, numero_amway: v.numero_amway, ville: v.ville, province: v.province, pays: v.pays,
      type_ids: v.type_ids ?? [], autre: v.autre, leader_id: v.leader_id, leader: nomLeader(v.leader_id),
    }))
    .sort((a, b) => a.nom.localeCompare(b.nom, 'fr-CA'))

  // Doublons : le même numéro de PCI inscrit plus d'une fois (souvent par deux organisations différentes)
  const parNumero = new Map<string, PersonneVirtuel[]>()
  for (const p of virtuel) {
    const n = cleNumero(p.numero_amway)
    if (!n) continue
    if (!parNumero.has(n)) parNumero.set(n, [])
    parNumero.get(n)!.push(p)
  }
  const doublons = Array.from(parNumero.entries()).filter(([, l]) => l.length > 1).map(([numero, personnes]) => ({ numero, personnes }))

  return {
    evenement: {
      id: evenement.id, nom: evenement.nom, date_debut: evenement.date_debut, date_fin: evenement.date_fin,
      reconnaissances_date_limite: evenement.reconnaissances_date_limite,
    },
    salles,
    types,
    surPlace,
    surPlaceParLeader,
    virtuel,
    doublons,
    autres: virtuel.filter(p => p.autre),
  }
}
