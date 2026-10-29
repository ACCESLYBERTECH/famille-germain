import { NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'
import { chargerRapportBanquets } from '@/lib/rapportBanquets'
import { genererRapportBanquetsPDF } from '@/lib/rapportBanquetsPDF'
import { envoyerRapportBanquets } from '@/lib/email'

// Envoi du Rapport banquets (PDF, sans courriels des PCI) à un leader ou à un courriel saisi
// Réservé à l'admin
export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

    const { data: compte } = await supabase.from('comptes').select('role').eq('id', user.id).single()
    if (compte?.role !== 'admin') return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

    const { evenement_id, leader_id, filtre_banquet, groupe, destinataire_leader_id, courriel } = await request.json()

    const rapport = await chargerRapportBanquets({
      evenementId: evenement_id ?? '',
      leaderId: leader_id ?? '',
      filtreBanquet: filtre_banquet ?? 'tous',
      groupe: groupe ?? '',
    })

    // Destinataire : un leader actif de la liste, OU un courriel saisi à la main
    let email = ''
    if (destinataire_leader_id) {
      const leader = rapport.leadersActifs.find(l => l.id === destinataire_leader_id)
      if (!leader) return NextResponse.json({ error: 'Leader introuvable' }, { status: 400 })
      email = leader.courriel
    } else {
      email = String(courriel ?? '').trim()
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        return NextResponse.json({ error: 'Adresse courriel invalide' }, { status: 400 })
      }
    }

    if (rapport.lignes.length === 0) {
      return NextResponse.json({ error: 'Le rapport est vide' }, { status: 400 })
    }

    const pdf = await genererRapportBanquetsPDF(rapport)
    const dateFichier = new Date().toLocaleDateString('fr-CA', { timeZone: 'America/Toronto' })
    await envoyerRapportBanquets({
      email,
      sousTitre: rapport.sousTitre,
      pdf,
      nomFichier: `rapport-banquets-${dateFichier}.pdf`,
    })

    return NextResponse.json({ success: true, email })
  } catch (error: any) {
    console.error('Erreur envoi rapport banquets:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
