import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import Navbar from '@/components/Navbar'
import { estAdminOuDeveloppeur } from '@/lib/acces'
import AdminCarrouselClient from './AdminCarrouselClient'

export default async function AdminCarrouselPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/connexion')

  const { data: compte } = await supabase
    .from('comptes')
    .select('prenom_1, role')
    .eq('id', user.id)
    .single()

  if (!estAdminOuDeveloppeur(compte?.role)) redirect('/')

  // Événements actifs et pas encore terminés : ceux qu'on peut lier à une image
  const { data: evenements } = await supabase
    .from('evenements')
    .select('id, nom, date_debut')
    .eq('statut', 'actif')
    .gte('date_fin', new Date().toISOString())
    .order('date_debut', { ascending: true })

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#F5F3EE' }}>
      <Navbar prenom={compte?.prenom_1 ?? ''} role={compte?.role ?? ''} />
      <AdminCarrouselClient evenements={evenements ?? []} />
    </div>
  )
}