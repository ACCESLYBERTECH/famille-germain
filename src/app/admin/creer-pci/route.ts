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

    const body = await request.json()
    const {
      prenom_1, nom_1, prenom_2, nom_2,
      courriel, telephone, adresse, ville,
      code_postal, province, pays,
      numero_amway, date_inscription_amway,
      role, leader_id,
      periode_sf_debut, periode_sf_fin,
      groupe, mot_de_passe,
    } = body

    // Créer l'utilisateur dans Supabase Auth
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email: courriel,
      password: mot_de_passe,
      email_confirm: true,
    })

    if (authError) return NextResponse.json({ error: authError.message }, { status: 400 })

    const userId = authData.user.id

    // Créer le compte dans la table comptes
    const { error: compteError } = await supabaseAdmin.from('comptes').insert({
      id: userId,
      prenom_1, nom_1,
      prenom_2: prenom_2 || null,
      nom_2: nom_2 || null,
      courriel,
      telephone: telephone || null,
      adresse: adresse || null,
      ville: ville || null,
      code_postal: code_postal || null,
      province: province || null,
      pays: pays || 'Canada',
      numero_amway: numero_amway || null,
      date_inscription_amway: date_inscription_amway || null,
      role: role || 'pci',
      leader_id: leader_id || null,
      periode_sf_debut: periode_sf_debut || null,
      periode_sf_fin: periode_sf_fin || null,
      groupe: groupe || null,
      statut: 'actif',
    })

    if (compteError) {
      // Supprimer l'utilisateur Auth si le compte n'a pas pu être créé
      await supabaseAdmin.auth.admin.deleteUser(userId)
      return NextResponse.json({ error: compteError.message }, { status: 400 })
    }

    // Envoyer l'email de bienvenue
    await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/emails/bienvenue-pci`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prenom: prenom_1, nom: nom_1, email: courriel }),
    })

    return NextResponse.json({ success: true, id: userId })

  } catch (error: any) {
    console.error('Erreur créer PCI:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}