import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import Navbar from '@/components/Navbar'
import CompteNonActif from '@/components/CompteNonActif'
import ListeEvenements from './ListeEvenements'

export default async function EvenementsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/connexion')

  const { data: compte } = await supabase
    .from('comptes')
    .select('*')
    .eq('id', user.id)
    .single()

  if (compte?.statut !== 'actif') {
    return <CompteNonActif prenom={compte?.prenom_1 ?? ''} role={compte?.role ?? ''} statut={compte?.statut} />
  }

  // Charger les événements actifs avec banquets
  const { data: evenements } = await supabase
    .from('evenements')
    .select(`
      *,
      paliers:evenement_paliers(*),
      villes:evenement_villes(*),
      banquet:banquets(*)
    `)
    .eq('statut', 'actif')
    .order('date_debut', { ascending: true })

  // Filtrer selon le rôle
  const evenementsFiltres = (evenements ?? []).filter(ev => {
    if (ev.acces === 'platine' && compte?.role === 'pci') return false
    return true
  })

  // Billets déjà achetés par le PCI (pour savoir si banquet disponible)
  const { data: billetsPCI } = await supabase
    .from('billets')
    .select('id, evenement_id, nom_pci, est_sans_frais')
    .eq('compte_id', user.id)
    .neq('statut', 'rembourse')

  // Banquets déjà achetés par le PCI
  const { data: banquetsAchetes } = await supabase
    .from('billets_banquets')
    .select('banquet_id, nom_pci, billet_id')
    .eq('compte_id', user.id)
    .neq('statut', 'rembourse')

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#F5F3EE' }}>
      <Navbar prenom={compte?.prenom_1 ?? ''} role={compte?.role ?? ''} />
      <div className="max-w-5xl mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold mb-6" style={{ color: '#1A2535' }}>
          Événements
        </h1>
        <ListeEvenements
          evenements={evenementsFiltres}
          compte={compte}
          billetsPCI={billetsPCI ?? []}
          banquetsAchetes={banquetsAchetes ?? []}
        />
      </div>
    </div>
  )
}