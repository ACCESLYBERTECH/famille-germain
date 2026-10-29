import { createClient } from '@/utils/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { redirect } from 'next/navigation'
import Navbar from '@/components/Navbar'
import { estAdminOuDeveloppeur } from '@/lib/acces'
import { DUREE_LIEN_AUDIO_SECONDES } from '@/lib/audios'
import GestionAudios from './GestionAudios'

const supabaseAdmin = createAdminClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export default async function AdminAudiosPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/connexion')

  const { data: compte } = await supabase
    .from('comptes')
    .select('*')
    .eq('id', user.id)
    .single()

  if (!estAdminOuDeveloppeur(compte?.role)) redirect('/')

  const { data: categories } = await supabaseAdmin
    .from('audio_categories')
    .select('id, nom, ordre')
    .order('ordre', { ascending: true })

  const { data: audios } = await supabaseAdmin
    .from('audios')
    .select('*')
    .order('ordre', { ascending: true })

  const chemins = (audios ?? []).map(a => a.chemin)
  const { data: liens } = chemins.length > 0
    ? await supabaseAdmin.storage.from('audios').createSignedUrls(chemins, DUREE_LIEN_AUDIO_SECONDES)
    : { data: [] as { path: string | null; signedUrl: string }[] }

  const audiosAvecLien = (audios ?? []).map(a => ({
    ...a,
    url: (liens ?? []).find(l => l.path === a.chemin)?.signedUrl ?? '',
  }))

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#F5F3EE' }}>
      <Navbar prenom={compte?.prenom_1 ?? ''} role={compte?.role ?? ''} />
      <div className="max-w-5xl mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold mb-1" style={{ color: '#1A2535' }}>🎧 Gestion des audios</h1>
        <p className="text-sm mb-6" style={{ color: '#666666' }}>Visibles seulement par les nouveaux PCI pendant leur période sans frais. Écoute seulement.</p>
        <GestionAudios categories={categories ?? []} audios={audiosAvecLien} />
      </div>
    </div>
  )
}
