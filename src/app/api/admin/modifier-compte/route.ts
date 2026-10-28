import { NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { estAdminOuDeveloppeur, estDeveloppeur } from '@/lib/acces'

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
    if (!estAdminOuDeveloppeur(compte?.role)) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

    const { id, prenom_1, nom_1, prenom_2, nom_2, courriel, telephone, adresse, ville, code_postal, province, pays, numero_amway, date_inscription_amway, role, leader_id, periode_sf_debut, periode_sf_fin, groupe, photo_url, visible_inscription, statut } = await request.json()

    // Garde-fou : le développeur ne peut pas toucher aux comptes admin/développeur
    // ni donner ces rôles à quelqu'un
    if (estDeveloppeur(compte?.role)) {
      const { data: cible } = await supabaseAdmin.from('comptes').select('role').eq('id', id).single()
      const rolesProteges = ['admin', 'developpeur']
      if (rolesProteges.includes(cible?.role ?? '') || rolesProteges.includes(role)) {
        return NextResponse.json({ error: 'Action réservée à l\'administrateur' }, { status: 403 })
      }
    }

    // Le statut ne change que si le compte est déjà actif ou inactif
    // (une demande en attente passe par Approuver / Refuser)
    const { data: compteCible } = await supabaseAdmin.from('comptes').select('statut').eq('id', id).single()
    const statutModifiable = ['actif', 'inactif'].includes(compteCible?.statut ?? '') && (statut === 'actif' || statut === 'inactif')

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
        // Statut modifiable seulement entre actif et inactif (l'historique des billets n'est pas touché)
        ...(statutModifiable ? { statut } : {}),
      })
      .eq('id', id)

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Erreur modifier compte:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}