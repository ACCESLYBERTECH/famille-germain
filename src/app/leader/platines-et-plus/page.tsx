import { createClient } from '@/utils/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { redirect } from 'next/navigation'
import Navbar from '@/components/Navbar'
import CompteNonActif from '@/components/CompteNonActif'
import NonAccessibleDeveloppeur from '@/components/NonAccessibleDeveloppeur'
import PlatinesEtPlus from './PlatinesEtPlus'
import { ordonnerLeaders } from '@/lib/reconnaissances'

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

  if (compte?.role === 'developpeur') return <NonAccessibleDeveloppeur prenom={compte.prenom_1 ?? ''} titre="Platines et plus" />
  if (compte?.role !== 'leader' && compte?.role !== 'admin') redirect('/')
  if (compte?.role === 'leader' && compte?.statut !== 'actif') return <CompteNonActif prenom={compte?.prenom_1 ?? ''} role={compte?.role ?? ''} statut={compte?.statut} />

  const { data: groupeIds } = await supabaseAdmin
    .rpc('get_groupe_ids', { leader_uuid: user.id })

  const idsGroupe = (groupeIds ?? []).map((r: { compte_id: string }) => r.compte_id)
  const idsPourBillets = [...new Set([user.id, ...idsGroupe])]

  const { data: membres } = idsGroupe.length > 0
    ? await supabaseAdmin
        .from('comptes')
        .select('id, prenom_1, nom_1, prenom_2, nom_2, courriel, telephone, ville, province, pays, numero_amway, periode_sf_fin, statut, role, leader_id, groupe')
        .in('id', idsGroupe)
        .order('nom_1', { ascending: true })
    : { data: [] }

  const leadersGroupe = (membres ?? []).filter((m: any) => m.role === 'leader')
  // Les demandes refusées ne font pas partie du groupe
  const pcis = (membres ?? []).filter((m: any) => (m.role === 'pci' || m.role === 'leader') && m.statut !== 'refuse')

  const { data: billets } = idsPourBillets.length > 0
    ? await supabaseAdmin
        .from('billets')
        .select('*, evenements(nom, date_debut, a_banquet)')
        .in('compte_id', idsPourBillets)
        .order('created_at', { ascending: false })
    : { data: [] }

  // Charger les banquets achetés pour les billets du groupe
  const billetIds = (billets ?? []).map((b: any) => b.id)
  const { data: banquetsAchetes } = billetIds.length > 0
    ? await supabaseAdmin
        .from('billets_banquets')
        .select('billet_id, banquet_id, nom_pci')
        .in('billet_id', billetIds)
        .neq('statut', 'rembourse')
    : { data: [] }

  // Reconnaissances : conférences actives (et celles des 12 derniers mois, en lecture seule)
  const ilYaUnAn = new Date(Date.now() - 365 * 24 * 3600 * 1000).toISOString()
  const { data: evenementsReco } = await supabaseAdmin
    .from('evenements')
    .select('id, nom, date_debut, date_fin, reconnaissances_date_limite, villes:evenement_villes(id, nom_ville, ordre)')
    .eq('a_reconnaissances', true)
    .eq('statut', 'actif')
    .gte('date_fin', ilYaUnAn)
    .order('date_debut', { ascending: true })
  const idsEvReco = (evenementsReco ?? []).map((e: any) => e.id)
  // Comme les billets : ses entrées + celles des leaders en dessous (lecture seule)
  const idsLeadersVisibles = [user.id, ...leadersGroupe.map((l: any) => l.id)]
  const [{ data: typesReco, error: erreurTypesReco }, { data: virtuelReco }, { data: surPlaceReco }] = await Promise.all([
    supabaseAdmin.from('reconnaissance_types').select('id, nom, ordre, actif').order('ordre', { ascending: true }),
    idsEvReco.length > 0
      ? supabaseAdmin.from('reconnaissances_virtuel').select('*').in('evenement_id', idsEvReco).in('leader_id', idsLeadersVisibles).order('created_at', { ascending: true })
      : Promise.resolve({ data: [] as any[] }),
    idsEvReco.length > 0
      ? supabaseAdmin.from('reconnaissances_sur_place').select('evenement_id, leader_id, ville_id, type_id, nombre').in('evenement_id', idsEvReco).in('leader_id', idsLeadersVisibles)
      : Promise.resolve({ data: [] as any[] }),
  ])
  if (erreurTypesReco) console.error('Reconnaissances — lecture des types :', erreurTypesReco)
  const ordreLeadersReco = ordonnerLeaders(user.id, leadersGroupe as any)
  const personnesReco = [
    { id: user.id, prenom_1: compte?.prenom_1, nom_1: compte?.nom_1, prenom_2: compte?.prenom_2, nom_2: compte?.nom_2, numero_amway: compte?.numero_amway, ville: compte?.ville, province: compte?.province, pays: compte?.pays },
    ...pcis.filter((p: any) => p.statut === 'actif').map((p: any) => ({ id: p.id, prenom_1: p.prenom_1, nom_1: p.nom_1, prenom_2: p.prenom_2, nom_2: p.nom_2, numero_amway: p.numero_amway, ville: p.ville, province: p.province, pays: p.pays })),
  ]

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
          banquetsAchetes={banquetsAchetes ?? []}
          estAdmin={compte?.role === 'admin'}
          reconnaissances={{
            evenements: (evenementsReco ?? []) as any,
            types: typesReco ?? [],
            erreurTypes: erreurTypesReco?.message ?? null,
            ordreLeaders: ordreLeadersReco,
            virtuel: (virtuelReco ?? []) as any,
            surPlace: (surPlaceReco ?? []) as any,
            personnes: personnesReco as any,
          }}
        />
      </div>
    </div>
  )
}