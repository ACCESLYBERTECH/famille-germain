import { createClient } from '@/utils/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { redirect } from 'next/navigation'
import Navbar from '@/components/Navbar'
import CarrouselAccueil from './CarrouselAccueil'

const supabaseAdmin = createAdminClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export default async function AccueilPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/connexion')

  const { data: compte } = await supabase
    .from('comptes')
    .select('*')
    .eq('id', user.id)
    .single()

  if (compte?.statut !== 'actif') {
    return (
      <div className="min-h-screen" style={{ backgroundColor: '#F5F3EE' }}>
        <Navbar prenom={compte?.prenom_1 ?? ''} role={compte?.role ?? ''} />
        <div className="max-w-2xl mx-auto pt-20 px-4 text-center">
          <div className="bg-white rounded-2xl shadow p-8">
            <p className="text-lg font-medium mb-2" style={{ color: '#1A2535' }}>
              Compte en attente d'approbation
            </p>
            <p className="text-sm" style={{ color: '#666666' }}>
              Un administrateur va approuver votre compte sous peu. Vous recevrez un courriel de confirmation.
            </p>
          </div>
        </div>
      </div>
    )
  }

  // Charger la photo du leader assigné
  let photoLeader: { url: string; nom: string; estCouple?: boolean } | null = null

  if (compte?.leader_id) {
    const { data: leader } = await supabaseAdmin
      .from('comptes')
      .select('prenom_1, nom_1, prenom_2, nom_2, photo_url')
      .eq('id', compte.leader_id)
      .single()

    if (leader?.photo_url) {
      const nomComplet = leader.prenom_2 && leader.nom_2
        ? `${leader.prenom_1} ${leader.nom_1} & ${leader.prenom_2} ${leader.nom_2}`
        : `${leader.prenom_1} ${leader.nom_1}`
      const estCouple = !!(leader.prenom_2 && leader.nom_2)
      photoLeader = { url: leader.photo_url, nom: nomComplet, estCouple }
    }
  }

  // Si c'est un leader, afficher sa propre photo
  if (!photoLeader && compte?.role === 'leader' && compte?.photo_url) {
    const nomComplet = compte.prenom_2 && compte.nom_2
      ? `${compte.prenom_1} ${compte.nom_1} & ${compte.prenom_2} ${compte.nom_2}`
      : `${compte.prenom_1} ${compte.nom_1}`
    const estCouple = !!(compte.prenom_2 && compte.nom_2)
    photoLeader = { url: compte.photo_url, nom: nomComplet, estCouple }
  }

  // Charger les images du carrousel
  const { data: carrouselImages } = await supabaseAdmin
    .from('carrousel_images')
    .select('*')
    .order('ordre', { ascending: true })

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#F5F3EE' }}>
      <Navbar prenom={compte?.prenom_1 ?? ''} role={compte?.role ?? ''} />
      <div className="max-w-4xl mx-auto px-4 py-8">

        {/* Message de bienvenue */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold" style={{ color: '#1A2535' }}>
            Bonjour, {compte?.prenom_1}! 👋
          </h1>
          <p className="text-gray-500 mt-1">Bienvenue sur la plateforme Famille Germain – Yager Group</p>
        </div>

        <CarrouselAccueil
          photoLeader={photoLeader}
          images={carrouselImages ?? []}
          prenom={compte?.prenom_1 ?? ''}
        />

      </div>
    </div>
  )
}