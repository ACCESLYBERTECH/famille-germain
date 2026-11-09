// Factures PDF (billets et banquets) — fabriquées sur demande à partir des achats enregistrés.
// Aucun fichier n'est stocké : les montants restent dans la base de données pour toujours.
// Un achat de plusieurs billets (même paiement Stripe) = UNE facture avec une ligne par billet.
import { renderToBuffer, Document, Page, Text, View, Image, StyleSheet } from '@react-pdf/renderer'
import React from 'react'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { LOGO_GERMAIN_FONCE, LOGO_GERMAIN_FONCE_RATIO } from '@/lib/logoFacture'

const supabaseAdmin = createAdminClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export type TypeFacture = 'billet' | 'banquet'

export type ResultatFacture =
  | { pdf: Buffer; numeroFacture: string; nomFichier: string }
  | { erreur: string; statut: number }

// Émetteur
const EMETTEUR = {
  nom: 'Entreprise Accès Lybertech Inc.',
  lignes: ['St-Pierre-les-Becquets, Québec', 'Canada', 'info@acceslybertech.com'],
  tps: '143732154',
  tvq: '1023774131 TQ 0001',
}

interface LigneFacture {
  titre: string
  detail: string
  prix: number
  rembourse: boolean
}

interface DonneesFacture {
  numeroFacture: string
  dateEmission: string
  client: { noms: string; numero: string; courriel: string; telephone: string; adresse: string[] }
  lignes: LigneFacture[]
  sousTotal: number
  tps: number
  tvq: number
  frais: number
  total: number
  rembourse: number
  dateGeneration: string
}

const marine = '#1A2535'
const or = '#C9A84C'
const gris = '#666666'
const argent = (n: number) => `${n.toFixed(2).replace('.', ',')} $`
const dateLongue = (d: string) => new Date(d).toLocaleDateString('fr-CA', { timeZone: 'America/Toronto', year: 'numeric', month: 'long', day: 'numeric' })
// Helvetica (police du PDF) n'a pas les émojis ni certains symboles
const nettoyer = (t: string) => t.replace(/[^\u0000-ɏ–—’«» ]/g, '').trim()

const styles = StyleSheet.create({
  page: { padding: 44, fontFamily: 'Helvetica', fontSize: 10, color: marine },
  ligneHaut: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  membre: { color: or, fontSize: 8, marginTop: 3, marginLeft: 4, letterSpacing: 0.4 },
  numero: { fontSize: 18, fontFamily: 'Helvetica-Bold', textAlign: 'right' },
  petitGris: { color: gris, fontSize: 9, textAlign: 'right', marginTop: 3 },
  badge: { alignSelf: 'flex-end', marginTop: 7, paddingHorizontal: 10, paddingVertical: 3, borderRadius: 3 },
  badgeTexte: { color: 'white', fontFamily: 'Helvetica-Bold', fontSize: 9, letterSpacing: 0.8 },
  bloc: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 20, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: '#E0E0E0' },
  etiquette: { color: '#999999', fontSize: 7.5, letterSpacing: 0.8, marginBottom: 3 },
  gras: { fontFamily: 'Helvetica-Bold' },
  texte: {},
  ligneTexte: { marginBottom: 2.5 },
  entete: { flexDirection: 'row', backgroundColor: '#E8F0FB', paddingVertical: 7, paddingHorizontal: 8, marginTop: 18 },
  rangee: { flexDirection: 'row', paddingVertical: 9, paddingHorizontal: 8, borderBottomWidth: 1, borderBottomColor: '#E0E0E0' },
  colArticle: { flex: 1 },
  colQte: { width: 55, textAlign: 'center' },
  colPrix: { width: 70, textAlign: 'right' },
  colTotal: { width: 70, textAlign: 'right' },
  totaux: { alignSelf: 'flex-end', width: 240, marginTop: 14 },
  ligneTotal: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 3.5 },
  grandTotal: { flexDirection: 'row', justifyContent: 'space-between', paddingTop: 8, marginTop: 4, borderTopWidth: 1.5, borderTopColor: or },
  pied: { position: 'absolute', bottom: 34, left: 44, right: 44, textAlign: 'center', color: '#999999', fontSize: 8, borderTopWidth: 1, borderTopColor: '#E0E0E0', paddingTop: 8 },
})

function FacturePDF({ data }: { data: DonneesFacture }) {
  const e = React.createElement
  const toutRembourse = data.rembourse > 0 && data.rembourse >= data.total - 0.005
  const badge = toutRembourse
    ? { texte: 'REMBOURSÉE', couleur: '#E57373' }
    : data.rembourse > 0
      ? { texte: 'PARTIELLEMENT REMBOURSÉE', couleur: '#E57373' }
      : { texte: 'PAYÉE', couleur: '#4CAF7D' }
  const net = data.total - data.rembourse

  return e(Document, null,
    e(Page, { size: 'LETTER', style: styles.page },
      // En-tête : logo + numéro
      e(View, { style: styles.ligneHaut },
        e(View, null,
          e(Image, { src: LOGO_GERMAIN_FONCE, style: { height: 48, width: 48 * LOGO_GERMAIN_FONCE_RATIO } }),
          e(Text, { style: styles.membre }, 'Membre du Yager Group'),
        ),
        e(View, null,
          e(Text, { style: styles.numero }, `Facture n° ${data.numeroFacture}`),
          e(Text, { style: styles.petitGris }, `Date d'émission : ${data.dateEmission}`),
          e(View, { style: [styles.badge, { backgroundColor: badge.couleur }] }, e(Text, { style: styles.badgeTexte }, badge.texte)),
        ),
      ),
      // Émetteur + numéros de taxes
      e(View, { style: styles.bloc },
        e(View, { style: styles.texte },
          e(Text, { style: [styles.gras, styles.ligneTexte] }, EMETTEUR.nom),
          ...EMETTEUR.lignes.map((l, i) => e(Text, { key: i, style: styles.ligneTexte }, l)),
        ),
        e(View, { style: [styles.texte, { alignItems: 'flex-end' }] },
          e(Text, { style: styles.etiquette }, 'NUMÉROS DE TAXES'),
          e(Text, { style: styles.ligneTexte }, `TPS : ${EMETTEUR.tps}`),
          e(Text, { style: styles.ligneTexte }, `TVQ : ${EMETTEUR.tvq}`),
        ),
      ),
      // Client
      e(View, { style: [styles.bloc, { marginTop: 12 }] },
        e(View, { style: styles.texte },
          e(Text, { style: styles.etiquette }, 'FACTURÉ À'),
          e(Text, { style: [styles.gras, styles.ligneTexte] }, nettoyer(data.client.noms)),
          data.client.numero ? e(Text, { style: styles.ligneTexte }, `# PCI : ${data.client.numero}`) : null,
          ...data.client.adresse.map((l, i) => e(Text, { key: `a${i}`, style: styles.ligneTexte }, nettoyer(l))),
          e(Text, { style: styles.ligneTexte }, [data.client.courriel, data.client.telephone].filter(Boolean).join('  ·  ')),
        ),
      ),
      // Lignes
      e(View, { style: styles.entete },
        e(Text, { style: [styles.colArticle, styles.gras] }, 'Article'),
        e(Text, { style: [styles.colQte, styles.gras] }, 'Quantité'),
        e(Text, { style: [styles.colPrix, styles.gras] }, 'Prix'),
        e(Text, { style: [styles.colTotal, styles.gras] }, 'Total'),
      ),
      ...data.lignes.map((l, i) => e(View, { key: i, style: styles.rangee },
        e(View, { style: styles.colArticle },
          e(Text, { style: styles.gras }, nettoyer(l.titre)),
          e(Text, { style: { color: gris, marginTop: 2 } }, nettoyer(l.detail)),
          l.rembourse ? e(Text, { style: { color: '#E57373', marginTop: 2 } }, 'Remboursé') : null,
        ),
        e(Text, { style: styles.colQte }, '1'),
        e(Text, { style: styles.colPrix }, argent(l.prix)),
        e(Text, { style: styles.colTotal }, argent(l.prix)),
      )),
      // Totaux (jamais de solde à payer : tout est payé à l'achat)
      e(View, { style: styles.totaux },
        e(View, { style: styles.ligneTotal }, e(Text, { style: styles.gras }, 'Sous-total'), e(Text, { style: styles.gras }, argent(data.sousTotal))),
        e(View, { style: styles.ligneTotal }, e(Text, { style: { color: gris } }, 'TPS (5 %)'), e(Text, null, argent(data.tps))),
        e(View, { style: styles.ligneTotal }, e(Text, { style: { color: gris } }, 'TVQ (9,975 %)'), e(Text, null, argent(data.tvq))),
        e(View, { style: styles.ligneTotal }, e(Text, { style: { color: gris } }, 'Frais de service'), e(Text, null, argent(data.frais))),
        e(View, { style: styles.grandTotal },
          e(Text, { style: [styles.gras, { fontSize: 12 }] }, 'Total payé'),
          e(Text, { style: [styles.gras, { fontSize: 13 }] }, argent(data.total)),
        ),
        data.rembourse > 0 ? e(View, { style: styles.ligneTotal },
          e(Text, { style: { color: '#E57373' } }, 'Montant remboursé'), e(Text, { style: { color: '#E57373' } }, `- ${argent(data.rembourse)}`)) : null,
        data.rembourse > 0 ? e(View, { style: styles.ligneTotal },
          e(Text, { style: styles.gras }, 'Net payé'), e(Text, { style: styles.gras }, argent(net))) : null,
        e(Text, { style: { color: '#4CAF7D', fontSize: 8.5, textAlign: 'right', marginTop: 4 } }, `Payé par carte le ${data.dateEmission}`),
      ),
      e(Text, { style: styles.pied, fixed: true }, `Merci!  ·  ${EMETTEUR.nom}  ·  info@acceslybertech.com  ·  Facture générée le ${data.dateGeneration}`),
    ),
  )
}

const COLONNES_CLIENT = 'prenom_1, nom_1, prenom_2, nom_2, courriel, numero_amway, telephone, adresse, ville, province, code_postal, pays'

function infosClient(c: any) {
  const noms = [[c?.prenom_1, c?.nom_1], [c?.prenom_2, c?.nom_2]]
    .map(n => n.filter(Boolean).join(' ')).filter(Boolean).join(' & ')
  const villeLigne = [c?.ville, c?.province].filter(Boolean).join(', ') + (c?.code_postal ? `  ${c.code_postal}` : '')
  return {
    noms: noms || 'Client',
    numero: c?.numero_amway ?? '',
    courriel: c?.courriel ?? '',
    telephone: c?.telephone ?? '',
    adresse: [c?.adresse, villeLigne.trim(), c?.pays].filter(Boolean) as string[],
  }
}

const somme = (lignes: any[], champ: string) => lignes.reduce((s, l) => s + Number(l[champ] ?? 0), 0)

// Fabrique le PDF d'une facture. compteId : le propriétaire de l'achat (personne d'autre ne peut l'obtenir)
export async function genererFacture(type: TypeFacture, id: string, compteId: string): Promise<ResultatFacture> {
  let data: DonneesFacture

  if (type === 'billet') {
    const { data: billet } = await supabaseAdmin
      .from('billets')
      .select(`*, comptes!billets_compte_id_fkey(${COLONNES_CLIENT})`)
      .eq('id', id)
      .eq('compte_id', compteId)
      .single()

    if (!billet) return { erreur: 'Billet introuvable', statut: 404 }
    if (billet.est_sans_frais || billet.prix_paye === 0) return { erreur: 'Pas de facture pour ce billet (sans frais)', statut: 400 }

    // Tous les billets payés du même achat (même paiement Stripe) → une seule facture
    const { data: achat } = billet.stripe_payment_intent_id
      ? await supabaseAdmin
          .from('billets')
          .select('*, evenements(nom, date_debut)')
          .eq('stripe_payment_intent_id', billet.stripe_payment_intent_id)
          .eq('compte_id', compteId)
          .eq('est_sans_frais', false)
          .gt('prix_paye', 0)
          .order('created_at', { ascending: true })
          .order('id', { ascending: true })
      : await supabaseAdmin.from('billets').select('*, evenements(nom, date_debut)').eq('id', billet.id)
    const billets = achat && achat.length > 0 ? achat : [billet]
    const premier = billets[0]

    data = {
      numeroFacture: `BIL-${premier.id.slice(0, 8).toUpperCase()}`,
      dateEmission: dateLongue(premier.created_at),
      client: infosClient(billet.comptes),
      lignes: billets.map((b: any) => ({
        titre: `Billet — ${b.evenements?.nom ?? 'Événement'}`,
        detail: `${b.evenements?.date_debut ? dateLongue(b.evenements.date_debut) + '  ·  ' : ''}Billet pour : ${b.nom_pci}${b.mode_participation === 'virtuel' ? '  ·  Virtuel' : ''}`,
        prix: Number(b.prix_paye ?? 0),
        rembourse: b.statut === 'rembourse',
      })),
      sousTotal: somme(billets, 'prix_paye'),
      tps: somme(billets, 'tps'),
      tvq: somme(billets, 'tvq'),
      frais: somme(billets, 'frais_stripe'),
      total: billets.reduce((s: number, b: any) => s + Number(b.prix_total ?? b.prix_paye ?? 0), 0),
      rembourse: billets.filter((b: any) => b.statut === 'rembourse').reduce((s: number, b: any) => s + Number(b.prix_total ?? b.prix_paye ?? 0), 0),
      dateGeneration: dateLongue(new Date().toISOString()),
    }
  } else {
    const { data: banquet } = await supabaseAdmin
      .from('billets_banquets')
      .select(`*, banquets(nom, evenement:evenements(nom, date_debut)), comptes!billets_banquets_compte_id_fkey(${COLONNES_CLIENT})`)
      .eq('id', id)
      .eq('compte_id', compteId)
      .single()

    if (!banquet) return { erreur: 'Banquet introuvable', statut: 404 }
    const total = Number(banquet.prix_total ?? banquet.prix_paye ?? 0)
    const dateEv = banquet.banquets?.evenement?.date_debut

    data = {
      numeroFacture: `BAN-${banquet.id.slice(0, 8).toUpperCase()}`,
      dateEmission: dateLongue(banquet.cree_at),
      client: infosClient(banquet.comptes),
      lignes: [{
        titre: `${banquet.banquets?.nom ?? 'Banquet'} — ${banquet.banquets?.evenement?.nom ?? ''}`,
        detail: `${dateEv ? dateLongue(dateEv) + '  ·  ' : ''}Banquet pour : ${banquet.nom_pci}`,
        prix: Number(banquet.prix_paye ?? 0),
        rembourse: banquet.statut === 'rembourse',
      }],
      sousTotal: Number(banquet.prix_paye ?? 0),
      tps: Number(banquet.tps ?? 0),
      tvq: Number(banquet.tvq ?? 0),
      frais: Number(banquet.frais_stripe ?? 0),
      total,
      rembourse: banquet.statut === 'rembourse' ? total : 0,
      dateGeneration: dateLongue(new Date().toISOString()),
    }
  }

  const pdf = await renderToBuffer(React.createElement(FacturePDF, { data }) as any)
  return { pdf, numeroFacture: data.numeroFacture, nomFichier: `facture-${data.numeroFacture}.pdf` }
}
