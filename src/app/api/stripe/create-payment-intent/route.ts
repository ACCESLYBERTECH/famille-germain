import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { createClient } from '@/utils/supabase/server'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!)

const TAUX_TPS = 0.05
const TAUX_TVQ = 0.09975
const STRIPE_PCT = 0.029
const STRIPE_FIXE = 0.30

function calculerTaxesEtFrais(prixBase: number, quantite: number) {
  const sousTotal = prixBase * quantite
  const tps = Math.round(sousTotal * TAUX_TPS * 100) / 100
  const tvq = Math.round(sousTotal * TAUX_TVQ * 100) / 100
  const sousTotalTaxe = sousTotal + tps + tvq
  const totalGrossUp = Math.round(((sousTotalTaxe + STRIPE_FIXE) / (1 - STRIPE_PCT)) * 100) / 100
  const fraisStripe = Math.round((totalGrossUp - sousTotalTaxe) * 100) / 100
  return { sousTotal, tps, tvq, fraisStripe, totalGrossUp }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) return NextResponse.json({ erreur: 'Non autorisé' }, { status: 401 })

    const { evenement_id, nom_pci, est_sans_frais, quantite = 1 } = await request.json()

    const { data: evenement } = await supabase
      .from('evenements')
      .select('*, paliers:evenement_paliers(*)')
      .eq('id', evenement_id)
      .single()

    if (!evenement) return NextResponse.json({ erreur: 'Événement introuvable' }, { status: 404 })

    const { data: compte } = await supabase
      .from('comptes')
      .select('*')
      .eq('id', user.id)
      .single()

    if (!compte || compte.statut !== 'actif') return NextResponse.json({ erreur: 'Compte inactif' }, { status: 403 })

    // Si sans frais — créer les billets directement sans Stripe
    if (est_sans_frais) {
      const noms = nom_pci.includes(' & ') ? nom_pci.split(' & ') : [nom_pci]

      for (const nom of noms) {
        const { data: billetExistant } = await supabase
          .from('billets')
          .select('id')
          .eq('evenement_id', evenement_id)
          .eq('compte_id', user.id)
          .eq('nom_pci', nom.trim())
          .neq('statut', 'rembourse')
          .single()

        if (billetExistant) continue

        const token = crypto.randomUUID()
        await supabase.from('billets').insert({
          evenement_id,
          compte_id: user.id,
          nom_pci: nom.trim(),
          leader_id: compte.leader_id,
          est_sans_frais: true,
          prix_paye: 0,
          tps: 0,
          tvq: 0,
          frais_stripe: 0,
          prix_total: 0,
          qr_code_token: token,
          statut: 'vendu',
        })
      }

      return NextResponse.json({ sans_frais: true })
    }

    // Calculer le prix actuel
    const maintenant = new Date()
    const paliers = (evenement.paliers ?? []).sort((a: { ordre: number }, b: { ordre: number }) => a.ordre - b.ordre)
    const palierActuel = paliers.find((p: { date_fin: string }) => new Date(p.date_fin) > maintenant)
    const prix = palierActuel ? palierActuel.prix : paliers[paliers.length - 1]?.prix ?? 0

    const { sousTotal, tps, tvq, fraisStripe, totalGrossUp } = calculerTaxesEtFrais(prix, quantite)

    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(totalGrossUp * 100),
      currency: 'cad',
      metadata: {
        evenement_id,
        compte_id: user.id,
        nom_pci,
        quantite: quantite.toString(),
        prix_base: prix.toString(),
        tps: tps.toString(),
        tvq: tvq.toString(),
        frais_stripe: fraisStripe.toString(),
        prix_total: totalGrossUp.toString(),
      },
    })

    return NextResponse.json({
      client_secret: paymentIntent.client_secret,
      prix,
      tps,
      tvq,
      frais_stripe: fraisStripe,
      prix_total: totalGrossUp,
    })

  } catch (error) {
    console.error('Stripe error:', error)
    return NextResponse.json({ erreur: 'Erreur serveur' }, { status: 500 })
  }
}