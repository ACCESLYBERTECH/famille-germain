import { createClient } from '@/utils/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { redirect } from 'next/navigation'
import Navbar from '@/components/Navbar'
import MesFactures, { type Facture } from './MesFactures'
import { regrouperAchats } from '@/lib/factures'

const supabaseAdmin = createAdminClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// Mes factures : tous les achats PAYÉS (billets et banquets), du plus récent au plus ancien.
// Les factures sont fabriquées sur demande : rien n'est stocké, rien ne disparaît.
export default async function MesFacturesPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/connexion')

  const { data: compte } = await supabase
    .from('comptes')
    .select('prenom_1, role')
    .eq('id', user.id)
    .single()

  const [{ data: billets }, { data: banquets }] = await Promise.all([
    supabaseAdmin
      .from('billets')
      .select('id, nom_pci, prix_paye, prix_total, statut, est_sans_frais, created_at, stripe_payment_intent_id, evenements(nom, date_debut)')
      .eq('compte_id', user.id)
      .eq('est_sans_frais', false)
      .gt('prix_paye', 0),
    supabaseAdmin
      .from('billets_banquets')
      .select('id, nom_pci, prix_paye, prix_total, statut, cree_at, banquets(nom, evenement:evenements(nom, date_debut))')
      .eq('compte_id', user.id),
  ])

  const factures: Facture[] = [
    // Un achat de plusieurs billets = une seule facture
    ...regrouperAchats((billets ?? []) as any[]).map((groupe: any[]) => {
      const premier = groupe[0]
      const nbRembourses = groupe.filter(b => b.statut === 'rembourse').length
      return {
        id: premier.id,
        type: 'billet' as const,
        numero: `BIL-${premier.id.slice(0, 8).toUpperCase()}`,
        dateAchat: premier.created_at,
        titre: premier.evenements?.nom ?? 'Événement',
        dateEvenement: premier.evenements?.date_debut ?? null,
        pour: groupe.map(b => b.nom_pci).join(', '),
        nbBillets: groupe.length,
        montant: groupe.reduce((s, b) => s + Number(b.prix_total ?? b.prix_paye ?? 0), 0),
        rembourse: nbRembourses === groupe.length,
        partiel: nbRembourses > 0 && nbRembourses < groupe.length,
      }
    }),
    ...(banquets ?? []).filter((b: any) => Number(b.prix_total ?? b.prix_paye ?? 0) > 0).map((b: any) => ({
      id: b.id,
      type: 'banquet' as const,
      numero: `BAN-${b.id.slice(0, 8).toUpperCase()}`,
      dateAchat: b.cree_at,
      titre: `${b.banquets?.nom ?? 'Banquet'} — ${b.banquets?.evenement?.nom ?? ''}`,
      dateEvenement: b.banquets?.evenement?.date_debut ?? null,
      pour: b.nom_pci,
      nbBillets: 1,
      montant: Number(b.prix_total ?? b.prix_paye ?? 0),
      rembourse: b.statut === 'rembourse',
      partiel: false,
    })),
  ].sort((a, b) => new Date(b.dateAchat).getTime() - new Date(a.dateAchat).getTime())

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#F5F3EE' }}>
      <Navbar prenom={compte?.prenom_1 ?? ''} role={compte?.role ?? ''} />
      <div className="max-w-3xl mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold mb-1" style={{ color: '#1A2535' }}>Mes factures</h1>
        <p className="text-sm mb-6" style={{ color: '#666666' }}>Tous vos achats payés, du plus récent au plus ancien.</p>
        <MesFactures factures={factures} />
      </div>
    </div>
  )
}
