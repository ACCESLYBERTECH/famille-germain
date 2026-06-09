import { createClient } from '@/utils/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { redirect } from 'next/navigation'
import Navbar from '@/components/Navbar'
import GestionPortiers from './GestionPortiers'

const supabaseAdmin = createAdminClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export default async function AdminPortiersPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/connexion')

  const { data: compte } = await supabase
    .from('comptes')
    .select('*')
    .eq('id', user.id)
    .single()

  if (compte?.role !== 'admin') redirect('/')

  const { data: portiers } = await supabaseAdmin
    .from('portiers_comptes')
    .select('*, evenements(nom), evenement_villes(nom_ville)')
    .order('created_at', { ascending: false })

  const { data: evenements } = await supabaseAdmin
    .from('evenements')
    .select('id, nom, villes:evenement_villes(id, nom_ville)')
    .eq('statut', 'actif')
    .order('date_debut', { ascending: true })

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#F5F3EE' }}>
      <Navbar prenom={compte?.prenom_1 ?? ''} role={compte?.role ?? ''} />
      <div className="max-w-4xl mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold mb-6" style={{ color: '#1A2535' }}>Gestion des portiers</h1>
        <GestionPortiers portiers={portiers ?? []} evenements={evenements ?? []} />
      </div>
    </div>
  )
}