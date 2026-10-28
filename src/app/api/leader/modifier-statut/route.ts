import { NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'

const supabaseAdmin = createAdminClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// Rendre un PCI de son groupe Actif ou Inactif (page Platines et plus)
// Ne change QUE le statut du compte : billets, banquets et historique ne sont pas touchés
export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

    const { data: compte } = await supabase.from('comptes').select('role, statut').eq('id', user.id).single()
    const estLeaderActif = compte?.role === 'leader' && compte?.statut === 'actif'
    if (!estLeaderActif && compte?.role !== 'admin') {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
    }

    const { id, statut } = await request.json()
    if (statut !== 'actif' && statut !== 'inactif') {
      return NextResponse.json({ error: 'Statut invalide' }, { status: 400 })
    }

    // Un leader ne peut pas changer son propre statut
    if (id === user.id) {
      return NextResponse.json({ error: 'Vous ne pouvez pas modifier votre propre statut' }, { status: 403 })
    }

    // Le PCI doit faire partie du groupe du leader
    if (compte?.role === 'leader') {
      const { data: groupeIds } = await supabaseAdmin
        .rpc('get_groupe_ids', { leader_uuid: user.id })
      const ids = (groupeIds ?? []).map((r: { compte_id: string }) => r.compte_id)
      if (!ids.includes(id)) {
        return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
      }
    }

    // Seulement les PCI et leaders déjà actifs ou inactifs
    const { data: cible } = await supabaseAdmin.from('comptes').select('role, statut').eq('id', id).single()
    if (!cible || !['pci', 'leader'].includes(cible.role) || !['actif', 'inactif'].includes(cible.statut)) {
      return NextResponse.json({ error: 'Ce compte ne peut pas être modifié' }, { status: 403 })
    }

    const { error } = await supabaseAdmin
      .from('comptes')
      .update({ statut })
      .eq('id', id)

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Erreur modifier statut:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
