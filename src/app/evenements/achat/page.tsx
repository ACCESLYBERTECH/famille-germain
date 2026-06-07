import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import Navbar from '@/components/Navbar'
import FormulaireAchat from './FormulaireAchat'

interface Props {
  searchParams: Promise<{ evenement_id?: string }>
}

export default async function AchatPage({ searchParams }: Props) {
  const { evenement_id } = await searchParams
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/connexion')
  if (!evenement_id) redirect('/evenements')

  const { data: compte } = await supabase
    .from('comptes')
    .select('*')
    .eq('id', user.id)
    .single()

  if (compte?.statut !== 'actif') redirect('/evenements')

  const { data: evenement } = await supabase
    .from('evenements')
    .select('*, paliers:evenement_paliers(*), villes:evenement_villes(*)')
    .eq('id', evenement_id)
    .eq('statut', 'actif')
    .single()

  if (!evenement) redirect('/evenements')

  // Vérifier période sans frais
  const maintenant = new Date()
  const dateEvenement = new Date(evenement.date_debut)
  const estSansFrais = compte?.periode_sf_fin 
    ? dateEvenement <= new Date(compte.periode_sf_fin)
    : false

  // Calculer prix actuel
  const paliers = (evenement.paliers ?? []).sort((a: { ordre: number }, b: { ordre: number }) => a.ordre - b.ordre)
  const palierActuel = paliers.find((p: { date_fin: string }) => new Date(p.date_fin) > maintenant)
  const prix = palierActuel ? palierActuel.prix : paliers[paliers.length - 1]?.prix ?? 0

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#F5F3EE' }}>
      <Navbar prenom={compte?.prenom_1 ?? ''} role={compte?.role ?? ''} />
      <div className="max-w-xl mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold mb-6" style={{ color: '#1A2535' }}>
          Acheter un billet
        </h1>
        <FormulaireAchat
          evenement={evenement}
          compte={compte}
          estSansFrais={estSansFrais}
          prix={prix}
          stripePublicKey={process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!}
        />
      </div>
    </div>
  )
}