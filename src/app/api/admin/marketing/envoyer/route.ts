import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { envoyerPromoEvenement } from '@/lib/email'

const supabaseAdmin = createAdminClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

    const { data: compteRole } = await supabase.from('comptes').select('role').eq('id', user.id).single()
    if (compteRole?.role !== 'admin') return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

    const { evenementId, sujet, imageUrl } = await request.json()
    if (!evenementId || !sujet) {
      return NextResponse.json({ error: 'Événement et sujet requis' }, { status: 400 })
    }

    const { data: evenement, error: erreurEvenement } = await supabaseAdmin
      .from('evenements')
      .select('*, paliers:evenement_paliers(*), villes:evenement_villes(*), banquet:banquets(*)')
      .eq('id', evenementId)
      .single()

    if (erreurEvenement || !evenement) {
      return NextResponse.json({ error: 'Événement introuvable' }, { status: 404 })
    }

    const { data: destinatairesBruts, error: erreurDestinataires } = await supabaseAdmin
      .from('comptes')
      .select('prenom_1, courriel')
      .eq('statut', 'actif')
      .eq('consentement_communications', true)
      .in('role', ['pci', 'leader'])

    if (erreurDestinataires) {
      return NextResponse.json({ error: erreurDestinataires.message }, { status: 500 })
    }

    const destinataires = (destinatairesBruts ?? [])
      .filter(d => !!d.courriel)
      .map(d => ({ prenom: d.prenom_1 ?? '', email: d.courriel as string }))

    if (destinataires.length === 0) {
      return NextResponse.json({ error: 'Aucun destinataire consentant trouvé' }, { status: 400 })
    }

    const banquet = (evenement.banquet ?? [])[0] ?? null

    await envoyerPromoEvenement({
      destinataires,
      sujet,
      nomEvenement: evenement.nom,
      description: evenement.description ?? '',
      dateDebut: evenement.date_debut,
      dateFin: evenement.date_fin,
      lieu: evenement.lieu ?? '',
      villes: (evenement.villes ?? []).map((v: any) => v.nom_ville),
      acces: evenement.acces,
      aBillets: evenement.a_billets,
      aBanquet: evenement.a_banquet,
      banquetNom: banquet?.nom ?? null,
      banquetPrix: banquet?.prix ?? null,
      paliers: (evenement.paliers ?? []).map((p: any) => ({ prix: p.prix, date_fin: p.date_fin, ordre: p.ordre })),
      imageUrl: imageUrl || undefined,
      lienAchat: `${process.env.NEXT_PUBLIC_APP_URL}/evenements`,
    })

    await supabaseAdmin.from('campagnes_email').insert({
      evenement_id: evenementId,
      evenement_nom: evenement.nom,
      sujet,
      nombre_destinataires: destinataires.length,
      envoye_par: user.id,
    })

    return NextResponse.json({ success: true, nombre: destinataires.length })

  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}