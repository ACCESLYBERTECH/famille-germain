import { createClient } from '@/utils/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { redirect } from 'next/navigation'
import Navbar from '@/components/Navbar'
import GestionBillets from './GestionBillets'

const supabaseAdmin = createAdminClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export default async function AdminBilletsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/connexion')

  const { data: compte } = await supabase
    .from('comptes')
    .select('*')
    .eq('id', user.id)
    .single()

  if (compte?.role !== 'admin') redirect('/')

  const { data: billets } = await supabaseAdmin
    .from('billets')
    .select('*, evenements(nom, date_debut, a_banquet), comptes!billets_compte_id_fkey(prenom_1, nom_1, courriel, numero_amway, leader_id)')
    .order('created_at', { ascending: false })

  const { data: evenements } = await supabaseAdmin
    .from('evenements')
    .select('id, nom')
    .eq('statut', 'actif')
    .order('date_debut', { ascending: true })

  const { data: pcis } = await supabaseAdmin
    .from('comptes')
    .select('id, prenom_1, nom_1, courriel')
    .eq('role', 'pci')
    .eq('statut', 'actif')
    .order('nom_1', { ascending: true })

  const { data: leaders } = await supabaseAdmin
    .from('comptes')
    .select('id, prenom_1, nom_1')
    .eq('role', 'leader')
    .eq('statut', 'actif')
    .order('nom_1', { ascending: true })

  // Charger tous les banquets achetés
  const { data: banquetsAchetes } = await supabaseAdmin
    .from('billets_banquets')
    .select('billet_id, banquet_id, nom_pci')
    .neq('statut', 'rembourse')

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#F5F3EE' }}>
      <Navbar prenom={compte?.prenom_1 ?? ''} role={compte?.role ?? ''} />
      <div className="max-w-6xl mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold mb-6" style={{ color: '#1A2535' }}>Gestion des billets</h1>
        <GestionBillets
          billets={billets ?? []}
          evenements={evenements ?? []}
          pcis={pcis ?? []}
          leaders={leaders ?? []}
          banquetsAchetes={banquetsAchetes ?? []}
        />
      </div>
    </div>
  )
}