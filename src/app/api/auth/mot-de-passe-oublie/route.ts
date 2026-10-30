import { NextResponse } from 'next/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { envoyerReinitialisationMotDePasse } from '@/lib/email'

const supabaseAdmin = createAdminClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const DELAI_ENTRE_ENVOIS_MS = 60 * 1000 // 1 courriel par adresse par minute

// Adresse du site pour le lien du courriel.
// Jamais tirée de la requête (sinon quelqu'un pourrait faire pointer le lien vers un autre site).
function adresseSite(request: Request): string {
  if (process.env.NODE_ENV === 'development') {
    const origine = new URL(request.url).origin
    if (origine.startsWith('http://localhost')) return origine
  }
  return process.env.NEXT_PUBLIC_APP_URL ?? 'https://famille-germain.vercel.app'
}

// Mot de passe oublié : le site envoie lui-même le courriel (gabarit maison, en français)
// La réponse est TOUJOURS la même, pour ne pas révéler si une adresse est inscrite.
export async function POST(request: Request) {
  const reponse = NextResponse.json({ success: true })
  try {
    const { courriel } = await request.json()
    const email = String(courriel ?? '').trim().toLowerCase()
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ error: 'Adresse courriel invalide' }, { status: 400 })
    }

    // Limite d'envoi
    const { data: demande } = await supabaseAdmin
      .from('demandes_mot_de_passe')
      .select('derniere_demande')
      .eq('courriel', email)
      .maybeSingle()
    if (demande && Date.now() - new Date(demande.derniere_demande).getTime() < DELAI_ENTRE_ENVOIS_MS) {
      return reponse
    }
    await supabaseAdmin.from('demandes_mot_de_passe').upsert({ courriel: email, derniere_demande: new Date().toISOString() })

    // Compte existant (et pas refusé)
    const emailEchappe = email.replace(/[\\%_]/g, '\\$&')
    const { data: compte } = await supabaseAdmin
      .from('comptes')
      .select('prenom_1, statut')
      .ilike('courriel', emailEchappe)
      .maybeSingle()
    if (!compte || compte.statut === 'refuse') return reponse

    // Lien sécurisé généré par Supabase (sans envoi de courriel par Supabase)
    const { data: lien, error } = await supabaseAdmin.auth.admin.generateLink({ type: 'recovery', email })
    if (error || !lien?.properties?.hashed_token) {
      console.error('Erreur lien mot de passe:', error?.message)
      return reponse
    }

    const url = `${adresseSite(request)}/reinitialiser-mot-de-passe?token_hash=${encodeURIComponent(lien.properties.hashed_token)}&type=recovery`
    await envoyerReinitialisationMotDePasse({ email, prenom: compte.prenom_1 ?? '', lien: url })

    return reponse
  } catch (error: any) {
    console.error('Erreur mot de passe oublié:', error?.message)
    return reponse
  }
}
