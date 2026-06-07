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

  // Rediriger selon le rôle
  if (compte?.role === 'pci' || compte?.role === 'leader') redirect('/evenements')
  if (compte?.role === 'portier') redirect('/scan')

  // Admin — charger les statistiques
  const [
    { count: totalPci },
    { count: pciEnAttente },
    { count: totalEvenements },
    { count: totalBillets },
  ] = await Promise.all([
    supabase.from('comptes').select('*', { count: 'exact', head: true }).eq('role', 'pci').eq('statut', 'actif'),
    supabase.from('comptes').select('*', { count: 'exact', head: true }).eq('statut', 'en_attente'),
    supabase.from('evenements').select('*', { count: 'exact', head: true }).eq('statut', 'actif'),
    supabase.from('billets').select('*', { count: 'exact', head: true }).eq('statut', 'vendu'),
  ])

  const stats = [
    { label: 'PCI actifs', valeur: totalPci ?? 0, couleur: '#2E86C1', lien: '/admin/pci' },
    { label: 'En attente', valeur: pciEnAttente ?? 0, couleur: pciEnAttente ? '#E57373' : '#4CAF7D', lien: '/admin/pci' },
    { label: 'Événements actifs', valeur: totalEvenements ?? 0, couleur: '#C9A84C', lien: '/admin/evenements' },
    { label: 'Billets vendus', valeur: totalBillets ?? 0, couleur: '#4CAF7D', lien: '/admin/pci' },
  ]

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#F5F3EE' }}>
      <Navbar prenom={compte?.prenom_1 ?? ''} role={compte?.role ?? ''} />
      <div className="max-w-5xl mx-auto px-4 py-8">

        <h1 className="text-2xl font-bold mb-2" style={{ color: '#1A2535' }}>
          Tableau de bord
        </h1>
        <p className="text-sm mb-8" style={{ color: '#666666' }}>
          Bonjour {compte?.prenom_1} — voici un aperçu de la plateforme.
        </p>

        {/* Statistiques */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {stats.map(stat => (
            <a key={stat.label} href={stat.lien} className="bg-white rounded-2xl shadow p-5 text-center hover:shadow-md transition-shadow block">
              <p className="text-3xl font-bold mb-1" style={{ color: stat.couleur }}>{stat.valeur}</p>
              <p className="text-sm" style={{ color: '#666666' }}>{stat.label}</p>
            </a>
          ))}
        </div>

        {/* Raccourcis */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <a href="/admin/pci" className="bg-white rounded-2xl shadow p-5 hover:shadow-md transition-shadow block">
            <p className="font-bold mb-1" style={{ color: '#1A2535' }}>Gestion PCI</p>
            <p className="text-sm" style={{ color: '#666666' }}>Approuver, modifier, gérer les membres</p>
          </a>
          <a href="/admin/evenements" className="bg-white rounded-2xl shadow p-5 hover:shadow-md transition-shadow block">
            <p className="font-bold mb-1" style={{ color: '#1A2535' }}>Événements</p>
            <p className="text-sm" style={{ color: '#666666' }}>Créer et gérer les événements</p>
          </a>
          <a href="/scan" className="bg-white rounded-2xl shadow p-5 hover:shadow-md transition-shadow block">
            <p className="font-bold mb-1" style={{ color: '#1A2535' }}>Scanner</p>
            <p className="text-sm" style={{ color: '#666666' }}>Accès au système de scan</p>
          </a>
        </div>

      </div>
    </div>
  )
}