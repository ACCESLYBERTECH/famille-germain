import { createClient } from '@/utils/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { redirect } from 'next/navigation'
import Navbar from '@/components/Navbar'
import GestionBanquets from './GestionBanquets'

const supabaseAdmin = createAdminClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export default async function AdminBanquetsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/connexion')

  const { data: compte } = await supabase
    .from('comptes')
    .select('*')
    .eq('id', user.id)
    .single()

  if (compte?.role !== 'admin') redirect('/')

  // Tous les événements avec banquet
  const { data: evenements } = await supabaseAdmin
    .from('evenements')
    .select('id, nom, banquet:banquets(*)')
    .eq('a_banquet', true)
    .order('date_debut', { ascending: false })

  // Tous les leaders
  const { data: leaders } = await supabaseAdmin
    .from('comptes')
    .select('id, prenom_1, nom_1')
    .eq('role', 'leader')
    .eq('statut', 'actif')
    .order('nom_1', { ascending: true })

  // Tous les billets des événements avec banquet
  const evenementIds = (evenements ?? []).map((e: any) => e.id)

  const { data: billets } = evenementIds.length > 0
    ? await supabaseAdmin
        .from('billets')
        .select('*, evenements(nom, a_banquet), comptes!billets_compte_id_fkey(prenom_1, nom_1, courriel, leader_id)')
        .in('evenement_id', evenementIds)
        .neq('statut', 'rembourse')
        .order('created_at', { ascending: false })
    : { data: [] }

  // Tous les banquets achetés séparément (sans frais)
  const billetIds = (billets ?? []).map((b: any) => b.id)

  const { data: banquetsAchetes } = billetIds.length > 0
    ? await supabaseAdmin
        .from('billets_banquets')
        .select('*')
        .in('billet_id', billetIds)
        .neq('statut', 'rembourse')
    : { data: [] }

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#F5F3EE' }}>
      <Navbar prenom={compte?.prenom_1 ?? ''} role={compte?.role ?? ''} />
      <div className="max-w-6xl mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold mb-6" style={{ color: '#1A2535' }}>Rapport banquets</h1>
        <GestionBanquets
          evenements={evenements ?? []}
          billets={billets ?? []}
          banquetsAchetes={banquetsAchetes ?? []}
          leaders={leaders ?? []}
        />
      </div>
    </div>
  )
}