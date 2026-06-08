import { NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'

export async function POST(request: Request) {
  try {
    const supabase = await createClient()

    // Vérifier que c'est un admin
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

    const { data: compte } = await supabase.from('comptes').select('role').eq('id', user.id).single()
    if (compte?.role !== 'admin') return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

    const { evenement_id, compte_id, nom_pci } = await request.json()

    const token = crypto.randomUUID()

    const { error } = await supabase.from('billets').insert({
      evenement_id,
      compte_id,
      nom_pci,
      est_sans_frais: false,
      prix_paye: 0,
      stripe_payment_intent_id: null,
      qr_code_token: token,
      statut: 'vendu',
    })

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Erreur offrir billet:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}