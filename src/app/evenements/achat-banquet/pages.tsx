import { createClient } from '@/utils/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { redirect } from 'next/navigation'
import Navbar from '@/components/Navbar'
import FormulaireAchatBanquet from './FormulaireAchatBanquet'

const supabaseAdmin = createAdminClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

interface Props {
  searchParams: Promise<{ banquet_id?: string; billet_id?: string }>
}

export default async function AchatBanquetPage({ searchParams }: Props) {
  const { banquet_id, billet_id } = await searchParams

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/connexion')
  if (!banquet_id || !billet_id) redirect('/evenements')

  const { data: compte } = await supabase
    .from('comptes')
    .select('*')
    .eq('id', user.id)
    .single()

  if (compte?.statut !== 'actif') redirect('/evenements')

  // Charger le banquet
  const { data: banquet } = await supabaseAdmin
    .from('banquets')
    .select('*, evenement:evenements(*)')
    .eq('id', banquet_id)
    .single()

  if (!banquet) redirect('/evenements')

  // Charger le billet
  const { data: billet } = await supabaseAdmin
    .from('billets')
    .select('*')
    .eq('id', billet_id)
    .eq('compte_id', user.id)
    .eq('est_sans_frais', true)
    .single()

  if (!billet) redirect('/evenements')

  // Vérifier si le banquet est déjà acheté pour ce billet
  const { data: banquetExistant } = await supabaseAdmin
    .from('billets_banquets')
    .select('id')
    .eq('billet_id', billet_id)
    .eq('banquet_id', banquet_id)
    .neq('statut', 'rembourse')
    .single()

  if (banquetExistant) redirect('/evenements')

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#F5F3EE' }}>
      <Navbar prenom={compte?.prenom_1 ?? ''} role={compte?.role ?? ''} />
      <div className="max-w-xl mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold mb-6" style={{ color: '#1A2535' }}>Acheter le banquet</h1>
        <FormulaireAchatBanquet
          banquet={banquet}
          billet={billet}
          compte={compte}
          stripePublicKey={process.env.NEXT_PUBLIC_STRIPE_BANQUET_PUBLISHABLE_KEY!}
        />
      </div>
    </div>
  )
}