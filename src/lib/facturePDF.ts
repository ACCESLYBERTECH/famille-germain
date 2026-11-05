// Factures PDF (billets et banquets) — fabriquées sur demande à partir des achats enregistrés.
// Aucun fichier n'est stocké : les montants restent dans la base de données pour toujours.
import { renderToBuffer, Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer'
import React from 'react'
import { createClient as createAdminClient } from '@supabase/supabase-js'

const supabaseAdmin = createAdminClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export type TypeFacture = 'billet' | 'banquet'

export type ResultatFacture =
  | { pdf: Buffer; numeroFacture: string; nomFichier: string }
  | { erreur: string; statut: number }

const styles = StyleSheet.create({
  page: { padding: 40, fontFamily: 'Helvetica', backgroundColor: '#FFFFFF' },
  header: { marginBottom: 30, paddingBottom: 20, borderBottomWidth: 2, borderBottomColor: '#C9A84C' },
  titre: { fontSize: 22, fontFamily: 'Helvetica-Bold', color: '#1A2535', marginBottom: 4 },
  sousTitre: { fontSize: 11, color: '#C9A84C', letterSpacing: 1 },
  section: { marginBottom: 20 },
  sectionTitre: { fontSize: 10, fontFamily: 'Helvetica-Bold', color: '#C9A84C', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 },
  ligne: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 5 },
  label: { fontSize: 10, color: '#666666' },
  valeur: { fontSize: 10, color: '#1A2535' },
  separateur: { borderTopWidth: 1, borderTopColor: '#E0E0E0', marginVertical: 15 },
  totalLigne: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 8 },
  totalLabel: { fontSize: 12, fontFamily: 'Helvetica-Bold', color: '#1A2535' },
  totalValeur: { fontSize: 12, fontFamily: 'Helvetica-Bold', color: '#1A2535' },
  badgePaye: { backgroundColor: '#4CAF7D', paddingHorizontal: 12, paddingVertical: 4, borderRadius: 4, alignSelf: 'flex-start', marginTop: 12 },
  badgeRembourse: { backgroundColor: '#E57373', paddingHorizontal: 12, paddingVertical: 4, borderRadius: 4, alignSelf: 'flex-start', marginTop: 12 },
  badgePayeText: { color: '#FFFFFF', fontSize: 11, fontFamily: 'Helvetica-Bold' },
  footer: { position: 'absolute', bottom: 30, left: 40, right: 40, textAlign: 'center', fontSize: 8, color: '#999999' },
  numFacture: { fontSize: 10, color: '#999999', marginTop: 4 },
})

function FacturePDF({ data }: { data: any }) {
  return React.createElement(Document, null,
    React.createElement(Page, { size: 'A4', style: styles.page },

      // En-tête
      React.createElement(View, { style: styles.header },
        React.createElement(Text, { style: styles.titre }, 'ACCESLYBERTECH'),
        React.createElement(Text, { style: styles.sousTitre }, 'Yager Group – Famille Germain'),
        React.createElement(Text, { style: styles.numFacture }, `Facture #${data.numeroFacture}`)
      ),

      // Info PCI
      React.createElement(View, { style: styles.section },
        React.createElement(Text, { style: styles.sectionTitre }, 'Facturé à'),
        React.createElement(View, { style: styles.ligne },
          React.createElement(Text, { style: styles.label }, 'Nom'),
          React.createElement(Text, { style: styles.valeur }, data.nomPCI),
        ),
        React.createElement(View, { style: styles.ligne },
          React.createElement(Text, { style: styles.label }, 'Courriel'),
          React.createElement(Text, { style: styles.valeur }, data.courriel),
        ),
        React.createElement(View, { style: styles.ligne },
          React.createElement(Text, { style: styles.label }, 'Numéro Amway'),
          React.createElement(Text, { style: styles.valeur }, `#${data.numeroAmway}`),
        ),
      ),

      React.createElement(View, { style: styles.separateur }),

      // Détail achat
      React.createElement(View, { style: styles.section },
        React.createElement(Text, { style: styles.sectionTitre }, 'Détail de l\'achat'),
        React.createElement(View, { style: styles.ligne },
          React.createElement(Text, { style: styles.label }, 'Événement'),
          React.createElement(Text, { style: styles.valeur }, data.evenementNom),
        ),
        React.createElement(View, { style: styles.ligne },
          React.createElement(Text, { style: styles.label }, 'Billet pour'),
          React.createElement(Text, { style: styles.valeur }, data.nomPCI),
        ),
        React.createElement(View, { style: styles.ligne },
          React.createElement(Text, { style: styles.label }, 'Date d\'achat'),
          React.createElement(Text, { style: styles.valeur }, data.dateAchat),
        ),
      ),

      React.createElement(View, { style: styles.separateur }),

      // Détail financier
      React.createElement(View, { style: styles.section },
        React.createElement(Text, { style: styles.sectionTitre }, 'Détail du paiement'),
        React.createElement(View, { style: styles.ligne },
          React.createElement(Text, { style: styles.label }, 'Sous-total'),
          React.createElement(Text, { style: styles.valeur }, `${data.sousTotal} $`),
        ),
        React.createElement(View, { style: styles.ligne },
          React.createElement(Text, { style: styles.label }, 'TPS (5%)'),
          React.createElement(Text, { style: styles.valeur }, `${data.tps} $`),
        ),
        React.createElement(View, { style: styles.ligne },
          React.createElement(Text, { style: styles.label }, 'TVQ (9.975%)'),
          React.createElement(Text, { style: styles.valeur }, `${data.tvq} $`),
        ),
        React.createElement(View, { style: styles.ligne },
          React.createElement(Text, { style: styles.label }, 'Frais de traitement'),
          React.createElement(Text, { style: styles.valeur }, `${data.fraisStripe} $`),
        ),
        React.createElement(View, { style: styles.totalLigne },
          React.createElement(Text, { style: styles.totalLabel }, 'Total payé'),
          React.createElement(Text, { style: styles.totalValeur }, `${data.prixTotal} $`),
        ),
        React.createElement(View, { style: data.rembourse ? styles.badgeRembourse : styles.badgePaye },
          React.createElement(Text, { style: styles.badgePayeText }, data.rembourse ? 'REMBOURSÉ' : 'PAYÉ'),
        ),
      ),

      // Footer
      React.createElement(Text, { style: styles.footer },
        `ACCESLYBERTECH INC. — acceslybertech.com — Facture générée le ${data.dateGeneration}`
      ),
    )
  )
}

// Fabrique le PDF d'une facture. compteId : le propriétaire de l'achat (personne d'autre ne peut l'obtenir)
export async function genererFacture(type: TypeFacture, id: string, compteId: string): Promise<ResultatFacture> {
    let data: any = null

    if (type === 'billet') {
      const { data: billet } = await supabaseAdmin
        .from('billets')
        .select('*, evenements(nom), comptes!billets_compte_id_fkey(prenom_1, nom_1, courriel, numero_amway)')
        .eq('id', id)
        .eq('compte_id', compteId)
        .single()

      if (!billet) return { erreur: 'Billet introuvable', statut: 404 }
      if (billet.est_sans_frais || billet.prix_paye === 0) return { erreur: 'Pas de facture pour ce billet (sans frais)', statut: 400 }

      const numeroFacture = `BIL-${billet.id.slice(0, 8).toUpperCase()}`
      data = {
        numeroFacture,
        nomPCI: billet.nom_pci,
        courriel: billet.comptes?.courriel ?? '',
        numeroAmway: billet.comptes?.numero_amway ?? '',
        evenementNom: billet.evenements?.nom ?? '',
        dateAchat: new Date(billet.created_at).toLocaleDateString('fr-CA', { year: 'numeric', month: 'long', day: 'numeric' }),
        sousTotal: (billet.prix_paye ?? 0).toFixed(2),
        tps: (billet.tps ?? 0).toFixed(2),
        tvq: (billet.tvq ?? 0).toFixed(2),
        fraisStripe: (billet.frais_stripe ?? 0).toFixed(2),
        prixTotal: (billet.prix_total ?? billet.prix_paye ?? 0).toFixed(2),
        dateGeneration: new Date().toLocaleDateString('fr-CA'),
        rembourse: billet.statut === 'rembourse',
      }
    } else {
      const { data: banquet } = await supabaseAdmin
        .from('billets_banquets')
        .select('*, banquets(nom, evenement:evenements(nom)), comptes!billets_banquets_compte_id_fkey(prenom_1, nom_1, courriel, numero_amway)')
        .eq('id', id)
        .eq('compte_id', compteId)
        .single()

      if (!banquet) return { erreur: 'Banquet introuvable', statut: 404 }

      const numeroFacture = `BAN-${banquet.id.slice(0, 8).toUpperCase()}`
      data = {
        numeroFacture,
        nomPCI: banquet.nom_pci,
        courriel: banquet.comptes?.courriel ?? '',
        numeroAmway: banquet.comptes?.numero_amway ?? '',
        evenementNom: `${banquet.banquets?.nom ?? 'Banquet'} — ${banquet.banquets?.evenement?.nom ?? ''}`,
        dateAchat: new Date(banquet.cree_at).toLocaleDateString('fr-CA', { year: 'numeric', month: 'long', day: 'numeric' }),
        sousTotal: (banquet.prix_paye ?? 0).toFixed(2),
        tps: (banquet.tps ?? 0).toFixed(2),
        tvq: (banquet.tvq ?? 0).toFixed(2),
        fraisStripe: (banquet.frais_stripe ?? 0).toFixed(2),
        prixTotal: (banquet.prix_total ?? banquet.prix_paye ?? 0).toFixed(2),
        dateGeneration: new Date().toLocaleDateString('fr-CA'),
        rembourse: banquet.statut === 'rembourse',
      }
    }


    const pdf = await renderToBuffer(React.createElement(FacturePDF, { data }) as any)
    return { pdf, numeroFacture: data.numeroFacture, nomFichier: `facture-${data.numeroFacture}.pdf` }
}
