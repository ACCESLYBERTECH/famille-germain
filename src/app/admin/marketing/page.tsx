import { createClient } from '@/utils/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { redirect } from 'next/navigation'
import Navbar from '@/components/Navbar'
import GestionMarketing from './GestionMarketing'

const supabaseAdmin = createAdminClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export default async function AdminMarketingPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/connexion')

  const { data: compte } = await supabase
    .from('comptes')
    .select('*')
    .eq('id', user.id)
    .single()

  if (compte?.role !== 'admin') redirect('/')

  const { data: evenements, error: erreurEvenements } = await supabaseAdmin
    .from('evenements')
    .select('*, paliers:evenement_paliers(*), villes:evenement_villes(*)')
    .eq('statut', 'actif')
    .order('date_debut', { ascending: false })

  if (erreurEvenements) {
    console.error('Erreur chargement événements (marketing):', erreurEvenements)
  }

  const { count: nombreDestinataires } = await supabaseAdmin
    .from('comptes')
    .select('id', { count: 'exact', head: true })
    .eq('statut', 'actif')
    .eq('consentement_communications', true)
    .in('role', ['pci', 'leader'])

  const { data: campagnes } = await supabaseAdmin
    .from('campagnes_email')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(50)

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#F5F3EE' }}>
      <Navbar prenom={compte?.prenom_1 ?? ''} role={compte?.role ?? ''} />
      <div className="max-w-6xl mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold mb-6" style={{ color: '#1A2535' }}>Marketing — Promotion d'événements</h1>
        {erreurEvenements && (
          <div className="rounded-lg p-4 mb-4 text-sm" style={{ backgroundColor: '#FDECEA', color: '#E57373' }}>
            Erreur de chargement des événements : {erreurEvenements.message}
          </div>
        )}
        <GestionMarketing
          evenements={evenements ?? []}
          nombreDestinataires={nombreDestinataires ?? 0}
          campagnes={campagnes ?? []}
        />
      </div>
    </div>
  )
}