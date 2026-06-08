import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import Navbar from '@/components/Navbar'
import Stripe from 'stripe'
import { envoyerConfirmationBillet } from '@/lib/email'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!)

interface Props {
  searchParams: Promise<{
    evenement_id?: string
    nom_pci?: string
    payment_intent?: string
  }>
}

export default async function ConfirmationPage({ searchParams }: Props) {
  const { evenement_id, nom_pci, payment_intent } = await searchParams

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/connexion')
  if (!evenement_id || !nom_pci || !payment_intent) redirect('/evenements')

  const { data: compte } = await supabase
    .from('comptes')
    .select('*')
    .eq('id', user.id)
    .single()

  const intent = await stripe.paymentIntents.retrieve(payment_intent)

  if (intent.status !== 'succeeded') redirect('/evenements')

  const { data: billetExistant } = await supabase
    .from('billets')
    .select('id, qr_code_token')
    .eq('stripe_payment_intent_id', payment_intent)
    .single()

  let qrToken = billetExistant?.qr_code_token

  const { data: evenement } = await supabase
    .from('evenements')
    .select('*')
    .eq('id', evenement_id)
    .single()

  if (!billetExistant) {
    const token = crypto.randomUUID()
    await supabase.from('billets').insert({
      evenement_id,
      compte_id: user.id,
      nom_pci: decodeURIComponent(nom_pci),
      leader_id: compte?.leader_id ?? null,
      est_sans_frais: false,
      prix_paye: intent.amount / 100,
      stripe_payment_intent_id: payment_intent,
      qr_code_token: token,
      statut: 'vendu',
    })
    qrToken = token

    // Envoyer email de confirmation au PCI
    if (compte?.courriel && evenement) {
      await envoyerConfirmationBillet({
        prenom: compte.prenom_1,
        nom: compte.nom_1,
        email: compte.courriel,
        evenement: evenement.nom,
        ville: evenement.ville ?? '',
        date: new Date(evenement.date_debut).toLocaleDateString('fr-CA', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }),
        prix: (intent.amount / 100).toFixed(2),
      })
    }

    // Notifier l'admin du nouvel achat
    await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/emails/notification-admin`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: 'nouveau_billet',
        prenomPCI: compte?.prenom_1,
        nomPCI: compte?.nom_1,
        evenement: evenement?.nom,
        ville: '',
      }),
    })
  }

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#F5F3EE' }}>
      <Navbar prenom={compte?.prenom_1 ?? ''} role={compte?.role ?? ''} />
      <div className="max-w-xl mx-auto px-4 py-8">
        <div className="bg-white rounded-2xl shadow-lg p-8 text-center">

          <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4" style={{ backgroundColor: '#4CAF7D' }}>
            <span className="text-white text-3xl">✓</span>
          </div>

          <h1 className="text-2xl font-bold mb-2" style={{ color: '#1A2535' }}>Paiement confirmé !</h1>

          <p className="text-sm mb-6" style={{ color: '#666666' }}>Votre billet a été créé avec succès.</p>

          <div className="rounded-lg p-4 mb-6 text-left space-y-2" style={{ backgroundColor: '#F5F3EE' }}>
            <p className="font-bold" style={{ color: '#1A2535' }}>{evenement?.nom}</p>
            <p className="text-sm" style={{ color: '#666666' }}>
              {evenement && new Date(evenement.date_debut).toLocaleDateString('fr-CA', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
            </p>
            <p className="text-sm" style={{ color: '#666666' }}>Billet pour : <strong>{decodeURIComponent(nom_pci)}</strong></p>
            <p className="text-sm" style={{ color: '#666666' }}>Montant payé : <strong>{(intent.amount / 100).toFixed(2)} $</strong></p>
          </div>

          <a href="/evenements/mes-billets" className="block w-full py-3 rounded-lg text-white font-medium text-sm text-center" style={{ backgroundColor: '#C9A84C' }}>Voir mes billets</a>

        </div>
      </div>
    </div>
  )
}