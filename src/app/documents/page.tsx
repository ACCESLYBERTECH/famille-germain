import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import Navbar from '@/components/Navbar'

export default async function DocumentsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/connexion')

  const { data: compte } = await supabase
    .from('comptes')
    .select('*')
    .eq('id', user.id)
    .single()

  if (!compte || compte.statut !== 'actif') redirect('/')

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#F5F3EE' }}>
      <Navbar prenom={compte.prenom_1} role={compte.role} />
      <div className="max-w-4xl mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold mb-6" style={{ color: '#1A2535' }}>Documents</h1>

        {/* Section PCI */}
        <div className="mb-8">
          <h2 className="text-lg font-semibold mb-4" style={{ color: '#1A2535' }}>
            Documents PCI
          </h2>
          <div className="bg-white rounded-2xl shadow p-8 text-center" style={{ color: '#666666' }}>
            Aucun document disponible pour le moment.
          </div>
        </div>

        {/* Section Platine — leaders seulement */}
        {(compte.role === 'leader' || compte.role === 'admin') && (
          <div>
            <h2 className="text-lg font-semibold mb-4" style={{ color: '#1A2535' }}>
              Documents Platine+
            </h2>
            <div className="bg-white rounded-2xl shadow p-8 text-center" style={{ color: '#666666' }}>
              Aucun document disponible pour le moment.
            </div>
          </div>
        )}
      </div>
    </div>
  )
}