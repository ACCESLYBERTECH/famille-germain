import { NextResponse } from 'next/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'

const supabaseAdmin = createAdminClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(request: Request) {
  try {
    const { identifiant } = await request.json()

    if (!identifiant) {
      return NextResponse.json({ error: 'Identifiant requis' }, { status: 400 })
    }

    // Chercher dans portiers_comptes
    const { data: portier } = await supabaseAdmin
      .from('portiers_comptes')
      .select('identifiant, actif')
      .eq('identifiant', identifiant.toUpperCase().trim())
      .single()

    if (!portier) {
      return NextResponse.json({ error: 'Identifiant introuvable' }, { status: 404 })
    }

    if (!portier.actif) {
      return NextResponse.json({ error: 'Ce compte portier est désactivé.' }, { status: 403 })
    }

    // Retourner le courriel généré
    const courriel = `${identifiant.toLowerCase().trim().replace(/\s+/g, '-')}@acceslybertech.com`
    return NextResponse.json({ courriel })

  } catch (error: any) {
    console.error('Erreur résolution identifiant:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}