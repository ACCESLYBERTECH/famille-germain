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

  // Récupérer les métadonnées de taxes depuis le PaymentIntent
  const meta = intent.metadata ?? {}
  const prixBase = parseFloat(meta.prix_base ?? '0')
  const tpsMeta = parseFloat(meta.tps ?? '0')
  const tvqMeta = parseFloat(meta.tvq ?? '0')
  const fraisStripeMeta = parseFloat(meta.frais_stripe ?? '0')
  const prixTotalMeta = parseFloat(meta.prix_total ?? '0')

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
  const quantite = nomsListe.length || 1

  for (const nom of nomsListe) {
    if (nomsDejaCrees.includes(nom)) continue

    const token = crypto.randomUUID()

    await supabase.from('billets').insert({
      evenement_id,
      compte_id: user.id,
      nom_pci: nom,
      leader_id: compte?.leader_id ?? null,
      est_sans_frais: false,
      prix_paye: prixBase,
      tps: Math.round((tpsMeta / quantite) * 100) / 100,
      tvq: Math.round((tvqMeta / quantite) * 100) / 100,
      frais_stripe: Math.round((fraisStripeMeta / quantite) * 100) / 100,
      prix_total: Math.round((prixTotalMeta / quantite) * 100) / 100,
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
      prix: prixTotalMeta.toFixed(2),
    })

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

  // Détail affiché sur la page
  const sousTotalAffiche = prixBase * quantite
  const tpsAffiche = tpsMeta
  const tvqAffiche = tvqMeta
  const fraisStripeAffiche = fraisStripeMeta
  const totalAffiche = prixTotalMeta || intent.amount / 100

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#F5F3EE' }}>
      <Navbar prenom={compte?.prenom_1 ?? ''} role={compte?.role ?? ''} />
      <div className="max-w-xl mx-auto px-4 py-8">
        <div className="bg-white rounded-2xl shadow-lg p-8 text-center">

          <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4" style={{ backgroundColor: '#4CAF7D' }}>
            <span className="text-white text-3xl">✓</span>
          </div>

          <h1 className="text-2xl font-bold mb-2" style={{ color: '#1A2535' }}>Paiement confirmé!</h1>
          <p className="text-sm mb-6" style={{ color: '#666666' }}>
            {nomsListe.length > 1 ? 'Vos billets ont été créés avec succès.' : 'Votre billet a été créé avec succès.'}
          </p>

          {/* Résumé événement et billets */}
          <div className="rounded-lg p-4 mb-4 text-left space-y-2" style={{ backgroundColor: '#F5F3EE' }}>
            <p className="font-bold" style={{ color: '#1A2535' }}>{evenement?.nom}</p>
            <p className="text-sm" style={{ color: '#666666' }}>
              {evenement && new Date(evenement.date_debut).toLocaleDateString('fr-CA', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
            </p>
            {nomsListe.map(nom => (
              <p key={nom} className="text-sm" style={{ color: '#666666' }}>Billet pour : <strong>{nom}</strong></p>
            ))}
          </div>

          {/* Détail du montant payé */}
          <div className="rounded-lg p-4 mb-6 text-left space-y-2 text-sm" style={{ backgroundColor: '#F5F3EE' }}>
            <p className="font-bold mb-2" style={{ color: '#1A2535' }}>Détail du paiement</p>
            <div className="flex justify-between" style={{ color: '#666666' }}>
              <span>Sous-total ({quantite} billet{quantite > 1 ? 's' : ''} × {prixBase.toFixed(2)} $)</span>
              <span>{sousTotalAffiche.toFixed(2)} $</span>
            </div>
            <div className="flex justify-between" style={{ color: '#666666' }}>
              <span>TPS (5%)</span>
              <span>{tpsAffiche.toFixed(2)} $</span>
            </div>
            <div className="flex justify-between" style={{ color: '#666666' }}>
              <span>TVQ (9.975%)</span>
              <span>{tvqAffiche.toFixed(2)} $</span>
            </div>
            <div className="flex justify-between" style={{ color: '#666666' }}>
              <span>Frais de traitement</span>
              <span>{fraisStripeAffiche.toFixed(2)} $</span>
            </div>
            <div className="flex justify-between font-bold border-t pt-2" style={{ borderColor: '#C9A84C', color: '#1A2535' }}>
              <span>Total payé</span>
              <span>{totalAffiche.toFixed(2)} $</span>
            </div>
          </div>

          <a href="/evenements/mes-billets" className="block w-full py-3 rounded-lg text-white font-medium text-sm text-center" style={{ backgroundColor: '#C9A84C' }}>
            Voir mes billets
          </a>

        </div>
      </div>
    </div>
  )
}