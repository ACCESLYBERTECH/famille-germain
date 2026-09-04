'use client'

import { useState, useMemo } from 'react'
import * as XLSX from 'xlsx'

interface Evenement {
  id: string
  nom: string
  banquet: { id: string; nom: string; prix: number }[]
}

interface Billet {
  id: string
  nom_pci: string
  est_sans_frais: boolean
  prix_paye: number
  allergies: string | null
  mode_participation: string | null
  created_at: string
  evenements: { nom: string; a_banquet: boolean } | null
  comptes: { prenom_1: string; nom_1: string; courriel: string; leader_id: string | null } | null
}

interface BanquetAchete {
  id: string
  billet_id: string
  nom_pci: string
  allergies: string | null
  prix_total: number | null
  created_at: string
}

interface Leader {
  id: string
  prenom_1: string
  nom_1: string
}

interface Props {
  evenements: Evenement[]
  billets: Billet[]
  banquetsAchetes: BanquetAchete[]
  leaders: Leader[]
}

export default function GestionBanquets({ evenements, billets, banquetsAchetes, leaders }: Props) {
  const [filtreEvenement, setFiltreEvenement] = useState('')
  const [filtreLeader, setFiltreLeader] = useState('')
  const [filtreBanquet, setFiltreBanquet] = useState<'tous' | 'avec' | 'sans'>('tous')
  const [chargementExcel, setChargementExcel] = useState(false)
  const [chargementPDF, setChargementPDF] = useState(false)

  const lignes = useMemo(() => {
    return billets.map(billet => {
      const banquetAchete = billet.est_sans_frais
        ? banquetsAchetes.find(b => b.billet_id === billet.id)
        : null
      const aBanquet = !billet.est_sans_frais || !!banquetAchete
      const allergies = billet.est_sans_frais
        ? (banquetAchete?.allergies ?? null)
        : billet.allergies
      const leaderNom = billet.comptes?.leader_id
        ? leaders.find(l => l.id === billet.comptes?.leader_id)
        : null
      return { billet, aBanquet, allergies, leaderNom, banquetAchete }
    })
  }, [billets, banquetsAchetes, leaders])

  const lignesFiltrees = useMemo(() => {
    return lignes.filter(l => {
      const matchEvenement = filtreEvenement === '' ? true : l.billet.evenements?.nom === filtreEvenement
      const matchLeader = filtreLeader === '' ? true : l.billet.comptes?.leader_id === filtreLeader
      const matchBanquet = filtreBanquet === 'tous' ? true : filtreBanquet === 'avec' ? l.aBanquet : !l.aBanquet
      return matchEvenement && matchLeader && matchBanquet
    })
  }, [lignes, filtreEvenement, filtreLeader, filtreBanquet])

  const nomsEvenements = useMemo(() => {
    const noms = new Set<string>()
    billets.forEach(b => { if (b.evenements?.nom) noms.add(b.evenements.nom) })
    return Array.from(noms).sort()
  }, [billets])

  const statsTotal = lignes.length
  const statsAvec = lignes.filter(l => l.aBanquet).length
  const statsSans = lignes.filter(l => !l.aBanquet).length

  function formaterAllergies(allergies: string | null): string {
    if (!allergies) return 'Aucune'
    try { return JSON.parse(allergies).join(', ') } catch { return allergies }
  }

  function preparerDonnees() {
    return lignesFiltrees.map(({ billet, aBanquet, allergies, leaderNom }) => ({
      'Nom PCI': billet.nom_pci,
      'Courriel': billet.comptes?.courriel ?? '',
      'Leader': leaderNom ? `${leaderNom.prenom_1} ${leaderNom.nom_1}` : 'Aucun',
      'Événement': billet.evenements?.nom ?? '',
      'Type de billet': billet.est_sans_frais ? 'Sans frais' : 'Régulier (payant)',
      'Banquet': aBanquet ? 'Avec banquet' : 'Sans banquet',
      'Mode participation': billet.mode_participation === 'virtuel' ? 'Virtuel' : 'Sur place',
      'Allergies': formaterAllergies(allergies),
      "Date d'achat": new Date(billet.created_at).toLocaleDateString('fr-CA'),
    }))
  }

  async function exporterExcel() {
    setChargementExcel(true)
    try {
      const donnees = preparerDonnees()
      const wb = XLSX.utils.book_new()

      // Feuille principale
      const ws = XLSX.utils.json_to_sheet(donnees)

      // Largeurs de colonnes
      ws['!cols'] = [
        { wch: 25 }, // Nom PCI
        { wch: 30 }, // Courriel
        { wch: 22 }, // Leader
        { wch: 30 }, // Événement
        { wch: 18 }, // Type
        { wch: 15 }, // Banquet
        { wch: 15 }, // Mode
        { wch: 40 }, // Allergies
        { wch: 14 }, // Date
      ]

      XLSX.utils.book_append_sheet(wb, ws, 'Rapport banquets')

      // Feuille résumé
      const nomEv = filtreEvenement || 'Tous les événements'
      const nomLeader = filtreLeader ? leaders.find(l => l.id === filtreLeader)?.prenom_1 + ' ' + leaders.find(l => l.id === filtreLeader)?.nom_1 : 'Tous les leaders'

      const resume = [
        ['RAPPORT BANQUETS — ACCESLYBERTECH', ''],
        ['Famille Germain – Yager Group', ''],
        ['', ''],
        ['Filtres appliqués', ''],
        ['Événement', nomEv],
        ['Leader', nomLeader],
        ['', ''],
        ['Statistiques', ''],
        ['Total billets', statsTotal],
        ['Avec banquet', statsAvec],
        ['Sans banquet', statsSans],
        ['', ''],
        ['Généré le', new Date().toLocaleDateString('fr-CA', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })],
      ]

      const wsResume = XLSX.utils.aoa_to_sheet(resume)
      wsResume['!cols'] = [{ wch: 25 }, { wch: 35 }]
      XLSX.utils.book_append_sheet(wb, wsResume, 'Résumé')

      // Feuille allergies seulement
      const avecAllergies = lignesFiltrees
        .filter(l => l.aBanquet && l.allergies)
        .map(({ billet, allergies, leaderNom }) => ({
          'Nom PCI': billet.nom_pci,
          'Leader': leaderNom ? `${leaderNom.prenom_1} ${leaderNom.nom_1}` : 'Aucun',
          'Allergies': formaterAllergies(allergies),
          'Mode': billet.mode_participation === 'virtuel' ? 'Virtuel' : 'Sur place',
        }))

      if (avecAllergies.length > 0) {
        const wsAllergies = XLSX.utils.json_to_sheet(avecAllergies)
        wsAllergies['!cols'] = [{ wch: 25 }, { wch: 22 }, { wch: 45 }, { wch: 12 }]
        XLSX.utils.book_append_sheet(wb, wsAllergies, 'Allergies seulement')
      }

      const nomFichier = `rapport-banquets${filtreEvenement ? '-' + filtreEvenement.replace(/\s+/g, '-') : ''}.xlsx`
      XLSX.writeFile(wb, nomFichier)
    } finally {
      setChargementExcel(false)
    }
  }

  async function exporterPDF() {
    setChargementPDF(true)
    try {
      const params = new URLSearchParams()
      if (filtreEvenement) {
        const ev = evenements.find(e => e.nom === filtreEvenement)
        if (ev) params.set('evenement_id', ev.id)
      }
      if (filtreLeader) params.set('leader_id', filtreLeader)
      if (filtreBanquet !== 'tous') params.set('filtre_banquet', filtreBanquet)

      const res = await fetch(`/api/admin/rapport-banquets-pdf?${params.toString()}`)
      if (!res.ok) { alert('Erreur lors de la génération du PDF'); return }

      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const lien = document.createElement('a')
      lien.href = url
      lien.download = `rapport-banquets${filtreEvenement ? '-' + filtreEvenement.replace(/\s+/g, '-') : ''}.pdf`
      lien.click()
      URL.revokeObjectURL(url)
    } finally {
      setChargementPDF(false)
    }
  }

  return (
    <div>
      {/* Stats rapides — cliquables */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-white rounded-xl p-4 shadow-sm text-center cursor-pointer transition-all" onClick={() => setFiltreBanquet('tous')} style={{ border: filtreBanquet === 'tous' ? '2px solid #C9A84C' : '2px solid transparent' }}>
          <p className="text-2xl font-bold" style={{ color: '#1A2535' }}>{statsTotal}</p>
          <p className="text-sm mt-1" style={{ color: '#666666' }}>Total billets</p>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm text-center cursor-pointer transition-all" onClick={() => setFiltreBanquet('avec')} style={{ border: filtreBanquet === 'avec' ? '2px solid #4CAF7D' : '2px solid transparent' }}>
          <p className="text-2xl font-bold" style={{ color: '#4CAF7D' }}>{statsAvec}</p>
          <p className="text-sm mt-1" style={{ color: '#666666' }}>🍽️ Avec banquet</p>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm text-center cursor-pointer transition-all" onClick={() => setFiltreBanquet('sans')} style={{ border: filtreBanquet === 'sans' ? '2px solid #E57373' : '2px solid transparent' }}>
          <p className="text-2xl font-bold" style={{ color: '#E57373' }}>{statsSans}</p>
          <p className="text-sm mt-1" style={{ color: '#666666' }}>Sans banquet</p>
        </div>
      </div>

      {/* Filtres + Boutons export */}
      <div className="bg-white rounded-t-2xl shadow px-4 pt-4 pb-3 border-b" style={{ borderColor: '#E0E0E0' }}>
        <div className="flex flex-wrap gap-3 items-center mb-3">
          <select className="border rounded-lg px-3 py-2 text-sm outline-none" style={{ borderColor: '#E0E0E0' }} value={filtreEvenement} onChange={e => setFiltreEvenement(e.target.value)}>
            <option value="">Tous les événements</option>
            {nomsEvenements.map(ev => <option key={ev} value={ev}>{ev}</option>)}
          </select>

          <select className="border rounded-lg px-3 py-2 text-sm outline-none" style={{ borderColor: '#E0E0E0' }} value={filtreLeader} onChange={e => setFiltreLeader(e.target.value)}>
            <option value="">Tous les leaders</option>
            {leaders.map(l => <option key={l.id} value={l.id}>{l.prenom_1} {l.nom_1}</option>)}
          </select>

          {(filtreEvenement || filtreLeader || filtreBanquet !== 'tous') && (
            <button onClick={() => { setFiltreEvenement(''); setFiltreLeader(''); setFiltreBanquet('tous') }} className="px-3 py-1.5 rounded-lg text-xs font-medium" style={{ backgroundColor: '#F5F3EE', color: '#666666' }}>
              ✕ Effacer filtres
            </button>
          )}

          <div className="ml-auto flex items-center gap-2">
            <span className="text-xs" style={{ color: '#999999' }}>{lignesFiltrees.length} résultat{lignesFiltrees.length !== 1 ? 's' : ''}</span>
            <button onClick={exporterExcel} disabled={chargementExcel} className="px-4 py-2 rounded-lg text-sm font-medium text-white disabled:opacity-50" style={{ backgroundColor: '#4CAF7D' }}>
              {chargementExcel ? '⏳ Excel...' : '📊 Excel'}
            </button>
            <button onClick={exporterPDF} disabled={chargementPDF} className="px-4 py-2 rounded-lg text-sm font-medium text-white disabled:opacity-50" style={{ backgroundColor: '#E57373' }}>
              {chargementPDF ? '⏳ PDF...' : '📄 PDF'}
            </button>
          </div>
        </div>
      </div>

      {/* Liste */}
      <div className="bg-white rounded-b-2xl shadow">
        {lignesFiltrees.length === 0 ? (
          <div className="p-8 text-center" style={{ color: '#666666' }}>Aucun résultat</div>
        ) : (
          lignesFiltrees.map(({ billet, aBanquet, allergies, leaderNom }) => (
            <div key={billet.id} className="p-4 border-b flex items-start justify-between gap-4" style={{ borderColor: '#E0E0E0' }}>
              <div className="flex-1">
                <div className="flex items-center gap-2 flex-wrap mb-1">
                  <p className="font-semibold" style={{ color: '#1A2535' }}>{billet.nom_pci}</p>
                  <span className="px-2 py-0.5 rounded-full text-xs font-medium" style={{ backgroundColor: billet.est_sans_frais ? '#E8F5E9' : '#E3F2FD', color: billet.est_sans_frais ? '#4CAF7D' : '#2E86C1' }}>
                    {billet.est_sans_frais ? 'Sans frais' : 'Régulier'}
                  </span>
                  <span className="px-2 py-0.5 rounded-full text-xs font-medium" style={{ backgroundColor: aBanquet ? '#E8F5E9' : '#FFF3E0', color: aBanquet ? '#4CAF7D' : '#E57373' }}>
                    {aBanquet ? '🍽️ Avec banquet' : '❌ Sans banquet'}
                  </span>
                  <span className="px-2 py-0.5 rounded-full text-xs font-medium" style={{ backgroundColor: billet.mode_participation === 'virtuel' ? '#E3F2FD' : '#F5F3EE', color: billet.mode_participation === 'virtuel' ? '#2E86C1' : '#666666' }}>
                    {billet.mode_participation === 'virtuel' ? '💻 Virtuel' : '🏛️ Sur place'}
                  </span>
                </div>
                <p className="text-sm" style={{ color: '#666666' }}>{billet.evenements?.nom}</p>
                <div className="flex gap-3 mt-0.5 flex-wrap">
                  <p className="text-xs" style={{ color: '#999999' }}>{billet.comptes?.courriel}</p>
                  {leaderNom && <p className="text-xs" style={{ color: '#2E86C1' }}>Leader : {leaderNom.prenom_1} {leaderNom.nom_1}</p>}
                </div>
                {aBanquet && (
                  <p className="text-xs mt-1" style={{ color: allergies ? '#E57373' : '#999999' }}>
                    🍽️ Allergies : <span className="font-medium">{formaterAllergies(allergies)}</span>
                  </p>
                )}
              </div>
              <p className="text-xs flex-shrink-0" style={{ color: '#999999' }}>
                {new Date(billet.created_at).toLocaleDateString('fr-CA')}
              </p>
            </div>
          ))
        )}
      </div>
    </div>
  )
}