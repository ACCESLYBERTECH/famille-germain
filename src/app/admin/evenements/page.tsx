import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import Navbar from '@/components/Navbar'
import GestionEvenements from './GestionEvenements'

export default async function AdminEvenementsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/connexion')

  const { data: compte } = await supabase
    .from('comptes')
    .select('*')
    .eq('id', user.id)
    .single()

  if (compte?.role !== 'admin') redirect('/')

  const { data: evenements } = await supabase
    .from('evenements')
    .select(`
      *,
      paliers:evenement_paliers(*),
      villes:evenement_villes(*),
      banquet:banquets(*)
    `)
    .order('date_debut', { ascending: false })

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#F5F3EE' }}>
      <Navbar prenom={compte?.prenom_1 ?? ''} role={compte?.role ?? ''} />
      <div className="max-w-6xl mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold mb-6" style={{ color: '#1A2535' }}>
          Gestion des événements
        </h1>
        <GestionEvenements evenements={evenements ?? []} />
      </div>
    </div>
  )
}