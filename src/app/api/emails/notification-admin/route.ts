import { NextResponse } from 'next/server'
import { envoyerNotificationAdminNouveauPCI, envoyerNotificationAdminNouveauBillet } from '@/lib/email'

export async function POST(request: Request) {
  try {
    const { type, prenomPCI, nomPCI, evenement, ville } = await request.json()

    if (type === 'nouveau_pci') {
      await envoyerNotificationAdminNouveauPCI(prenomPCI, nomPCI)
    } else if (type === 'nouveau_billet') {
      await envoyerNotificationAdminNouveauBillet(prenomPCI, nomPCI, evenement, ville)
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Erreur notification admin:', error)
    return NextResponse.json({ error: 'Erreur envoi email' }, { status: 500 })
  }
}