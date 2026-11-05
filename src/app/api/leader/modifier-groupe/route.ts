import { NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { cleGroupe } from '@/lib/groupes'

const supabaseAdmin = createAdminClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// Change le groupe d'un ou plusieurs PCI
// Règle : un leader classe SEULEMENT ses propres PCI (ceux qui l'ont choisi comme leader).
// Les PCI de ses leaders en dessous restent visibles, mais leur groupe appartient à leur leader.
export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

    const { data: compte } = await supabase.from('comptes').select('role, statut').eq('id', user.id).single()
    const estAdmin = compte?.role === 'admin'
    if (!estAdmin && (compte?.role !== 'leader' || compte?.statut !== 'actif')) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
    }

    const corps = await request.json()
    // Un seul PCI ({ id }) ou plusieurs ({ ids: [...] })
    const ids: string[] = Array.isArray(corps.ids) ? corps.ids : corps.id ? [corps.id] : []
    if (ids.length === 0 || ids.length > 1000 || ids.some(id => typeof id !== 'string')) {
      return NextResponse.json({ error: 'Aucun PCI sélectionné' }, { status: 400 })
    }

    const groupe = cleGroupe(typeof corps.groupe === 'string' ? corps.groupe : '')
    if (groupe.length > 120) {
      return NextResponse.json({ error: 'Nom de groupe trop long (120 caractères maximum)' }, { status: 400 })
    }

    if (!estAdmin) {
      const { data: proprietaires } = await supabaseAdmin
        .from('comptes')
        .select('id, leader_id')
        .in('id', ids)
      const tousAMoi = (proprietaires ?? []).length === ids.length &&
        (proprietaires ?? []).every((p: { leader_id: string | null }) => p.leader_id === user.id)
      if (!tousAMoi) {
        return NextResponse.json({ error: "Vous pouvez classer seulement vos propres PCI. Le groupe d'un PCI appartient à son leader." }, { status: 403 })
      }
    }

    const { error } = await supabaseAdmin
      .from('comptes')
      .update({ groupe: groupe || null })
      .in('id', ids)

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    return NextResponse.json({ success: true, groupe: groupe || null, nombre: ids.length })
  } catch (error: any) {
    console.error('Erreur modifier groupe:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
