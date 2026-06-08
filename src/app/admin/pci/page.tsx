import { createClient } from '@/utils/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { redirect } from 'next/navigation'
import Navbar from '@/components/Navbar'
import GestionPCI from './GestionPCI.tsx'

const supabaseAdmin = createAdminClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export default async function AdminPCIPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/connexion')

  const { data: compte } = await supabase
    .from('comptes')
    .select('*')
    .eq('id', user.id)
    .single()

  if (compte?.role !== 'admin') redirect('/')

  const { data: pciEnAttente } = await supabaseAdmin
    .from('comptes')
    .select('*')
    .eq('statut', 'en_attente')
    .order('created_at', { ascending: true })

  const { data: pciActifs } = await supabaseAdmin
    .from('comptes')
    .select('*')
    .in('statut', ['actif'])
    .order('created_at', { ascending: false })

  const { data: leaders } = await supabaseAdmin
    .from('comptes')
    .select('id, prenom_1, nom_1')
    .eq('role', 'leader')
    .eq('statut', 'actif')
    .order('nom_1', { ascending: true })

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#F5F3EE' }}>
      <Navbar prenom={compte?.prenom_1 ?? ''} role={compte?.role ?? ''} />
      <div className="max-w-6xl mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold mb-6" style={{ color: '#1A2535' }}>Gestion des PCI</h1>
        <GestionPCI
          pciEnAttente={pciEnAttente ?? []}
          pciActifs={pciActifs ?? []}
          leaders={leaders ?? []}
        />
      </div>
    </div>
  )
}