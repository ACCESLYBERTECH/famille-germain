import { NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { Resend } from 'resend'
import * as XLSX from 'xlsx'

const supabaseAdmin = createAdminClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const resend = new Resend(process.env.RESEND_API_KEY)

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

    const { data: compte } = await supabase.from('comptes').select('role').eq('id', user.id).single()
    if (compte?.role !== 'admin') return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

    const { evenement_id, destinataire } = await request.json()

    if (!evenement_id || !destinataire) {
      return NextResponse.json({ error: 'Événement et destinataire requis' }, { status: 400 })
    }

    // Récupérer les billets de l'événement
    const { data: billets } = await supabaseAdmin
      .from('billets')
      .select('*, evenements(nom), comptes!billets_compte_id_fkey(numero_amway)')
      .eq('evenement_id', evenement_id)
      .order('created_at', { ascending: true })

    if (!billets || billets.length === 0) {
      return NextResponse.json({ error: 'Aucun billet pour cet événement' }, { status: 400 })
    }

    const nomEvenement = billets[0]?.evenements?.nom ?? 'Événement'

    // Construire les données Excel
    const lignes = billets.map(b => ({
      'Date et heure d\'achat': new Date(b.created_at).toLocaleString('fr-CA', { dateStyle: 'short', timeStyle: 'short' }),
      '# Amway': b.comptes?.numero_amway ?? '',
      'Nom PCI': b.nom_pci,
      'Prix du billet': b.est_sans_frais ? 'Sans frais' : b.prix_paye === 0 ? 'Billet offert' : `${b.prix_paye.toFixed(2)} $`,
      'Événement': nomEvenement,
    }))

    // Générer le fichier Excel
    const worksheet = XLSX.utils.json_to_sheet(lignes)
    const workbook = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Billets')

    // Ajuster la largeur des colonnes
    worksheet['!cols'] = [
      { wch: 20 }, // Date
      { wch: 12 }, // # Amway
      { wch: 30 }, // Nom PCI
      { wch: 15 }, // Prix
      { wch: 30 }, // Événement
    ]

    const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' })
    const base64 = Buffer.from(buffer).toString('base64')
    const nomFichier = `billets-${nomEvenement.replace(/\s+/g, '-')}-${new Date().toLocaleDateString('fr-CA')}.xlsx`

    // Envoyer par email via Resend
    await resend.emails.send({
      from: process.env.FROM_EMAIL!,
      to: destinataire,
      subject: `Rapport billets — ${nomEvenement}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background-color: #1A2535; padding: 24px 32px;">
            <h2 style="color: #C9A84C; margin: 0;">Famille Germain – Yager Group</h2>
          </div>
          <div style="padding: 32px;">
            <h3 style="color: #1A2535;">Rapport de billets</h3>
            <p style="color: #333333;">Veuillez trouver en pièce jointe le rapport Excel des billets pour l'événement <strong>${nomEvenement}</strong>.</p>
            <p style="color: #333333;">Ce rapport contient <strong>${billets.length} billet${billets.length > 1 ? 's' : ''}</strong>.</p>
            <hr style="border-color: #C9A84C; margin: 24px 0;" />
            <p style="color: #888888; font-size: 12px; text-align: center;">Famille Germain – Yager Group | ACCESLYBERTECH INC.</p>
          </div>
        </div>
      `,
      attachments: [
        {
          filename: nomFichier,
          content: base64,
        },
      ],
    })

    return NextResponse.json({ success: true, nbBillets: billets.length })
  } catch (error: any) {
    console.error('Erreur rapport Excel:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}