import { NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'
import { chargerRapportBilletsLeader, genererRapportBilletsLeaderPDF, nomFichierRapport } from '@/lib/rapportBilletsLeader'
import { envoyerRapportBilletsLeader } from '@/lib/email'

// Rapport PDF des ventes de billets d'un leader
//   action 'pdf'      → renvoie le PDF (aperçu et téléchargement)
//   action 'envoyer'  → envoie le PDF par courriel (après que le leader l'a vu)
export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

    const { data: compte } = await supabase.from('comptes').select('role, statut, prenom_1, nom_1, courriel').eq('id', user.id).single()
    const estAdmin = compte?.role === 'admin'
    if (!estAdmin && !(compte?.role === 'leader' && compte?.statut === 'actif')) {
      return NextResponse.json({ error: 'Réservé aux leaders Platines et plus' }, { status: 403 })
    }

    const corps = await request.json()
    const rapport = await chargerRapportBilletsLeader(user.id, estAdmin, {
      billetIds: corps.billetIds,
      evenement: typeof corps.evenement === 'string' ? corps.evenement : '',
      leaderFiltre: typeof corps.leaderFiltre === 'string' ? corps.leaderFiltre : '',
      groupe: typeof corps.groupe === 'string' ? corps.groupe : '',
    })
    if ('erreur' in rapport) return NextResponse.json({ error: rapport.erreur }, { status: rapport.statut })

    const pdf = await genererRapportBilletsLeaderPDF(rapport)
    const nomFichier = nomFichierRapport(rapport)

    if (corps.action === 'envoyer') {
      const email = String(corps.destinataire ?? '').trim()
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        return NextResponse.json({ error: 'Adresse courriel invalide' }, { status: 400 })
      }
      const message = typeof corps.message === 'string' ? corps.message.trim().slice(0, 1000) : ''
      await envoyerRapportBilletsLeader({
        email,
        leader: rapport.leader,
        courrielLeader: compte?.courriel ?? null,
        evenement: rapport.evenement.titre,
        groupe: rapport.groupe ?? 'Tous les groupes',
        nombreBillets: rapport.resume.total,
        message,
        pdf,
        nomFichier,
      })
      return NextResponse.json({ success: true, email })
    }

    return new NextResponse(new Uint8Array(pdf), {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `inline; filename="${nomFichier}"`,
      },
    })
  } catch (error: any) {
    console.error('Erreur rapport billets leader:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
