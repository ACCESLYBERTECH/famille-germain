import { NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'

const supabaseAdmin = createAdminClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// Donner ou retirer l'accès aux conférences Leadership (page Platines et plus)
// - N'importe quel leader au-dessus du PCI dans l'arbre peut le faire (pas seulement son leader direct)
// - Jamais pour un PCI hors de son organisation (vérifié avec get_groupe_ids)
// - Les leaders ont toujours l'accès : seuls les comptes « pci » sont modifiés
export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

    const { data: compte } = await supabase.from('comptes').select('role, statut').eq('id', user.id).single()
    const estLeaderActif = compte?.role === 'leader' && compte?.statut === 'actif'
    const estAdmin = compte?.role === 'admin'
    if (!estLeaderActif && !estAdmin) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

    const corps = await request.json()
    const ids: string[] = Array.isArray(corps.ids) ? corps.ids : corps.id ? [corps.id] : []
    const acces = corps.acces === true
    if (ids.length === 0 || ids.length > 1000 || ids.some(i => typeof i !== 'string')) {
      return NextResponse.json({ error: 'Aucun PCI choisi' }, { status: 400 })
    }

    // Chaque PCI doit faire partie de l'organisation du leader (tous les niveaux en dessous)
    if (!estAdmin) {
      const { data: groupeIds } = await supabaseAdmin.rpc('get_groupe_ids', { leader_uuid: user.id })
      const permis = new Set((groupeIds ?? []).map((r: { compte_id: string }) => r.compte_id))
      if (ids.some(i => !permis.has(i))) {
        return NextResponse.json({ error: 'Un des PCI choisis ne fait pas partie de votre organisation' }, { status: 403 })
      }
    }

    const { data: cibles, error: erreurCibles } = await supabaseAdmin
      .from('comptes').select('id').in('id', ids).eq('role', 'pci')
    if (erreurCibles) return NextResponse.json({ error: erreurCibles.message }, { status: 500 })
    const idsPci = (cibles ?? []).map(c => c.id)
    if (idsPci.length === 0) {
      return NextResponse.json({ error: 'Les leaders ont déjà toujours accès aux conférences Leadership' }, { status: 400 })
    }

    const { error } = await supabaseAdmin.from('comptes').update({ acces_leadership: acces }).in('id', idsPci)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    return NextResponse.json({ success: true, nombre: idsPci.length, ids: idsPci, acces })
  } catch (error: any) {
    console.error('Erreur accès Leadership:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
