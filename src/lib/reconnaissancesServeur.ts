import { createClient } from '@/utils/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { saisieOuverte, cleNumero } from '@/lib/reconnaissances'

export const supabaseAdmin = createAdminClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// Qui fait la demande, et peut-il entrer des reconnaissances pour cet événement ?
export async function verifierAcces(evenementId: unknown): Promise<
  | { ok: true; userId: string; estAdmin: boolean; evenement: { id: string; date_debut: string; reconnaissances_date_limite: string | null } }
  | { ok: false; erreur: string; statut: number }
> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { ok: false, erreur: 'Non autorisé', statut: 401 }

  const { data: compte } = await supabaseAdmin.from('comptes').select('role, statut').eq('id', user.id).single()
  const estAdmin = compte?.role === 'admin'
  if (!estAdmin && !(compte?.role === 'leader' && compte?.statut === 'actif')) {
    return { ok: false, erreur: 'Réservé aux leaders Platines et plus', statut: 403 }
  }

  if (typeof evenementId !== 'string') return { ok: false, erreur: 'Événement manquant', statut: 400 }
  const { data: evenement } = await supabaseAdmin
    .from('evenements')
    .select('id, date_debut, a_reconnaissances, reconnaissances_date_limite')
    .eq('id', evenementId)
    .single()
  if (!evenement || !evenement.a_reconnaissances) {
    return { ok: false, erreur: "Cet événement n'a pas de reconnaissances", statut: 400 }
  }
  if (!estAdmin && !saisieOuverte(evenement)) {
    return { ok: false, erreur: 'La date limite est passée : les reconnaissances de cet événement sont verrouillées.', statut: 403 }
  }
  return { ok: true, userId: user.id, estAdmin, evenement }
}

// Les leaders AU-DESSUS d'un leader (son leader, le leader de son leader, etc.)
export async function leadersAuDessus(userId: string): Promise<{ id: string; nom: string }[]> {
  const resultat: { id: string; nom: string }[] = []
  const vus = new Set<string>([userId])
  const { data: moi } = await supabaseAdmin.from('comptes').select('leader_id').eq('id', userId).single()
  let suivant: string | null = moi?.leader_id ?? null
  for (let i = 0; i < 20 && suivant && !vus.has(suivant); i++) {
    vus.add(suivant)
    const { data: c } = await supabaseAdmin.from('comptes').select('id, prenom_1, nom_1, role, leader_id').eq('id', suivant).single()
    if (!c) break
    if (c.role === 'leader') resultat.push({ id: c.id, nom: `${c.prenom_1 ?? ''} ${c.nom_1 ?? ''}`.trim() })
    suivant = c.leader_id ?? null
  }
  return resultat
}

// Entrées virtuelles faites par un leader au-dessus, mais SEULEMENT pour des personnes de l'équipe
// du leader (lui-même et tout son arbre), reconnues par compte ou par numéro de PCI.
// Jamais les autres entrées du leader du haut.
export async function entreesDesLeadersDuHaut(
  userId: string,
  evenementIds: string[],
  equipe: { id: string; numero_amway: string | null }[],
): Promise<any[]> {
  if (evenementIds.length === 0) return []
  const auDessus = await leadersAuDessus(userId)
  if (auDessus.length === 0) return []
  const { data } = await supabaseAdmin
    .from('reconnaissances_virtuel')
    .select('*')
    .in('evenement_id', evenementIds)
    .in('leader_id', auDessus.map(l => l.id))
    .order('created_at', { ascending: true })
  const idsEquipe = new Set(equipe.map(p => p.id))
  const numerosEquipe = new Set(equipe.map(p => cleNumero(p.numero_amway)).filter(Boolean))
  return (data ?? [])
    .filter(e => (e.compte_id && idsEquipe.has(e.compte_id)) || (cleNumero(e.numero_amway) && numerosEquipe.has(cleNumero(e.numero_amway))))
    .map(e => ({ ...e, entre_par: auDessus.find(l => l.id === e.leader_id)?.nom ?? 'votre leader' }))
}
