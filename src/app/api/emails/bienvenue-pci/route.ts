import { NextResponse } from 'next/server'
import { envoyerBienvenuePCI } from '@/lib/email'

export async function POST(request: Request) {
  try {
    const { prenom, nom, email } = await request.json()
    await envoyerBienvenuePCI(prenom, nom, email)
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Erreur email bienvenue:', error)
    return NextResponse.json({ error: 'Erreur envoi email' }, { status: 500 })
  }
}