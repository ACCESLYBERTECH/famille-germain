import { createClient } from '@/utils/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { redirect } from 'next/navigation'
import Navbar from '@/components/Navbar'
import { aAccesAudios, DUREE_LIEN_AUDIO_SECONDES } from '@/lib/audios'
import AudiosClient from './AudiosClient'

const supabaseAdmin = createAdminClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// Page Audios : nouveaux PCI pendant leur période sans frais (écoute seulement)
export default async function AudiosPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/connexion')

  const { data: compte } = await supabase
    .from('comptes')
    .select('*')
    .eq('id', user.id)
    .single()

  if (!aAccesAudios(compte)) {
    return (
      <div className="min-h-screen" style={{ backgroundColor: '#F5F3EE' }}>
        <Navbar prenom={compte?.prenom_1 ?? ''} role={compte?.role ?? ''} />
        <div className="max-w-2xl mx-auto pt-20 px-4 text-center">
          <div className="bg-white rounded-2xl shadow p-8">
            <p className="text-4xl mb-3">🎧</p>
            <p className="text-lg font-medium mb-2" style={{ color: '#1A2535' }}>Cette page n&apos;est plus accessible</p>
            <p className="text-sm" style={{ color: '#666666' }}>Les audios sont réservés aux nouveaux PCI pendant leur première année.</p>
          </div>
        </div>
      </div>
    )
  }

  const { data: categories } = await supabaseAdmin
    .from('audio_categories')
    .select('id, nom, ordre')
    .order('ordre', { ascending: true })

  const { data: audios } = await supabaseAdmin
    .from('audios')
    .select('id, categorie_id, titre, description, chemin, ordre')
    .eq('actif', true)
    .order('ordre', { ascending: true })

  // Liens d'écoute temporaires (le fichier n'a jamais d'adresse publique)
  const chemins = (audios ?? []).map(a => a.chemin)
  const { data: liens } = chemins.length > 0
    ? await supabaseAdmin.storage.from('audios').createSignedUrls(chemins, DUREE_LIEN_AUDIO_SECONDES)
    : { data: [] as { path: string | null; signedUrl: string }[] }

  const audiosAvecLien = (audios ?? []).map(a => ({
    id: a.id,
    categorie_id: a.categorie_id,
    titre: a.titre,
    description: a.description,
    url: (liens ?? []).find(l => l.path === a.chemin)?.signedUrl ?? '',
  })).filter(a => a.url)

  const finPeriode = compte?.periode_sf_fin
    ? new Date(compte.periode_sf_fin).toLocaleDateString('fr-CA', { year: 'numeric', month: 'long', day: 'numeric' })
    : null

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#F5F3EE' }}>
      <Navbar prenom={compte?.prenom_1 ?? ''} role={compte?.role ?? ''} />
      <div className="max-w-3xl mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold mb-1" style={{ color: '#1A2535' }}>🎧 Audios</h1>
        <p className="text-sm mb-6" style={{ color: '#666666' }}>
          Audios de formation réservés aux nouveaux PCI{finPeriode && (compte?.role === 'pci' || compte?.role === 'leader') ? ` — accessibles jusqu'au ${finPeriode}` : ''}.
        </p>
        <AudiosClient categories={categories ?? []} audios={audiosAvecLien} />
      </div>
    </div>
  )
}
