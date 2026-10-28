import React from 'react'
import { Document, Page, Text, View, StyleSheet, renderToBuffer } from '@react-pdf/renderer'
import type { RapportBanquets } from '@/lib/rapportBanquets'

// Rapport banquets en PDF — format Lettre paysage, SANS les courriels des PCI
// (version destinée à être envoyée par courriel)

const s = StyleSheet.create({
  page: { paddingVertical: 28, paddingHorizontal: 30, paddingBottom: 40, fontFamily: 'Helvetica', fontSize: 9, color: '#1A2535' },
  entete: { backgroundColor: '#1A2535', borderRadius: 6, padding: 14, marginBottom: 12 },
  titre: { color: '#FFFFFF', fontSize: 16, fontFamily: 'Helvetica-Bold' },
  sousTitre: { color: '#FFFFFF', fontSize: 9, marginTop: 3, opacity: 0.85 },
  date: { color: '#C9A84C', fontSize: 8, marginTop: 5 },
  stats: { flexDirection: 'row', marginBottom: 12 },
  stat: { flex: 1, backgroundColor: '#F5F3EE', borderRadius: 6, padding: 8, marginRight: 8, alignItems: 'center' },
  statDernier: { flex: 1, backgroundColor: '#F5F3EE', borderRadius: 6, padding: 8, alignItems: 'center' },
  statNum: { fontSize: 16, fontFamily: 'Helvetica-Bold' },
  statLabel: { fontSize: 7, color: '#666666', marginTop: 2 },
  ligneEntete: { flexDirection: 'row', backgroundColor: '#1A2535', color: '#FFFFFF', fontFamily: 'Helvetica-Bold', fontSize: 8 },
  ligne: { flexDirection: 'row', borderBottomWidth: 0.5, borderBottomColor: '#E0E0E0' },
  ligneAlt: { flexDirection: 'row', borderBottomWidth: 0.5, borderBottomColor: '#E0E0E0', backgroundColor: '#FAFAFA' },
  cell: { paddingVertical: 5, paddingHorizontal: 6 },
  colNom: { width: '24%' },
  colLeader: { width: '18%' },
  colType: { width: '10%' },
  colBanquet: { width: '9%' },
  colMode: { width: '9%' },
  colAllergies: { width: '30%' },
  pied: { position: 'absolute', bottom: 18, left: 30, right: 30, flexDirection: 'row', justifyContent: 'space-between', fontSize: 7, color: '#999999' },
})

// La police Helvetica du PDF ne connaît pas les émojis (🌾 🥛 🥜...) : on les retire.
// On garde les lettres accentuées et la ponctuation française (Œ, œ, –, ’, «, », etc.)
const CARACTERES_PERMIS = /[\u0020-\u007E\u00A0-\u00FF\u0152\u0153\u0160\u0161\u0178\u017D\u017E\u0192\u02C6\u02DC\u2013\u2014\u2018-\u201A\u201C-\u201E\u2020-\u2022\u2026\u2030\u2039\u203A\u20AC\u2122]/
function nettoyer(texte: string): string {
  return Array.from(texte ?? '').filter(c => CARACTERES_PERMIS.test(c)).join('')
    .replace(/\s+/g, ' ')
    .replace(/\s+,/g, ',')
    .trim()
}

function cellule(style: any, texte: string, extra: any = {}) {
  return React.createElement(View, { style: [s.cell, style] }, React.createElement(Text, extra, nettoyer(texte)))
}

function RapportPDF({ r }: { r: RapportBanquets }) {
  const stat = (num: number, label: string, couleur: string, dernier = false) =>
    React.createElement(View, { style: dernier ? s.statDernier : s.stat },
      React.createElement(Text, { style: [s.statNum, { color: couleur }] }, String(num)),
      React.createElement(Text, { style: s.statLabel }, label))

  return React.createElement(Document, { title: 'Rapport banquets' },
    React.createElement(Page, { size: 'LETTER', orientation: 'landscape', style: s.page },
      React.createElement(View, { style: s.entete },
        React.createElement(Text, { style: s.titre }, 'Rapport Banquets'),
        React.createElement(Text, { style: s.sousTitre }, nettoyer(`Famille Germain – Yager Group${r.sousTitre ? ' · ' + r.sousTitre : ''}`)),
        React.createElement(Text, { style: s.date }, `Généré le ${r.dateGeneration}`)),

      React.createElement(View, { style: s.stats },
        stat(r.lignes.length, 'Total billets', '#1A2535'),
        stat(r.totalAvec, 'Avec banquet', '#4CAF7D'),
        stat(r.totalSans, 'Sans banquet', '#E57373'),
        stat(r.totalAllergies, 'Avec allergies', '#C9A84C', true)),

      // Titres de colonnes répétés sur chaque page
      React.createElement(View, { style: s.ligneEntete, fixed: true },
        cellule(s.colNom, 'Nom PCI'),
        cellule(s.colLeader, 'Leader'),
        cellule(s.colType, 'Type'),
        cellule(s.colBanquet, 'Banquet'),
        cellule(s.colMode, 'Mode'),
        cellule(s.colAllergies, 'Allergies')),

      ...r.lignes.map((l, i) =>
        React.createElement(View, { key: i, style: i % 2 ? s.ligneAlt : s.ligne, wrap: false },
          cellule(s.colNom, l.nom, { style: { fontFamily: 'Helvetica-Bold' } }),
          cellule(s.colLeader, l.leader || 'Aucun', { style: { color: l.leader ? '#1A2535' : '#999999' } }),
          cellule(s.colType, l.sansFrais ? 'Sans frais' : 'Régulier', { style: { color: l.sansFrais ? '#4CAF7D' : '#2E86C1' } }),
          cellule(s.colBanquet, l.aBanquet ? 'Avec' : 'Sans', { style: { color: l.aBanquet ? '#4CAF7D' : '#E57373', fontFamily: 'Helvetica-Bold' } }),
          cellule(s.colMode, l.virtuel ? 'Virtuel' : 'Sur place'),
          cellule(s.colAllergies, l.allergies, { style: { color: l.allergies !== 'Aucune' ? '#E57373' : '#999999' } }))),

      React.createElement(View, { style: s.pied, fixed: true },
        React.createElement(Text, null, 'Document confidentiel — Famille Germain – Yager Group'),
        React.createElement(Text, { render: ({ pageNumber, totalPages }: any) => `Page ${pageNumber} / ${totalPages}` })),
    ))
}

export async function genererRapportBanquetsPDF(r: RapportBanquets): Promise<Buffer> {
  return await renderToBuffer(React.createElement(RapportPDF, { r }) as any)
}
