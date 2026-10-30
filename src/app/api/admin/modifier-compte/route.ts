import { NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { estAdminOuDeveloppeur, estDeveloppeur } from '@/lib/acces'
import { normaliserCourriel, normaliserNumeroAmway, courrielValide, echapperIlike, MESSAGE_COURRIEL_UTILISE, MESSAGE_AMWAY_UTILISE, messageErreurCompte } from '@/lib/comptes'

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

    // Courriel et numéro Amway : uniques
    const courrielNormalise = normaliserCourriel(courriel)
    const amwayNormalise = normaliserNumeroAmway(numero_amway)
    if (!courrielValide(courrielNormalise)) return NextResponse.json({ error: 'Adresse courriel invalide.' }, { status: 400 })
    const { data: memeCourriel } = await supabaseAdmin.from('comptes').select('id').ilike('courriel', echapperIlike(courrielNormalise)).neq('id', id).limit(1)
    if (memeCourriel && memeCourriel.length > 0) return NextResponse.json({ error: MESSAGE_COURRIEL_UTILISE }, { status: 409 })
    if (amwayNormalise) {
      const { data: memeAmway } = await supabaseAdmin.from('comptes').select('id').eq('numero_amway', amwayNormalise).neq('id', id).limit(1)
      if (memeAmway && memeAmway.length > 0) return NextResponse.json({ error: MESSAGE_AMWAY_UTILISE }, { status: 409 })
    }

    // Le statut ne change que si le compte est déjà actif ou inactif
    // (une demande en attente passe par Approuver / Refuser)
    const { data: compteCible } = await supabaseAdmin.from('comptes').select('statut, courriel').eq('id', id).single()

    // Si le courriel change, changer aussi le courriel de connexion (sinon la personne ne peut plus se connecter avec le nouveau)
    if (compteCible && normaliserCourriel(compteCible.courriel) !== courrielNormalise) {
      const { error: erreurAuth } = await supabaseAdmin.auth.admin.updateUserById(id, { email: courrielNormalise, email_confirm: true })
      if (erreurAuth) return NextResponse.json({ error: messageErreurCompte(erreurAuth.message) }, { status: 400 })
    }
    const statutModifiable = ['actif', 'inactif'].includes(compteCible?.statut ?? '') && (statut === 'actif' || statut === 'inactif')

    const { error } = await supabaseAdmin
      .from('comptes')
      .update({
        prenom_1, nom_1,
        prenom_2: prenom_2 || null,
        nom_2: nom_2 || null,
        courriel: courrielNormalise, telephone, adresse, ville, code_postal, province, pays,
        numero_amway: amwayNormalise || null, date_inscription_amway,
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

    if (error) return NextResponse.json({ error: messageErreurCompte(error.message) }, { status: 500 })
    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Erreur modifier compte:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}