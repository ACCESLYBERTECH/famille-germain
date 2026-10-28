import { NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { peutScanner } from '@/lib/acces'

const supabaseAdmin = createAdminClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// Recherche manuelle d'un billet par nom (scanner)
// Accessible au portier, à l'admin et au développeur
export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

    const { data: compte } = await supabase.from('comptes').select('role').eq('id', user.id).single()
    if (!peutScanner(compte?.role)) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

    const { evenement_id, recherche } = await request.json()
    if (!evenement_id || !recherche?.trim()) return NextResponse.json({ billets: [] })

    const { data: billets } = await supabaseAdmin
      .from('billets')
      .select('id, nom_pci, statut, qr_code_token')
      .eq('evenement_id', evenement_id)
      .neq('statut', 'rembourse')

    const termes = recherche.trim().toLowerCase()
    const trouves = (billets ?? []).filter(b => (b.nom_pci ?? '').toLowerCase().includes(termes))

    return NextResponse.json({ billets: trouves })
  } catch (error: any) {
    console.error('Erreur recherche scan:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
