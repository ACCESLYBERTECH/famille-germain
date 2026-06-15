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
    if (compte?.role !== 'admin') return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

    const { id, prenom_1, nom_1, prenom_2, nom_2, courriel, telephone, adresse, ville, code_postal, province, pays, numero_amway, date_inscription_amway, role, leader_id, periode_sf_debut, periode_sf_fin, groupe, photo_url, visible_inscription } = await request.json()

    const { error } = await supabaseAdmin
      .from('comptes')
      .update({
        prenom_1, nom_1,
        prenom_2: prenom_2 || null,
        nom_2: nom_2 || null,
        courriel, telephone, adresse, ville, code_postal, province, pays,
        numero_amway, date_inscription_amway,
        role,
        leader_id: leader_id || null,
        periode_sf_debut: periode_sf_debut || null,
        periode_sf_fin: periode_sf_fin || null,
        groupe: groupe || null,
        photo_url: photo_url || null,
        visible_inscription: visible_inscription !== undefined ? visible_inscription : true,
      })
      .eq('id', id)

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Erreur modifier compte:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}