import { NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'

const supabaseAdmin = createAdminClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

    const { data: compte } = await supabase.from('comptes').select('role').eq('id', user.id).single()
    if (!compte || !['portier', 'admin'].includes(compte.role)) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
    }

    const { token, evenement_id, ville_id } = await request.json()

    // Récupérer le billet
    const { data: billet } = await supabaseAdmin
      .from('billets')
      .select('*, evenements(nom, a_banquet)')
      .eq('qr_code_token', token.trim())
      .single()

    if (!billet) {
      return NextResponse.json({ resultat: 'invalide', message: '❌ BILLET INVALIDE' })
    }

    if (billet.statut === 'rembourse') {
      return NextResponse.json({ resultat: 'annule', message: '❌ BILLET ANNULÉ', sousTitre: 'Ce billet a été remboursé.' })
    }

    if (billet.statut === 'utilise') {
      const dateScan = billet.scanne_le ? new Date(billet.scanne_le).toLocaleString('fr-CA') : ''
      return NextResponse.json({ resultat: 'deja_scanne', message: '⚠️ BILLET DÉJÀ SCANNÉ', sousTitre: billet.nom_pci + ' · ' + dateScan })
    }

    if (evenement_id && billet.evenement_id !== evenement_id) {
      return NextResponse.json({ resultat: 'invalide', message: '❌ BILLET INVALIDE', sousTitre: 'Mauvais événement.' })
    }

    // Marquer comme utilisé avec ville et portier
    await supabaseAdmin.from('billets').update({
      statut: 'utilise',
      scanne_le: new Date().toISOString(),
      scanne_ville_id: ville_id || null,
      scanne_par_id: user.id,
    }).eq('id', billet.id)

    // Construire le message de succès
    const abanquet = billet.evenements?.a_banquet
    let message = ''
    if (billet.est_sans_frais && abanquet && billet.banquet_achete) {
      message = '✅ BILLET SANS FRAIS — AVEC BANQUET'
    } else if (billet.est_sans_frais && abanquet) {
      message = '✅ BILLET SANS FRAIS — SANS BANQUET'
    } else if (billet.est_sans_frais) {
      message = '✅ BILLET SANS FRAIS'
    } else {
      message = '✅ BILLET RÉGULIER'
    }

    return NextResponse.json({ resultat: 'succes', message, sousTitre: billet.nom_pci })

  } catch (error: any) {
    console.error('Erreur scan:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}