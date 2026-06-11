import { createClient } from '@/utils/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { redirect } from 'next/navigation'
import Navbar from '@/components/Navbar'
import Stripe from 'stripe'

const stripeBanquet = new Stripe(process.env.STRIPE_BANQUET_SECRET_KEY!)

const supabaseAdmin = createAdminClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

interface Props {
  searchParams: Promise<{
    banquet_id?: string
    billet_id?: string
    payment_intent?: string
  }>
}

export default async function ConfirmationBanquetPage({ searchParams }: Props) {
  const { banquet_id, billet_id, payment_intent } = await searchParams

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/connexion')
  if (!banquet_id || !billet_id || !payment_intent) redirect('/evenements')

  const { data: compte } = await supabase
    .from('comptes')
    .select('*')
    .eq('id', user.id)
    .single()

  const intent = await stripeBanquet.paymentIntents.retrieve(payment_intent)
  if (intent.status !== 'succeeded') redirect('/evenements')

  const { data: banquet } = await supabaseAdmin
    .from('banquets')
    .select('*, evenement:evenements(*)')
    .eq('id', banquet_id)
    .single()

  const { data: billet } = await supabaseAdmin
    .from('billets')
    .select('*')
    .eq('id', billet_id)
    .single()

  // Créer l'entrée dans billets_banquets si pas déjà créée
  const { data: banquetExistant } = await supabaseAdmin
    .from('billets_banquets')
    .select('id')
    .eq('stripe_payment_intent_id', payment_intent)
    .single()

  const meta = intent.metadata ?? {}
  const prixBase = parseFloat(meta.prix_base ?? '0')
  const tps = parseFloat(meta.tps ?? '0')
  const tvq = parseFloat(meta.tvq ?? '0')
  const fraisStripe = parseFloat(meta.frais_stripe ?? '0')
  const prixTotal = parseFloat(meta.prix_total ?? '0')

  if (!banquetExistant) {
    const token = crypto.randomUUID()
    await supabaseAdmin.from('billets_banquets').insert({
      billet_id,
      banquet_id,
      compte_id: user.id,
      nom_pci: billet?.nom_pci ?? '',
      prix_paye: prixBase,
      tps,
      tvq,
      frais_stripe: fraisStripe,
      prix_total: prixTotal,
      stripe_payment_intent_id: payment_intent,
      qr_code_token: token,
      statut: 'vendu',
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

          <h1 className="text-2xl font-bold mb-2" style={{ color: '#1A2535' }}>Banquet confirmé!</h1>
          <p className="text-sm mb-6" style={{ color: '#666666' }}>Votre place au banquet a été réservée avec succès.</p>

          <div className="rounded-lg p-4 mb-4 text-left space-y-2" style={{ backgroundColor: '#F5F3EE' }}>
            <p className="font-bold" style={{ color: '#1A2535' }}>{banquet?.nom}</p>
            <p className="text-sm" style={{ color: '#666666' }}>{banquet?.evenement?.nom}</p>
            <p className="text-sm" style={{ color: '#666666' }}>Pour : <strong>{billet?.nom_pci}</strong></p>
          </div>

          {/* Détail paiement */}
          <div className="rounded-lg p-4 mb-6 text-left space-y-2 text-sm" style={{ backgroundColor: '#F5F3EE' }}>
            <p className="font-bold mb-2" style={{ color: '#1A2535' }}>Détail du paiement</p>
            <div className="flex justify-between" style={{ color: '#666666' }}>
              <span>Sous-total</span>
              <span>{prixBase.toFixed(2)} $</span>
            </div>
            <div className="flex justify-between" style={{ color: '#666666' }}>
              <span>TPS (5%)</span>
              <span>{tps.toFixed(2)} $</span>
            </div>
            <div className="flex justify-between" style={{ color: '#666666' }}>
              <span>TVQ (9.975%)</span>
              <span>{tvq.toFixed(2)} $</span>
            </div>
            <div className="flex justify-between" style={{ color: '#666666' }}>
              <span>Frais de traitement</span>
              <span>{fraisStripe.toFixed(2)} $</span>
            </div>
            <div className="flex justify-between font-bold border-t pt-2" style={{ borderColor: '#C9A84C', color: '#1A2535' }}>
              <span>Total payé</span>
              <span>{prixTotal.toFixed(2)} $</span>
            </div>
          </div>

          <a href="/evenements" className="block w-full py-3 rounded-lg text-white font-medium text-sm text-center" style={{ backgroundColor: '#C9A84C' }}>
            Retour aux événements
          </a>

        </div>
      </div>
    </div>
  )
}