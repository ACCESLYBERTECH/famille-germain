import { NextResponse } from 'next/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { envoyerNotificationAdminNouveauPCI } from '@/lib/email'
import {
  normaliserCourriel, normaliserNumeroAmway, courrielValide, echapperIlike,
  MESSAGE_COURRIEL_UTILISE, MESSAGE_AMWAY_UTILISE, messageErreurCompte,
} from '@/lib/comptes'

const supabaseAdmin = createAdminClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const texte = (v: unknown) => String(v ?? '').trim()

// Inscription d'un nouveau PCI — tout se fait sur le serveur, en une seule opération :
// vérification des doublons (courriel, # Amway), création du compte de connexion
// et de la fiche PCI. Si la fiche échoue, le compte de connexion est annulé.
export async function POST(request: Request) {
  try {
    const f = await request.json()

    const courriel = normaliserCourriel(f.courriel)
    const numeroAmway = normaliserNumeroAmway(f.numero_amway)
    const motDePasse = String(f.mot_de_passe ?? '')

    // Validation
    if (!texte(f.prenom_1) || !texte(f.nom_1) || !courriel || !texte(f.telephone)) {
      return NextResponse.json({ error: 'Veuillez remplir tous les champs obligatoires.' }, { status: 400 })
    }
    if (!courrielValide(courriel)) return NextResponse.json({ error: 'Adresse courriel invalide.' }, { status: 400 })
    if (motDePasse.length < 8) return NextResponse.json({ error: 'Le mot de passe doit contenir au moins 8 caractères.' }, { status: 400 })
    if (!numeroAmway) return NextResponse.json({ error: 'Veuillez entrer votre numéro Amway.' }, { status: 400 })
    if (!f.consentement_conditions || !f.consentement_exactitude) {
      return NextResponse.json({ error: 'Veuillez accepter les conditions.' }, { status: 400 })
    }

    // Leader choisi : doit être un leader actif
    let leaderId: string | null = null
    if (f.leader_id) {
      const { data: leader } = await supabaseAdmin.from('comptes').select('id').eq('id', f.leader_id).eq('role', 'leader').eq('statut', 'actif').maybeSingle()
      if (!leader) return NextResponse.json({ error: 'Le leader choisi est introuvable. Veuillez en choisir un autre.' }, { status: 400 })
      leaderId = leader.id
    }

    // Doublons
    const { data: memeCourriel } = await supabaseAdmin.from('comptes').select('id').ilike('courriel', echapperIlike(courriel)).limit(1)
    if (memeCourriel && memeCourriel.length > 0) return NextResponse.json({ error: MESSAGE_COURRIEL_UTILISE }, { status: 409 })

    const { data: memeAmway } = await supabaseAdmin.from('comptes').select('id').eq('numero_amway', numeroAmway).limit(1)
    if (memeAmway && memeAmway.length > 0) return NextResponse.json({ error: MESSAGE_AMWAY_UTILISE }, { status: 409 })

    // 1. Compte de connexion
    const { data: auth, error: erreurAuth } = await supabaseAdmin.auth.admin.createUser({
      email: courriel,
      password: motDePasse,
      email_confirm: true,
    })
    if (erreurAuth || !auth?.user) {
      return NextResponse.json({ error: messageErreurCompte(erreurAuth?.message) }, { status: 400 })
    }

    // 2. Fiche PCI (rôle et statut imposés par le serveur)
    const { error: erreurCompte } = await supabaseAdmin.from('comptes').insert({
      id: auth.user.id,
      courriel,
      prenom_1: texte(f.prenom_1),
      nom_1: texte(f.nom_1),
      prenom_2: texte(f.prenom_2) || null,
      nom_2: texte(f.nom_2) || null,
      telephone: texte(f.telephone),
      adresse: texte(f.adresse),
      ville: texte(f.ville),
      code_postal: texte(f.code_postal),
      province: texte(f.province),
      pays: texte(f.pays) || 'Canada',
      numero_amway: numeroAmway,
      date_inscription_amway: f.date_inscription_amway || null,
      leader_id: leaderId,
      consentement_communications: !!f.consentement_communications,
      statut: 'en_attente',
      role: 'pci',
    })

    if (erreurCompte) {
      // Annuler le compte de connexion : pas de compte « fantôme »
      await supabaseAdmin.auth.admin.deleteUser(auth.user.id)
      return NextResponse.json({ error: messageErreurCompte(erreurCompte.message) }, { status: 400 })
    }

    // Avis à l'administrateur (un échec d'envoi n'annule pas l'inscription)
    try {
      await envoyerNotificationAdminNouveauPCI(texte(f.prenom_1), texte(f.nom_1))
    } catch (e: any) {
      console.error('Erreur avis admin inscription:', e?.message)
    }

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Erreur inscription:', error?.message)
    return NextResponse.json({ error: messageErreurCompte(null) }, { status: 500 })
  }
}
