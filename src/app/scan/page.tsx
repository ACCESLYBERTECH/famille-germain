import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import Navbar from '@/components/Navbar'
import ScanInterface from './ScanInterface'

export default async function ScanPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/connexion')

  const { data: compte } = await supabase
    .from('comptes')
    .select('*')
    .eq('id', user.id)
    .single()

  if (!compte || !['portier', 'admin'].includes(compte.role)) redirect('/')

  // Charger l'assignation du portier
  let evenement = null
  let ville = null

  if (compte.role === 'portier') {
    const { data: portier } = await supabase
      .from('portiers')
      .select('*, evenement:evenements(*), ville:evenement_villes(*)')
      .eq('compte_id', user.id)
      .single()

    if (!portier) {
      return (
        <div className="min-h-screen" style={{ backgroundColor: '#F5F3EE' }}>
          <Navbar prenom={compte.prenom_1} role={compte.role} />
          <div className="max-w-md mx-auto pt-20 px-4 text-center">
            <div className="bg-white rounded-2xl shadow p-8">
              <p className="font-medium" style={{ color: '#1A2535' }}>Aucun événement assigné.</p>
              <p className="text-sm mt-2" style={{ color: '#666666' }}>Contactez un administrateur.</p>
            </div>
          </div>
        </div>
      )
    }
    evenement = portier.evenement
    ville = portier.ville
  }

  // Pour admin — charger tous les événements actifs
  let evenements = null
  if (compte.role === 'admin') {
    const { data } = await supabase
      .from('evenements')
      .select('*, villes:evenement_villes(*)')
      .eq('statut', 'actif')
    evenements = data
  }

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#F5F3EE' }}>
      <Navbar prenom={compte.prenom_1} role={compte.role} />
      <div className="max-w-md mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold mb-2" style={{ color: '#1A2535' }}>Scan de billets</h1>
        {evenement && (
          <p className="text-sm mb-6" style={{ color: '#666666' }}>
            {evenement.nom}{ville ? ' · ' + ville.nom_ville : ''}
          </p>
        )}
        <ScanInterface
          compte={compte}
          evenement={evenement}
          ville={ville}
          evenements={evenements}
        />
      </div>
    </div>
  )
}