import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import Navbar from '@/components/Navbar'
import { estAdminOuDeveloppeur } from '@/lib/acces'
import { chargerRapport } from '@/lib/rapportReconnaissances'
import GestionReconnaissances from './GestionReconnaissances'
import ChoixEvenement from './ChoixEvenement'
import RapportVue from './RapportVue'

export default async function AdminReconnaissancesPage({ searchParams }: { searchParams: Promise<{ evenement?: string }> }) {
  const { evenement: evenementDemande } = await searchParams
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/connexion')

  const { data: compte } = await supabase
    .from('comptes')
    .select('prenom_1, role')
    .eq('id', user.id)
    .single()

  if (!estAdminOuDeveloppeur(compte?.role)) redirect('/')

  const [{ data: types }, { data: evenements }] = await Promise.all([
    supabase.from('reconnaissance_types').select('id, nom, ordre, actif').order('ordre', { ascending: true }),
    supabase.from('evenements').select('id, nom, date_debut, date_fin').eq('a_reconnaissances', true).order('date_debut', { ascending: false }),
  ])

  // Par défaut : la prochaine conférence (la plus proche à venir), sinon la plus récente
  const maintenant = new Date().toISOString()
  const aVenir = (evenements ?? []).filter(e => e.date_fin >= maintenant).sort((a, b) => a.date_debut.localeCompare(b.date_debut))
  const evenementId = evenementDemande ?? aVenir[0]?.id ?? evenements?.[0]?.id ?? null
  const rapport = evenementId ? await chargerRapport(evenementId) : null

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#F5F3EE' }}>
      <Navbar prenom={compte?.prenom_1 ?? ''} role={compte?.role ?? ''} />
      <div className="px-4 py-6 sm:p-8">
        <div className="max-w-5xl mx-auto">
          <h1 className="text-2xl sm:text-3xl font-bold mb-1" style={{ color: '#1A2535' }}>🏆 Reconnaissances</h1>
          <p className="text-gray-500 text-sm sm:text-base mb-6">
            Les leaders entrent leurs reconnaissances dans Platines et plus, pour chaque événement où la case « Reconnaissances sur scène » est cochée (Gestion événements).
          </p>

          {(evenements ?? []).length === 0 ? (
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 mb-6 text-sm text-gray-500">
              Aucun événement n&apos;a la case « 🏆 Reconnaissances sur scène » cochée pour l&apos;instant.
            </div>
          ) : (
            <>
              <ChoixEvenement evenements={evenements ?? []} valeur={evenementId ?? ''} />
              {rapport && <RapportVue rapport={rapport} />}
            </>
          )}
        </div>
      </div>
      <GestionReconnaissances typesInitiaux={types ?? []} />
    </div>
  )
}
