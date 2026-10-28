import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import Navbar from '@/components/Navbar'
import { estAdminOuDeveloppeur } from '@/lib/acces'
import GestionDocuments from './GestionDocuments'

export default async function AdminDocumentsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/connexion')

  const { data: compte } = await supabase
    .from('comptes')
    .select('*')
    .eq('id', user.id)
    .single()

  if (!estAdminOuDeveloppeur(compte?.role)) redirect('/')

  const { data: documents } = await supabase
    .from('documents')
    .select('*')
    .order('section', { ascending: true })
    .order('ordre', { ascending: true })

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#F5F3EE' }}>
      <Navbar prenom={compte?.prenom_1 ?? ''} role={compte?.role ?? ''} />
      <div className="max-w-4xl mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold mb-6" style={{ color: '#1A2535' }}>
          Gestion des documents
        </h1>
        <GestionDocuments documents={documents ?? []} />
      </div>
    </div>
  )
}