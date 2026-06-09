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

    const { action, ...payload } = await request.json()

    // Créer un nouveau portier
    if (action === 'creer') {
      const { identifiant, mot_de_passe, nom_affichage, evenement_id, evenement_ville_id } = payload

      if (!identifiant || !mot_de_passe || !nom_affichage) {
        return NextResponse.json({ error: 'Champs requis manquants' }, { status: 400 })
      }

      const courriel = `${identifiant.toLowerCase().replace(/\s+/g, '-')}@acceslybertech.com`

      const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
        email: courriel,
        password: mot_de_passe,
        email_confirm: true,
      })

      if (authError || !authData.user) {
        return NextResponse.json({ error: authError?.message ?? 'Erreur création compte' }, { status: 500 })
      }

      const { error: compteError } = await supabaseAdmin.from('comptes').insert({
        id: authData.user.id,
        courriel,
        prenom_1: nom_affichage,
        nom_1: '',
        role: 'portier',
        statut: 'actif',
      })

      if (compteError) {
        console.error('Erreur insertion comptes:', compteError)
        return NextResponse.json({ error: compteError.message }, { status: 500 })
      }

      const { error: portierError } = await supabaseAdmin.from('portiers_comptes').insert({
        compte_id: authData.user.id,
        identifiant: identifiant.toUpperCase(),
        nom_affichage,
        actif: true,
        evenement_id: evenement_id || null,
        evenement_ville_id: evenement_ville_id || null,
      })

      if (portierError) return NextResponse.json({ error: portierError.message }, { status: 500 })

      return NextResponse.json({ success: true })
    }

    // Modifier un portier
    if (action === 'modifier') {
      const { id, nom_affichage, actif, evenement_id, evenement_ville_id, mot_de_passe } = payload

      const updates: any = {
        nom_affichage,
        actif,
        evenement_id: evenement_id || null,
        evenement_ville_id: evenement_ville_id || null,
      }

      await supabaseAdmin.from('portiers_comptes').update(updates).eq('id', id)

      const { data: portier } = await supabaseAdmin.from('portiers_comptes').select('compte_id').eq('id', id).single()
      if (portier) {
        await supabaseAdmin.from('comptes').update({ statut: actif ? 'actif' : 'inactif' }).eq('id', portier.compte_id)
      }

      if (mot_de_passe && portier) {
        await supabaseAdmin.auth.admin.updateUserById(portier.compte_id, { password: mot_de_passe })
      }

      return NextResponse.json({ success: true })
    }

    return NextResponse.json({ error: 'Action inconnue' }, { status: 400 })

  } catch (error: any) {
    console.error('Erreur portiers:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}