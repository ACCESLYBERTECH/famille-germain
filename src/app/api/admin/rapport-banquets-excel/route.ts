import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'

const supabaseAdmin = createAdminClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

    const { data: compte } = await supabase.from('comptes').select('role').eq('id', user.id).single()
    if (compte?.role !== 'admin') return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

    const { searchParams } = new URL(request.url)
    const evenementId = searchParams.get('evenement_id') ?? ''
    const leaderId = searchParams.get('leader_id') ?? ''

    // Charger les données
    const { data: leaders } = await supabaseAdmin
      .from('comptes')
      .select('id, prenom_1, nom_1')
      .eq('role', 'leader')
      .eq('statut', 'actif')

    let billetsQuery = supabaseAdmin
      .from('billets')
      .select('*, evenements(id, nom, a_banquet), comptes!billets_compte_id_fkey(prenom_1, nom_1, courriel, leader_id)')
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

    // Filtrer par leader si demandé
    let billetsFiltres = billets ?? []
    if (leaderId) {
      billetsFiltres = billetsFiltres.filter((b: any) => b.comptes?.leader_id === leaderId)
    }

    // Construire les lignes
    const lignes = billetsFiltres.map((billet: any) => {
      const banquetAchete = billet.est_sans_frais
        ? (banquetsAchetes ?? []).find((b: any) => b.billet_id === billet.id)
        : null
      const aBanquet = !billet.est_sans_frais || !!banquetAchete
      const allergiesRaw = billet.est_sans_frais ? banquetAchete?.allergies : billet.allergies
      const allergies = allergiesRaw ? JSON.parse(allergiesRaw).join(', ') : 'Aucune'
      const leaderNom = leaders?.find((l: any) => l.id === billet.comptes?.leader_id)
      return {
        nom: billet.nom_pci,
        courriel: billet.comptes?.courriel ?? '',
        leader: leaderNom ? `${leaderNom.prenom_1} ${leaderNom.nom_1}` : 'Aucun',
        evenement: billet.evenements?.nom ?? '',
        type: billet.est_sans_frais ? 'Sans frais' : 'Régulier (payant)',
        banquet: aBanquet ? 'Avec banquet' : 'Sans banquet',
        mode: billet.mode_participation === 'virtuel' ? 'Virtuel' : 'Sur place',
        allergies,
        date: new Date(billet.created_at).toLocaleDateString('fr-CA'),
      }
    })

    return NextResponse.json({ lignes, total: lignes.length })

  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}