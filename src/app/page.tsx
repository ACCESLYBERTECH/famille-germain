import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import Navbar from '@/components/Navbar'

export default async function Home() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/connexion')

  const { data: compte } = await supabase
    .from('comptes')
    .select('*')
    .eq('id', user.id)
    .single()

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#F5F3EE' }}>
      <Navbar prenom={compte?.prenom_1 ?? ''} role={compte?.role ?? ''} />
      
      <div className="max-w-2xl mx-auto pt-20 px-4 text-center">
        <div className="bg-white rounded-2xl shadow p-6">
          <p style={{ color: '#1A2535' }}>
            Bienvenue, <strong>{compte?.prenom_1} {compte?.nom_1}</strong> !
          </p>
          <p className="text-sm mt-2" style={{ color: '#666666' }}>
            Rôle : {compte?.role}
          </p>
        </div>
      </div>
    </div>
  )
}