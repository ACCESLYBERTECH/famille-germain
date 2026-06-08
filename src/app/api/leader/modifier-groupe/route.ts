import { NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'

const supabaseAdmin = createAdminClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

    const { data: compte } = await supabase.from('comptes').select('role').eq('id', user.id).single()
    if (compte?.role !== 'leader' && compte?.role !== 'admin') {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
    }

    const { id, groupe } = await request.json()

    // Vérifier que le PCI appartient bien au groupe du leader
    if (compte?.role === 'leader') {
      const { data: groupeIds } = await supabaseAdmin
        .rpc('get_groupe_ids', { leader_uuid: user.id })
      const ids = (groupeIds ?? []).map((r: { compte_id: string }) => r.compte_id)
      if (!ids.includes(id)) {
        return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
      }
    }

    const { error } = await supabaseAdmin
      .from('comptes')
      .update({ groupe: groupe || null })
      .eq('id', id)

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Erreur modifier groupe:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}