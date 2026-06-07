import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'

export default async function Home() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  console.log('USER:', user?.id)

  if (!user) redirect('/connexion')

  const { data: compte, error } = await supabase
    .from('comptes')
    .select('*')
    .eq('id', user.id)
    .single()

  console.log('COMPTE:', compte)
  console.log('ERREUR:', error)

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#F5F3EE' }}>
      <div className="max-w-2xl mx-auto pt-20 px-4 text-center">
        <h1 className="text-3xl font-bold mb-2" style={{ color: '#1A2535' }}>
          Famille Germain
        </h1>
        <p className="mb-8" style={{ color: '#666666' }}>Yager Group</p>
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