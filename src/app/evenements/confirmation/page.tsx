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
    noms?: string
    payment_intent?: string
  }>
}

export default async function ConfirmationPage({ searchParams }: Props) {
  const { evenement_id, nom_pci, noms, payment_intent } = await searchParams

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/connexion')
  if (!evenement_id || !payment_intent) redirect('/evenements')

  const { data: compte } = await supabase
    .from('comptes')
    .select('*')
    .eq('id', user.id)
    .single()

  const intent = await stripe.paymentIntents.retrieve(payment_intent)
  if (intent.status !== 'succeeded') redirect('/evenements')

  const { data: evenement } = await supabase
    .from('evenements')
    .select('*')
    .eq('id', evenement_id)
    .single()

  // Déterminer la liste des noms à créer
  let nomsListe: string[] = []
  if (noms) {
    try { nomsListe = JSON.parse(decodeURIComponent(noms)) } catch { nomsListe = [] }
  }
  if (nomsListe.length === 0 && nom_pci) {
    nomsListe = [decodeURIComponent(nom_pci)]
  }

  // Créer un billet par personne si pas déjà créés
  const { data: billetsExistants } = await supabase
    .from('billets')
    .select('id, nom_pci')
    .eq('stripe_payment_intent_id', payment_intent)

  const nomsDejaCrees = (billetsExistants ?? []).map((b: { nom_pci: string }) => b.nom_pci)

  for (const nom of nomsListe) {
    if (nomsDejaCrees.includes(nom)) continue

    const token = crypto.randomUUID()
    const prixParBillet = intent.amount / 100 / nomsListe.length

    await supabase.from('billets').insert({
      evenement_id,
      compte_id: user.id,
      nom_pci: nom,
      leader_id: compte?.leader_id ?? null,
      est_sans_frais: prixParBillet === 0,
      prix_paye: prixParBillet,
      stripe_payment_intent_id: payment_intent,
      qr_code_token: token,
      statut: 'vendu',
    })
  }

  // Envoyer email de confirmation
  if (compte?.courriel && evenement && nomsDejaCrees.length === 0) {
    await envoyerConfirmationBillet({
      prenom: compte.prenom_1,
      nom: compte.nom_1,
      email: compte.courriel,
      evenement: evenement.nom,
      ville: '',
      date: new Date(evenement.date_debut).toLocaleDateString('fr-CA', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }),
      prix: (intent.amount / 100).toFixed(2),
    })

    // Notifier l'admin
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
          <p className="text-sm mb-6" style={{ color: '#666666' }}>
            {nomsListe.length > 1 ? 'Vos billets ont été créés avec succès.' : 'Votre billet a été créé avec succès.'}
          </p>

          <div className="rounded-lg p-4 mb-6 text-left space-y-2" style={{ backgroundColor: '#F5F3EE' }}>
            <p className="font-bold" style={{ color: '#1A2535' }}>{evenement?.nom}</p>
            <p className="text-sm" style={{ color: '#666666' }}>
              {evenement && new Date(evenement.date_debut).toLocaleDateString('fr-CA', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
            </p>
            {nomsListe.map(nom => (
              <p key={nom} className="text-sm" style={{ color: '#666666' }}>Billet pour : <strong>{nom}</strong></p>
            ))}
            <p className="text-sm" style={{ color: '#666666' }}>Montant payé : <strong>{(intent.amount / 100).toFixed(2)} $</strong></p>
          </div>

          <a href="/evenements/mes-billets" className="block w-full py-3 rounded-lg text-white font-medium text-sm text-center" style={{ backgroundColor: '#C9A84C' }}>Voir mes billets</a>

        </div>
      </div>
    </div>
  )
}