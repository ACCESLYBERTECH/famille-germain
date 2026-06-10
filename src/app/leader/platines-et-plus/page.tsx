import { createClient } from '@/utils/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { redirect } from 'next/navigation'
import Navbar from '@/components/Navbar'
import PlatinesEtPlus from './PlatinesEtPlus'

const supabaseAdmin = createAdminClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export default async function PlatinesEtPlusPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/connexion')

  const { data: compte } = await supabase
    .from('comptes')
    .select('*')
    .eq('id', user.id)
    .single()

  if (compte?.role !== 'leader' && compte?.role !== 'admin') redirect('/')

  const { data: groupeIds } = await supabaseAdmin
    .rpc('get_groupe_ids', { leader_uuid: user.id })

  const idsGroupe = (groupeIds ?? []).map((r: { compte_id: string }) => r.compte_id)

  // IDs pour les billets = groupe + le leader lui-même
  const idsPourBillets = [...new Set([user.id, ...idsGroupe])]

  const { data: membres } = idsGroupe.length > 0
    ? await supabaseAdmin
        .from('comptes')
        .select('id, prenom_1, nom_1, prenom_2, nom_2, courriel, telephone, ville, province, numero_amway, periode_sf_fin, statut, role, leader_id, groupe')
        .in('id', idsGroupe)
        .order('nom_1', { ascending: true })
    : { data: [] }

  // Charger aussi les profils des leaders du groupe (pour le filtre par leader)
  const leadersGroupe = (membres ?? []).filter((m: any) => m.role === 'leader')

  // Charger les profils complets de tous les leaders du groupe pour le filtre
  // (nécessaire pour que les billets des leaders eux-mêmes soient filtrables)
  const tousLesMembres = membres ?? []
  const pcis = tousLesMembres.filter((m: any) => m.role === 'pci' || m.role === 'leader')

  const { data: billets } = idsPourBillets.length > 0
    ? await supabaseAdmin
        .from('billets')
        .select('*, evenements(nom, date_debut)')
        .in('compte_id', idsPourBillets)
        .order('created_at', { ascending: false })
    : { data: [] }

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#F5F3EE' }}>
      <Navbar prenom={compte?.prenom_1 ?? ''} role={compte?.role ?? ''} />
      <div className="max-w-6xl mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold mb-2" style={{ color: '#1A2535' }}>Platines et plus</h1>
        <p className="text-sm mb-6" style={{ color: '#666666' }}>Billets et profils de votre groupe</p>
        <PlatinesEtPlus
          pcis={pcis}
          billets={billets ?? []}
          leadersGroupe={leadersGroupe}
          leaderConnecteId={user.id}
        />
      </div>
    </div>
  )
}