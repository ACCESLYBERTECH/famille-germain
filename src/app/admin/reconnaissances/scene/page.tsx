import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import { estAdminOuDeveloppeur } from '@/lib/acces'
import { chargerRapport } from '@/lib/rapportReconnaissances'
import FeuilleScene from './FeuilleScene'

// Feuille de scène : une page par salle, en gros caractères, pour les présentateurs
export default async function FeuilleScenePage({ searchParams }: { searchParams: Promise<{ evenement?: string; salle?: string }> }) {
  const { evenement: evenementId, salle } = await searchParams
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/connexion')
  const { data: compte } = await supabase.from('comptes').select('role').eq('id', user.id).single()
  if (!estAdminOuDeveloppeur(compte?.role)) redirect('/')
  if (!evenementId) redirect('/admin/reconnaissances')

  const rapport = await chargerRapport(evenementId)
  if (!rapport) redirect('/admin/reconnaissances')

  return <FeuilleScene rapport={rapport} salle={salle} />
}
