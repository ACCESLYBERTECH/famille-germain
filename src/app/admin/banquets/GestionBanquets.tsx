'use client'

import { useState, useMemo } from 'react'

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

  // Construire la liste complète
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

      return {
        billet,
        aBanquet,
        allergies,
        leaderNom,
        banquetAchete,
      }
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

  function exporterCSV() {
    const entetes = ['Nom PCI', 'Courriel', 'Leader', 'Événement', 'Type billet', 'Banquet', 'Mode', 'Allergies', 'Date achat']

    const lignesCSV = lignesFiltrees.map(l => {
      const nom = l.billet.nom_pci
      const courriel = l.billet.comptes?.courriel ?? ''
      const leader = l.leaderNom ? `${l.leaderNom.prenom_1} ${l.leaderNom.nom_1}` : 'Aucun'
      const evenement = l.billet.evenements?.nom ?? ''
      const type = l.billet.est_sans_frais ? 'Sans frais' : 'Régulier (payant)'
      const banquet = l.aBanquet ? 'Avec banquet' : 'Sans banquet'
      const mode = l.billet.mode_participation === 'virtuel' ? 'Virtuel' : 'Sur place'
      const allergies = l.allergies
        ? JSON.parse(l.allergies).join(', ')
        : 'Aucune'
      const date = new Date(l.billet.created_at).toLocaleString('fr-CA', { dateStyle: 'short', timeStyle: 'short' })
      return [nom, courriel, leader, evenement, type, banquet, mode, allergies, date]
    })

    const contenu = [entetes, ...lignesCSV]
      .map(ligne => ligne.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
      .join('\n')

    const blob = new Blob(['\uFEFF' + contenu], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const lien = document.createElement('a')
    lien.href = url
    lien.download = `rapport-banquets${filtreEvenement ? '-' + filtreEvenement.replace(/\s+/g, '-') : ''}.csv`
    lien.click()
    URL.revokeObjectURL(url)
  }

  function formaterAllergies(allergies: string | null): string {
    if (!allergies) return '—'
    try {
      const liste = JSON.parse(allergies)
      return liste.join(', ')
    } catch {
      return allergies
    }
  }

  return (
    <div>
      {/* Stats rapides */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-white rounded-xl p-4 shadow-sm text-center cursor-pointer" onClick={() => setFiltreBanquet('tous')} style={{ border: filtreBanquet === 'tous' ? '2px solid #C9A84C' : '2px solid transparent' }}>
          <p className="text-2xl font-bold" style={{ color: '#1A2535' }}>{statsTotal}</p>
          <p className="text-sm mt-1" style={{ color: '#666666' }}>Total billets</p>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm text-center cursor-pointer" onClick={() => setFiltreBanquet('avec')} style={{ border: filtreBanquet === 'avec' ? '2px solid #4CAF7D' : '2px solid transparent' }}>
          <p className="text-2xl font-bold" style={{ color: '#4CAF7D' }}>{statsAvec}</p>
          <p className="text-sm mt-1" style={{ color: '#666666' }}>🍽️ Avec banquet</p>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm text-center cursor-pointer" onClick={() => setFiltreBanquet('sans')} style={{ border: filtreBanquet === 'sans' ? '2px solid #E57373' : '2px solid transparent' }}>
          <p className="text-2xl font-bold" style={{ color: '#E57373' }}>{statsSans}</p>
          <p className="text-sm mt-1" style={{ color: '#666666' }}>Sans banquet</p>
        </div>
      </div>

      {/* Filtres + Export */}
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

          <div className="ml-auto flex items-center gap-3">
            <span className="text-xs" style={{ color: '#999999' }}>{lignesFiltrees.length} résultat{lignesFiltrees.length !== 1 ? 's' : ''}</span>
            <button onClick={exporterCSV} className="px-4 py-2 rounded-lg text-sm font-medium text-white" style={{ backgroundColor: '#2E86C1' }}>
              ⬇️ CSV ({lignesFiltrees.length})
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

                {/* Allergies */}
                <div className="mt-2">
                  {aBanquet ? (
                    <p className="text-xs" style={{ color: allergies ? '#E57373' : '#999999' }}>
                      🍽️ Allergies : <span className="font-medium">{formaterAllergies(allergies)}</span>
                    </p>
                  ) : null}
                </div>
              </div>

              <div className="text-right flex-shrink-0">
                <p className="text-xs" style={{ color: '#999999' }}>
                  {new Date(billet.created_at).toLocaleDateString('fr-CA')}
                </p>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}