import { NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'
import Stripe from 'stripe'
import { envoyerConfirmationRemboursement } from '@/lib/email'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!)

export async function POST(request: Request) {
  try {
    const supabase = await createClient()

    // Vérifier que c'est un admin
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

    const { data: compte } = await supabase.from('comptes').select('role').eq('id', user.id).single()
    if (compte?.role !== 'admin') return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

    const { billet_id } = await request.json()

    // Récupérer le billet avec les infos de l'événement et du PCI
    const { data: billet } = await supabase
      .from('billets')
      .select('*, evenements(*), comptes(*)')
      .eq('id', billet_id)
      .single()

    if (!billet) return NextResponse.json({ error: 'Billet introuvable' }, { status: 404 })
    if (billet.statut === 'rembourse') return NextResponse.json({ error: 'Billet déjà remboursé' }, { status: 400 })
    if (!billet.stripe_payment_intent_id) return NextResponse.json({ error: 'Aucun paiement Stripe associé' }, { status: 400 })

    // Effectuer le remboursement Stripe
    await stripe.refunds.create({
      payment_intent: billet.stripe_payment_intent_id,
    })

    // Mettre à jour le statut du billet dans Supabase
    await supabase.from('billets').update({ statut: 'rembourse' }).eq('id', billet_id)

    // Envoyer email de confirmation au PCI
    if (billet.comptes?.courriel) {
      await envoyerConfirmationRemboursement({
        prenom: billet.comptes.prenom_1,
        nom: billet.comptes.nom_1,
        email: billet.comptes.courriel,
        evenement: billet.evenements?.nom ?? '',
        ville: billet.evenements?.ville ?? '',
        montant: billet.prix_paye?.toFixed(2) ?? '0.00',
      })
    }

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Erreur remboursement:', error)
    return NextResponse.json({ error: error.message ?? 'Erreur remboursement' }, { status: 500 })
  }
}