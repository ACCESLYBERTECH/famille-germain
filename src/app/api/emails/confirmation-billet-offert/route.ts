import { NextResponse } from 'next/server'
import { envoyerConfirmationBillet } from '@/lib/email'

export async function POST(request: Request) {
  try {
    const { prenom, nom, email, evenement, ville } = await request.json()
    await envoyerConfirmationBillet({
      prenom,
      nom,
      email,
      evenement,
      ville,
      date: '',
      prix: '0.00',
    })
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Erreur email billet offert:', error)
    return NextResponse.json({ error: 'Erreur envoi email' }, { status: 500 })
  }
}