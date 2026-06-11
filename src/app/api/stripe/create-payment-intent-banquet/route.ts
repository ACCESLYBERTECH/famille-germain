import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { createClient } from '@/utils/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'

const stripeBanquet = new Stripe(process.env.STRIPE_BANQUET_SECRET_KEY!)

const supabaseAdmin = createAdminClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const TAUX_TPS = 0.05
const TAUX_TVQ = 0.09975
const STRIPE_PCT = 0.029
const STRIPE_FIXE = 0.30

function calculerTaxesEtFrais(prixBase: number) {
  const tps = Math.round(prixBase * TAUX_TPS * 100) / 100
  const tvq = Math.round(prixBase * TAUX_TVQ * 100) / 100
  const sousTotalTaxe = prixBase + tps + tvq
  const totalGrossUp = Math.round(((sousTotalTaxe + STRIPE_FIXE) / (1 - STRIPE_PCT)) * 100) / 100
  const fraisStripe = Math.round((totalGrossUp - sousTotalTaxe) * 100) / 100
  return { tps, tvq, fraisStripe, totalGrossUp }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ erreur: 'Non autorisé' }, { status: 401 })

    const { banquet_id, billet_id } = await request.json()

    // Charger le banquet
    const { data: banquet } = await supabaseAdmin
      .from('banquets')
      .select('*')
      .eq('id', banquet_id)
      .single()

    if (!banquet) return NextResponse.json({ erreur: 'Banquet introuvable' }, { status: 404 })

    // Vérifier que le billet appartient au PCI et est sans frais
    const { data: billet } = await supabaseAdmin
      .from('billets')
      .select('*')
      .eq('id', billet_id)
      .eq('compte_id', user.id)
      .eq('est_sans_frais', true)
      .single()

    if (!billet) return NextResponse.json({ erreur: 'Billet invalide' }, { status: 403 })

    // Vérifier pas de doublon
    const { data: banquetExistant } = await supabaseAdmin
      .from('billets_banquets')
      .select('id')
      .eq('billet_id', billet_id)
      .eq('banquet_id', banquet_id)
      .neq('statut', 'rembourse')
      .single()

    if (banquetExistant) return NextResponse.json({ erreur: 'Banquet déjà acheté pour ce billet' }, { status: 400 })

    const { tps, tvq, fraisStripe, totalGrossUp } = calculerTaxesEtFrais(banquet.prix)

    const paymentIntent = await stripeBanquet.paymentIntents.create({
      amount: Math.round(totalGrossUp * 100),
      currency: 'cad',
      metadata: {
        banquet_id,
        billet_id,
        compte_id: user.id,
        nom_pci: billet.nom_pci,
        prix_base: banquet.prix.toString(),
        tps: tps.toString(),
        tvq: tvq.toString(),
        frais_stripe: fraisStripe.toString(),
        prix_total: totalGrossUp.toString(),
      },
    })

    return NextResponse.json({
      client_secret: paymentIntent.client_secret,
      sous_total: banquet.prix,
      tps,
      tvq,
      frais_stripe: fraisStripe,
      prix_total: totalGrossUp,
    })

  } catch (error) {
    console.error('Stripe banquet error:', error)
    return NextResponse.json({ erreur: 'Erreur serveur' }, { status: 500 })
  }
}