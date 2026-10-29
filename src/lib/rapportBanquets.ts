import { createClient as createAdminClient } from '@supabase/supabase-js'
import { formaterAllergies } from '@/lib/allergies'
import { correspondGroupe, SANS_GROUPE } from '@/lib/groupes'

// Données du Rapport banquets — partagées entre la page imprimable et l'envoi par courriel
// (côté serveur seulement : utilise la clé service_role)

const supabaseAdmin = createAdminClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export interface FiltresRapportBanquets {
  evenementId: string
  leaderId: string
  filtreBanquet: string // 'tous' | 'avec' | 'sans'
  groupe?: string       // '' = tous, '__aucun__' = sans groupe, sinon clé du groupe
}

export interface LigneRapportBanquets {
  nom: string
  courriel: string
  leader: string
  groupe: string
  sansFrais: boolean
  aBanquet: boolean
  virtuel: boolean
  allergies: string // 'Aucune' si rien
}

export interface RapportBanquets {
  lignes: LigneRapportBanquets[]
  sousTitre: string
  dateGeneration: string
  totalAvec: number
  totalSans: number
  totalAllergies: number
  leadersActifs: { id: string; nom: string; courriel: string }[]
}

export async function chargerRapportBanquets({ evenementId, leaderId, filtreBanquet, groupe = '' }: FiltresRapportBanquets): Promise<RapportBanquets> {
  const { data: leaders } = await supabaseAdmin
    .from('comptes')
    .select('id, prenom_1, nom_1, courriel, statut')
    .eq('role', 'leader')
    .in('statut', ['actif', 'inactif'])
    .order('nom_1', { ascending: true })

  let billetsQuery = supabaseAdmin
    .from('billets')
    .select('*, evenements(id, nom, a_banquet), comptes!billets_compte_id_fkey(prenom_1, nom_1, courriel, leader_id, groupe)')
    .neq('statut', 'rembourse')

  if (evenementId) {
    billetsQuery = billetsQuery.eq('evenement_id', evenementId)
  } else {
    const { data: evIds } = await supabaseAdmin.from('evenements').select('id').eq('a_banquet', true)
    const ids = (evIds ?? []).map((e: any) => e.id)
    if (ids.length > 0) billetsQuery = billetsQuery.in('evenement_id', ids)
  }

  const { data: billets } = await billetsQuery.order('created_at', { ascending: false })

  const billetIds = (billets ?? []).map((b: any) => b.id)
  const { data: banquetsAchetes } = billetIds.length > 0
    ? await supabaseAdmin.from('billets_banquets').select('*').in('billet_id', billetIds).neq('statut', 'rembourse')
    : { data: [] }

  let billetsFiltres = billets ?? []
  if (leaderId) billetsFiltres = billetsFiltres.filter((b: any) => b.comptes?.leader_id === leaderId)
  if (groupe) billetsFiltres = billetsFiltres.filter((b: any) => correspondGroupe(b.comptes?.groupe, groupe))

  const lignes: LigneRapportBanquets[] = billetsFiltres.map((billet: any) => {
    const banquetAchete = billet.est_sans_frais
      ? (banquetsAchetes ?? []).find((b: any) => b.billet_id === billet.id)
      : null
    const aBanquet = !billet.est_sans_frais || !!banquetAchete
    const allergiesRaw = billet.est_sans_frais ? banquetAchete?.allergies : billet.allergies
    const leader = (leaders ?? []).find((l: any) => l.id === billet.comptes?.leader_id)
    return {
      nom: billet.nom_pci ?? '',
      courriel: billet.comptes?.courriel ?? '',
      leader: leader ? `${leader.prenom_1} ${leader.nom_1}` : '',
      groupe: billet.comptes?.groupe ?? '',
      sansFrais: !!billet.est_sans_frais,
      aBanquet,
      virtuel: billet.mode_participation === 'virtuel',
      allergies: formaterAllergies(allergiesRaw, billet.nom_pci),
    }
  }).filter(l => {
    if (filtreBanquet === 'avec') return l.aBanquet
    if (filtreBanquet === 'sans') return !l.aBanquet
    return true
  })

  const nomEvenement = evenementId ? (billets ?? [])[0]?.evenements?.nom ?? '' : 'Tous les événements avec banquet'
  const leaderFiltre = leaderId ? (leaders ?? []).find((l: any) => l.id === leaderId) : null
  const sousTitre = [
    nomEvenement,
    leaderFiltre ? `Leader : ${leaderFiltre.prenom_1} ${leaderFiltre.nom_1}` : '',
    groupe ? `Groupe : ${groupe === SANS_GROUPE ? 'Sans groupe' : groupe}` : '',
    filtreBanquet === 'avec' ? 'Avec banquet seulement' : filtreBanquet === 'sans' ? 'Sans banquet seulement' : '',
  ].filter(Boolean).join(' · ')

  return {
    lignes,
    sousTitre,
    dateGeneration: new Date().toLocaleDateString('fr-CA', { timeZone: 'America/Toronto', weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }),
    totalAvec: lignes.filter(l => l.aBanquet).length,
    totalSans: lignes.filter(l => !l.aBanquet).length,
    totalAllergies: lignes.filter(l => l.aBanquet && l.allergies !== 'Aucune').length,
    leadersActifs: (leaders ?? [])
      .filter((l: any) => l.statut === 'actif' && l.courriel)
      .map((l: any) => ({ id: l.id, nom: `${l.prenom_1} ${l.nom_1}`, courriel: l.courriel })),
  }
}
