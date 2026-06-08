import { createClient } from '@/utils/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { redirect } from 'next/navigation'
import Navbar from '@/components/Navbar'

const supabaseAdmin = createAdminClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export default async function Home() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/connexion')

  const { data: compte } = await supabase
    .from('comptes')
    .select('*')
    .eq('id', user.id)
    .single()

  if (compte?.role === 'pci' || compte?.role === 'leader') redirect('/evenements')
  if (compte?.role === 'portier') redirect('/scan')

  // Stats principales
  const [
    { count: totalPci },
    { count: pciEnAttente },
    { count: totalLeaders },
    { count: totalEvenements },
    { count: totalBillets },
    { count: billetsUtilises },
    { count: billetsRembourses },
    { count: billetsOfferts },
  ] = await Promise.all([
    supabaseAdmin.from('comptes').select('*', { count: 'exact', head: true }).eq('role', 'pci').eq('statut', 'actif'),
    supabaseAdmin.from('comptes').select('*', { count: 'exact', head: true }).eq('statut', 'en_attente'),
    supabaseAdmin.from('comptes').select('*', { count: 'exact', head: true }).eq('role', 'leader').eq('statut', 'actif'),
    supabaseAdmin.from('evenements').select('*', { count: 'exact', head: true }).eq('statut', 'actif'),
    supabaseAdmin.from('billets').select('*', { count: 'exact', head: true }).eq('statut', 'vendu'),
    supabaseAdmin.from('billets').select('*', { count: 'exact', head: true }).eq('statut', 'utilise'),
    supabaseAdmin.from('billets').select('*', { count: 'exact', head: true }).eq('statut', 'rembourse'),
    supabaseAdmin.from('billets').select('*', { count: 'exact', head: true }).eq('statut', 'vendu').eq('prix_paye', 0).eq('est_sans_frais', false),
  ])

  // Derniers PCI en attente
  const { data: derniersEnAttente } = await supabaseAdmin
    .from('comptes')
    .select('id, prenom_1, nom_1, courriel, created_at')
    .eq('statut', 'en_attente')
    .order('created_at', { ascending: false })
    .limit(5)

  // Derniers billets achetés
  const { data: derniersBillets } = await supabaseAdmin
    .from('billets')
    .select('id, nom_pci, created_at, est_sans_frais, prix_paye, evenements(nom)')
    .order('created_at', { ascending: false })
    .limit(5)

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#F5F3EE' }}>
      <Navbar prenom={compte?.prenom_1 ?? ''} role={compte?.role ?? ''} />
      <div className="max-w-6xl mx-auto px-4 py-8">

        <h1 className="text-2xl font-bold mb-1" style={{ color: '#1A2535' }}>Tableau de bord</h1>
        <p className="text-sm mb-8" style={{ color: '#666666' }}>Bonjour {compte?.prenom_1} — voici un aperçu de la plateforme.</p>

        {/* Alerte PCI en attente */}
        {(pciEnAttente ?? 0) > 0 && (
          <a href="/admin/pci" className="flex items-center gap-3 rounded-xl p-4 mb-6 hover:opacity-90 transition-opacity" style={{ backgroundColor: '#E57373' }}>
            <span className="text-white text-xl">⚠️</span>
            <p className="text-white font-medium">
              {pciEnAttente} PCI en attente d'approbation — Cliquez pour traiter
            </p>
          </a>
        )}

        {/* Stats membres */}
        <p className="text-xs font-bold uppercase tracking-wide mb-3" style={{ color: '#C9A84C' }}>Membres</p>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-6">
          <a href="/admin/pci" className="bg-white rounded-2xl shadow p-5 text-center hover:shadow-md transition-shadow block">
            <p className="text-3xl font-bold mb-1" style={{ color: '#2E86C1' }}>{totalPci ?? 0}</p>
            <p className="text-sm" style={{ color: '#666666' }}>PCI actifs</p>
          </a>
          <a href="/admin/pci" className="bg-white rounded-2xl shadow p-5 text-center hover:shadow-md transition-shadow block">
            <p className="text-3xl font-bold mb-1" style={{ color: '#C9A84C' }}>{totalLeaders ?? 0}</p>
            <p className="text-sm" style={{ color: '#666666' }}>Leaders</p>
          </a>
          <a href="/admin/pci" className="bg-white rounded-2xl shadow p-5 text-center hover:shadow-md transition-shadow block">
            <p className="text-3xl font-bold mb-1" style={{ color: (pciEnAttente ?? 0) > 0 ? '#E57373' : '#4CAF7D' }}>{pciEnAttente ?? 0}</p>
            <p className="text-sm" style={{ color: '#666666' }}>En attente</p>
          </a>
        </div>

        {/* Stats billets */}
        <p className="text-xs font-bold uppercase tracking-wide mb-3" style={{ color: '#C9A84C' }}>Billets</p>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <a href="/admin/billets" className="bg-white rounded-2xl shadow p-5 text-center hover:shadow-md transition-shadow block">
            <p className="text-3xl font-bold mb-1" style={{ color: '#2E86C1' }}>{totalBillets ?? 0}</p>
            <p className="text-sm" style={{ color: '#666666' }}>Vendus</p>
          </a>
          <a href="/admin/billets" className="bg-white rounded-2xl shadow p-5 text-center hover:shadow-md transition-shadow block">
            <p className="text-3xl font-bold mb-1" style={{ color: '#4CAF7D' }}>{billetsUtilises ?? 0}</p>
            <p className="text-sm" style={{ color: '#666666' }}>Utilisés</p>
          </a>
          <a href="/admin/billets" className="bg-white rounded-2xl shadow p-5 text-center hover:shadow-md transition-shadow block">
            <p className="text-3xl font-bold mb-1" style={{ color: '#E57373' }}>{billetsRembourses ?? 0}</p>
            <p className="text-sm" style={{ color: '#666666' }}>Remboursés</p>
          </a>
          <a href="/admin/billets" className="bg-white rounded-2xl shadow p-5 text-center hover:shadow-md transition-shadow block">
            <p className="text-3xl font-bold mb-1" style={{ color: '#9C27B0' }}>{billetsOfferts ?? 0}</p>
            <p className="text-sm" style={{ color: '#666666' }}>Billets offerts</p>
          </a>
        </div>

        {/* Événements actifs */}
        <p className="text-xs font-bold uppercase tracking-wide mb-3" style={{ color: '#C9A84C' }}>Événements</p>
        <div className="grid grid-cols-1 md:grid-cols-1 gap-4 mb-8">
          <a href="/admin/evenements" className="bg-white rounded-2xl shadow p-5 text-center hover:shadow-md transition-shadow block">
            <p className="text-3xl font-bold mb-1" style={{ color: '#C9A84C' }}>{totalEvenements ?? 0}</p>
            <p className="text-sm" style={{ color: '#666666' }}>Événements actifs</p>
          </a>
        </div>

        {/* Activité récente */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">

          {/* Derniers PCI en attente */}
          <div className="bg-white rounded-2xl shadow p-5">
            <div className="flex justify-between items-center mb-4">
              <p className="font-bold" style={{ color: '#1A2535' }}>Dernières inscriptions</p>
              <a href="/admin/pci" className="text-xs" style={{ color: '#2E86C1' }}>Voir tout →</a>
            </div>
            {(derniersEnAttente ?? []).length === 0 ? (
              <p className="text-sm text-center py-4" style={{ color: '#666666' }}>Aucune inscription en attente ✓</p>
            ) : (
              <div className="space-y-3">
                {(derniersEnAttente ?? []).map((pci: any) => (
                  <div key={pci.id} className="flex justify-between items-center">
                    <div>
                      <p className="text-sm font-medium" style={{ color: '#1A2535' }}>{pci.prenom_1} {pci.nom_1}</p>
                      <p className="text-xs" style={{ color: '#666666' }}>{pci.courriel}</p>
                    </div>
                    <p className="text-xs" style={{ color: '#999999' }}>
                      {new Date(pci.created_at).toLocaleDateString('fr-CA')}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Derniers billets */}
          <div className="bg-white rounded-2xl shadow p-5">
            <div className="flex justify-between items-center mb-4">
              <p className="font-bold" style={{ color: '#1A2535' }}>Derniers billets</p>
              <a href="/admin/billets" className="text-xs" style={{ color: '#2E86C1' }}>Voir tout →</a>
            </div>
            {(derniersBillets ?? []).length === 0 ? (
              <p className="text-sm text-center py-4" style={{ color: '#666666' }}>Aucun billet pour l'instant</p>
            ) : (
              <div className="space-y-3">
                {(derniersBillets ?? []).map((billet: any) => (
                  <div key={billet.id} className="flex justify-between items-center">
                    <div>
                      <p className="text-sm font-medium" style={{ color: '#1A2535' }}>{billet.nom_pci}</p>
                      <p className="text-xs" style={{ color: '#666666' }}>{billet.evenements?.nom}</p>
                    </div>
                    <p className="text-xs font-medium" style={{ color: billet.prix_paye === 0 ? '#4CAF7D' : '#1A2535' }}>
                      {billet.prix_paye === 0 ? 'Sans frais' : `${billet.prix_paye?.toFixed(2)} $`}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>

        {/* Raccourcis */}
        <p className="text-xs font-bold uppercase tracking-wide mb-3" style={{ color: '#C9A84C' }}>Accès rapide</p>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <a href="/admin/pci" className="bg-white rounded-2xl shadow p-4 hover:shadow-md transition-shadow block">
            <p className="font-bold mb-1 text-sm" style={{ color: '#1A2535' }}>👥 Gestion PCI</p>
            <p className="text-xs" style={{ color: '#666666' }}>Approuver et modifier les membres</p>
          </a>
          <a href="/admin/evenements" className="bg-white rounded-2xl shadow p-4 hover:shadow-md transition-shadow block">
            <p className="font-bold mb-1 text-sm" style={{ color: '#1A2535' }}>📅 Événements</p>
            <p className="text-xs" style={{ color: '#666666' }}>Créer et gérer les événements</p>
          </a>
          <a href="/admin/billets" className="bg-white rounded-2xl shadow p-4 hover:shadow-md transition-shadow block">
            <p className="font-bold mb-1 text-sm" style={{ color: '#1A2535' }}>🎫 Billets</p>
            <p className="text-xs" style={{ color: '#666666' }}>Gérer et rembourser les billets</p>
          </a>
          <a href="/scan" className="bg-white rounded-2xl shadow p-4 hover:shadow-md transition-shadow block">
            <p className="font-bold mb-1 text-sm" style={{ color: '#1A2535' }}>📷 Scanner</p>
            <p className="text-xs" style={{ color: '#666666' }}>Système de scan à l'entrée</p>
          </a>
        </div>

      </div>
    </div>
  )
}