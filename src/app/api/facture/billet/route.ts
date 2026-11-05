import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'
import { genererFacture } from '@/lib/facturePDF'

// Télécharger la facture PDF d'un de ses achats (billet ou banquet)
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

    const { searchParams } = new URL(request.url)
    const billetId = searchParams.get('billet_id')
    const type = searchParams.get('type') === 'banquet' ? 'banquet' : 'billet'
    if (!billetId) return NextResponse.json({ error: 'billet_id requis' }, { status: 400 })

    const resultat = await genererFacture(type, billetId, user.id)
    if ('erreur' in resultat) return NextResponse.json({ error: resultat.erreur }, { status: resultat.statut })

    return new NextResponse(new Uint8Array(resultat.pdf), {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${resultat.nomFichier}"`,
      },
    })
  } catch (error: any) {
    console.error('Erreur facture PDF:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
