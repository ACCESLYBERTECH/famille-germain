import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import Navbar from '@/components/Navbar'

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/connexion')

  const { data: compte } = await supabase
    .from('comptes')
    .select('prenom_1, role')
    .eq('id', user.id)
    .single()

  if (compte?.role !== 'admin') redirect('/')

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#F5F3EE' }}>
      <Navbar prenom={compte?.prenom_1 ?? ''} role="admin" />
      {children}
    </div>
  )
}