import { NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { estAdminOuDeveloppeur } from '@/lib/acces'

const supabaseAdmin = createAdminClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// Nombre de billets scannés par ville pour un événement (aucun nom, aucun leader)
// Accessible à l'admin et au développeur
export async function GET(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

    const { data: compte } = await supabase.from('comptes').select('role').eq('id', user.id).single()
    if (!estAdminOuDeveloppeur(compte?.role)) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

    const evenementId = new URL(request.url).searchParams.get('evenement_id')
    if (!evenementId) return NextResponse.json({ scans: [] })

    const { data: billets } = await supabaseAdmin
      .from('billets')
      .select('scanne_ville_id')
      .eq('evenement_id', evenementId)
      .eq('statut', 'utilise')

    // Seulement l'identifiant de la ville est retourné
    return NextResponse.json({ scans: (billets ?? []).map(b => ({ scanne_ville_id: b.scanne_ville_id })) })
  } catch (error: any) {
    console.error('Erreur stats scan:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
