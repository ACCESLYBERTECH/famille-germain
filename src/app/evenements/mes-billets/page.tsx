import { createClient } from '@/utils/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { redirect } from 'next/navigation'
import Navbar from '@/components/Navbar'
import MesBilletsClient from './MesBilletsClient'

const supabaseAdmin = createAdminClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export default async function MesBilletsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/connexion')

  const { data: compte } = await supabase
    .from('comptes')
    .select('*')
    .eq('id', user.id)
    .single()

  const maintenant = new Date()

  const { data: billets } = await supabase
    .from('billets')
    .select('*, evenement:evenements(*)')
    .eq('compte_id', user.id)
    .neq('statut', 'rembourse')
    .order('created_at', { ascending: false })

  const billetsFiltres = (billets ?? []).filter(b => {
    if (!b.evenement) return false
    const dateFin = new Date(b.evenement.date_fin)
    dateFin.setDate(dateFin.getDate() + 30)
    return dateFin >= maintenant
  })

  // Charger les banquets achetés par le PCI
  const billetIds = billetsFiltres.map(b => b.id)
  const { data: banquetsAchetes } = billetIds.length > 0
    ? await supabaseAdmin
        .from('billets_banquets')
        .select('*, banquets(nom, evenement:evenements(nom))')
        .in('billet_id', billetIds)
        .eq('compte_id', user.id)
        .neq('statut', 'rembourse')
    : { data: [] }

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#F5F3EE' }}>
      <Navbar prenom={compte?.prenom_1 ?? ''} role={compte?.role ?? ''} />
      <div className="max-w-3xl mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold mb-6" style={{ color: '#1A2535' }}>Mes billets</h1>
        <MesBilletsClient billets={billetsFiltres} banquetsAchetes={banquetsAchetes ?? []} />
      </div>
    </div>
  )
}