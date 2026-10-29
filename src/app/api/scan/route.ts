import { NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { peutScanner } from '@/lib/acces'
import { braceletsEvenement } from '@/lib/bracelets'

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
    if (!compte || !peutScanner(compte.role)) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
    }

    const { token, evenement_id, ville_id } = await request.json()

    // Récupérer le billet avec l'événement
    const { data: billet } = await supabaseAdmin
      .from('billets')
      .select('*, evenements(*, banquet:banquets(id))')
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

    // Vérifier si l'événement a un banquet et si ce PCI l'a acheté
    const abanquet = billet.evenements?.a_banquet
    let banquetAchete = false

    if (abanquet && billet.est_sans_frais) {
      const banquetEvenement = billet.evenements?.banquet?.[0]
      if (banquetEvenement) {
        const { data: achatBanquet } = await supabaseAdmin
          .from('billets_banquets')
          .select('id')
          .eq('billet_id', billet.id)
          .eq('banquet_id', banquetEvenement.id)
          .neq('statut', 'rembourse')
          .single()
        banquetAchete = !!achatBanquet
      }
    }

    // Marquer comme utilisé avec ville et portier
    await supabaseAdmin.from('billets').update({
      statut: 'utilise',
      scanne_le: new Date().toISOString(),
      scanne_ville_id: ville_id || null,
      scanne_par_id: user.id,
    }).eq('id', billet.id)

    // Construire le message selon les 3 cas — couleurs des bracelets de l'événement
    // Sans bracelets : couleurs standard du site et aucune mention de bracelet
    const avecBracelets = abanquet && billet.evenements?.a_bracelets !== false
    const bracelets = avecBracelets ? braceletsEvenement(billet.evenements) : braceletsEvenement(null)
    let message = ''
    let couleurResultat = 'succes'
    let couleur = '#4CAF7D'
    let bracelet: string | null = null

    if (!billet.est_sans_frais) {
      // Billet régulier payant — banquet inclus
      message = 'BILLET RÉGULIER'
      couleurResultat = 'regulier'
      couleur = bracelets.regulier.couleur
      if (avecBracelets) bracelet = bracelets.regulier.nom
    } else if (abanquet && banquetAchete) {
      // Sans frais avec banquet
      message = 'SANS FRAIS — AVEC BANQUET'
      couleurResultat = 'sf_banquet'
      couleur = bracelets.sf_banquet.couleur
      if (avecBracelets) bracelet = bracelets.sf_banquet.nom
    } else if (abanquet && !banquetAchete) {
      // Sans frais sans banquet
      message = 'SANS FRAIS — SANS BANQUET'
      couleurResultat = 'sf_sans_banquet'
      couleur = bracelets.sf_sans_banquet.couleur
      if (avecBracelets) bracelet = bracelets.sf_sans_banquet.nom
    } else {
      // Sans frais, événement sans banquet
      message = '✅ BILLET SANS FRAIS'
      couleurResultat = 'succes'
    }

    return NextResponse.json({
      resultat: 'succes',
      couleurResultat,
      couleur,
      bracelet,
      message,
      sousTitre: billet.nom_pci,
    })

  } catch (error: any) {
    console.error('Erreur scan:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}