import { createClient } from '@/utils/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { saisieOuverte } from '@/lib/reconnaissances'

export const supabaseAdmin = createAdminClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// Qui fait la demande, et peut-il entrer des reconnaissances pour cet événement ?
export async function verifierAcces(evenementId: unknown): Promise<
  | { ok: true; userId: string; estAdmin: boolean; evenement: { id: string; date_debut: string; reconnaissances_date_limite: string | null } }
  | { ok: false; erreur: string; statut: number }
> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { ok: false, erreur: 'Non autorisé', statut: 401 }

  const { data: compte } = await supabaseAdmin.from('comptes').select('role, statut').eq('id', user.id).single()
  const estAdmin = compte?.role === 'admin'
  if (!estAdmin && !(compte?.role === 'leader' && compte?.statut === 'actif')) {
    return { ok: false, erreur: 'Réservé aux leaders Platines et plus', statut: 403 }
  }

  if (typeof evenementId !== 'string') return { ok: false, erreur: 'Événement manquant', statut: 400 }
  const { data: evenement } = await supabaseAdmin
    .from('evenements')
    .select('id, date_debut, a_reconnaissances, reconnaissances_date_limite')
    .eq('id', evenementId)
    .single()
  if (!evenement || !evenement.a_reconnaissances) {
    return { ok: false, erreur: "Cet événement n'a pas de reconnaissances", statut: 400 }
  }
  if (!estAdmin && !saisieOuverte(evenement)) {
    return { ok: false, erreur: 'La date limite est passée : les reconnaissances de cet événement sont verrouillées.', statut: 403 }
  }
  return { ok: true, userId: user.id, estAdmin, evenement }
}
