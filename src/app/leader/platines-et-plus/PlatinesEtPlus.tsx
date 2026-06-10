'use client'

import { useState, useMemo } from 'react'

interface PCI {
  id: string
  prenom_1: string
  nom_1: string
  prenom_2: string | null
  nom_2: string | null
  courriel: string
  telephone: string
  ville: string
  province: string
  numero_amway: string
  periode_sf_fin: string | null
  statut: string
  role: string
  leader_id: string | null
  groupe: string | null
}

interface Billet {
  id: string
  compte_id: string
  nom_pci: string
  statut: string
  prix_paye: number
  est_sans_frais: boolean
  created_at: string
  evenements: { nom: string; date_debut: string } | null
}

interface Leader {
  id: string
  prenom_1: string
  nom_1: string
}

interface Props {
  pcis: PCI[]
  billets: Billet[]
  leadersGroupe: Leader[]
  leaderConnecteId: string
}

type TriBillets = 'nom' | 'evenement' | 'statut' | 'date'
type TriProfils = 'nom' | 'numero_amway' | 'ville'

export default function PlatinesEtPlus({ pcis, billets, leadersGroupe, leaderConnecteId }: Props) {
  const [onglet, setOnglet] = useState<'billets' | 'profils'>('billets')
  const [recherche, setRecherche] = useState('')
  const [filtreEvenement, setFiltreEvenement] = useState('')
  const [filtreLeader, setFiltreLeader] = useState('')
  const [filtreGroupe, setFiltreGroupe] = useState('')
  const [triBillets, setTriBillets] = useState<TriBillets>('nom')
  const [triProfils, setTriProfils] = useState<TriProfils>('nom')
  const [profilOuvert, setProfilOuvert] = useState<PCI | null>(null)
  const [groupeEdit, setGroupeEdit] = useState('')
  const [sauvegroupeChargement, setSauveGroupeChargement] = useState(false)
  const [groupeSauvegarde, setGroupeSauvegarde] = useState(false)

  const evenements = useMemo(() => {
    const noms = new Map<string, string>()
    billets.forEach(b => { if (b.evenements?.nom) noms.set(b.evenements.nom, b.evenements.nom) })
    return Array.from(noms.values()).sort()
  }, [billets])

  const totauxParEvenement = useMemo(() => {
    const totaux: Record<string, number> = {}
    billets.forEach(b => {
      const nom = b.evenements?.nom ?? 'Inconnu'
      totaux[nom] = (totaux[nom] ?? 0) + 1
    })
    return totaux
  }, [billets])

  function nomLeader(leaderId: string | null): string | null {
    if (!leaderId) return null
    const l = leadersGroupe.find(l => l.id === leaderId)
    return l ? `${l.prenom_1} ${l.nom_1}` : null
  }

  const idsPCIFiltresParLeader = useMemo(() => {
    if (!filtreLeader) return null
    const idsMembres = new Set(pcis.filter(p => p.leader_id === filtreLeader).map(p => p.id))
    idsMembres.add(filtreLeader)
    return idsMembres
  }, [pcis, filtreLeader])

  const idsPCIFiltresParGroupe = useMemo(() => {
    if (!filtreGroupe || filtreGroupe.length < 1) return null
    return new Set(pcis.filter(p => p.groupe?.toLowerCase().includes(filtreGroupe.toLowerCase())).map(p => p.id))
  }, [pcis, filtreGroupe])

  const billetsFiltres = useMemo(() => {
    let result = billets.filter(b => {
      const matchRecherche = recherche.length < 2 ? true :
        b.nom_pci.toLowerCase().includes(recherche.toLowerCase()) ||
        !!pcis.find(p => p.id === b.compte_id &&
          (`${p.prenom_1} ${p.nom_1}`.toLowerCase().includes(recherche.toLowerCase()) ||
          p.numero_amway.toLowerCase().includes(recherche.toLowerCase())))
      const matchEvenement = filtreEvenement === '' ? true : b.evenements?.nom === filtreEvenement
      const matchLeader = !idsPCIFiltresParLeader ? true : idsPCIFiltresParLeader.has(b.compte_id)
      const matchGroupe = !idsPCIFiltresParGroupe ? true : idsPCIFiltresParGroupe.has(b.compte_id)
      return matchRecherche && matchEvenement && matchLeader && matchGroupe
    })

    result = [...result].sort((a, b) => {
      if (triBillets === 'nom') return a.nom_pci.localeCompare(b.nom_pci)
      if (triBillets === 'evenement') return (a.evenements?.nom ?? '').localeCompare(b.evenements?.nom ?? '')
      if (triBillets === 'statut') return a.statut.localeCompare(b.statut)
      if (triBillets === 'date') return new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
      return 0
    })

    return result
  }, [billets, recherche, filtreEvenement, idsPCIFiltresParLeader, idsPCIFiltresParGroupe, triBillets, pcis])

  const pcisFiltres = useMemo(() => {
    let result = pcis.filter(p => {
      const matchRecherche = recherche.length < 2 ? true :
        `${p.prenom_1} ${p.nom_1}`.toLowerCase().includes(recherche.toLowerCase()) ||
        p.courriel.toLowerCase().includes(recherche.toLowerCase()) ||
        p.numero_amway.toLowerCase().includes(recherche.toLowerCase())
      const matchLeader = filtreLeader === '' ? true : p.leader_id === filtreLeader
      const matchGroupe = !filtreGroupe ? true : p.groupe?.toLowerCase().includes(filtreGroupe.toLowerCase())
      return matchRecherche && matchLeader && matchGroupe
    })

    result = [...result].sort((a, b) => {
      if (triProfils === 'nom') return a.nom_1.localeCompare(b.nom_1)
      if (triProfils === 'numero_amway') return a.numero_amway.localeCompare(b.numero_amway)
      if (triProfils === 'ville') return a.ville.localeCompare(b.ville)
      return 0
    })

    return result
  }, [pcis, recherche, filtreLeader, filtreGroupe, triProfils])

  async function sauvegarderGroupe() {
    if (!profilOuvert) return
    setSauveGroupeChargement(true)

    await fetch('/api/leader/modifier-groupe', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: profilOuvert.id, groupe: groupeEdit }),
    })

    setSauveGroupeChargement(false)
    setGroupeSauvegarde(true)
    setTimeout(() => setGroupeSauvegarde(false), 2000)
    profilOuvert.groupe = groupeEdit || null
  }

  function exporterCSV() {
    const entetes = ['Date achat', 'Nom PCI', '# Amway', 'Groupe', 'Leader', 'Événement', 'Statut']

    const lignes = billetsFiltres.map(b => {
      const pci = pcis.find(p => p.id === b.compte_id)
      const date = new Date(b.created_at).toLocaleString('fr-CA', { dateStyle: 'short', timeStyle: 'short' })
      const nom = b.nom_pci
      const amway = pci?.numero_amway ?? ''
      const groupe = pci?.groupe ?? ''
      const leader = pci ? (nomLeader(pci.leader_id) ?? '') : ''
      const evenement = b.evenements?.nom ?? ''
      const statut = b.statut === 'vendu' ? 'Vendu' : b.statut === 'utilise' ? 'Utilisé' : 'Remboursé'
      return [date, nom, amway, groupe, leader, evenement, statut]
    })

    const contenu = [entetes, ...lignes]
      .map(ligne => ligne.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
      .join('\n')

    const blob = new Blob(['\uFEFF' + contenu], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const lien = document.createElement('a')
    lien.href = url
    const nomFichier = filtreEvenement
      ? `mon-groupe-${filtreEvenement.replace(/\s+/g, '-')}.csv`
      : filtreGroupe
      ? `mon-groupe-${filtreGroupe.replace(/\s+/g, '-')}.csv`
      : 'mon-groupe.csv'
    lien.download = nomFichier
    lien.click()
    URL.revokeObjectURL(url)
  }

  function ouvrirProfil(pci: PCI) {
    setProfilOuvert(pci)
    setGroupeEdit(pci.groupe ?? '')
    setGroupeSauvegarde(false)
  }

  const statutBilletStyle = (statut: string) => {
    if (statut === 'vendu') return { backgroundColor: '#E3F2FD', color: '#2E86C1' }
    if (statut === 'utilise') return { backgroundColor: '#E8F5E9', color: '#4CAF7D' }
    if (statut === 'rembourse') return { backgroundColor: '#FFF3E0', color: '#E57373' }
    return {}
  }

  const statutBilletLabel = (statut: string) => {
    if (statut === 'vendu') return 'Vendu'
    if (statut === 'utilise') return 'Utilisé'
    if (statut === 'rembourse') return 'Remboursé'
    return statut
  }

  const ongletClass = (actif: boolean) =>
    `px-4 py-2 text-sm font-medium rounded-t-lg transition-colors ${actif ? 'text-white' : 'text-gray-500'}`

  const triClass = (actif: boolean) =>
    `px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${actif ? 'text-white' : 'text-gray-500'}`

  return (
    <div>
      {/* Stats rapides */}
      <div className="grid grid-cols-3 gap-4 mb-4">
        <div className="bg-white rounded-xl p-4 shadow-sm text-center">
          <p className="text-2xl font-bold" style={{ color: '#1A2535' }}>{pcis.length}</p>
          <p className="text-xs mt-1" style={{ color: '#666666' }}>PCI dans le groupe</p>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm text-center">
          <p className="text-2xl font-bold" style={{ color: '#C9A84C' }}>{billets.filter(b => b.statut === 'vendu').length}</p>
          <p className="text-xs mt-1" style={{ color: '#666666' }}>Billets actifs</p>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm text-center">
          <p className="text-2xl font-bold" style={{ color: '#4CAF7D' }}>{billets.filter(b => b.statut === 'utilise').length}</p>
          <p className="text-xs mt-1" style={{ color: '#666666' }}>Billets utilisés</p>
        </div>
      </div>

      {/* Totaux par événement */}
      {evenements.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm p-4 mb-4">
          <p className="text-xs font-bold uppercase tracking-wide mb-3" style={{ color: '#C9A84C' }}>Billets par événement</p>
          <div className="space-y-2">
            {evenements.map(ev => (
              <div key={ev} className="flex justify-between items-center">
                <span className="text-sm" style={{ color: '#1A2535' }}>{ev}</span>
                <span className="px-2 py-0.5 rounded-full text-xs font-bold" style={{ backgroundColor: '#E3F2FD', color: '#2E86C1' }}>
                  {totauxParEvenement[ev]} billet{totauxParEvenement[ev] > 1 ? 's' : ''}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Bouton export CSV */}
      <div className="flex justify-end mb-2">
        <button onClick={exporterCSV} className="px-4 py-2 rounded-lg text-sm font-medium text-white" style={{ backgroundColor: '#2E86C1' }}>
          ⬇️ CSV ({billetsFiltres.length})
        </button>
      </div>

      {/* Onglets */}
      <div className="flex gap-2 mb-0">
        <button onClick={() => setOnglet('billets')} className={ongletClass(onglet === 'billets')} style={onglet === 'billets' ? { backgroundColor: '#C9A84C' } : { backgroundColor: '#E0E0E0' }}>
          Billets ({billets.length})
        </button>
        <button onClick={() => setOnglet('profils')} className={ongletClass(onglet === 'profils')} style={onglet === 'profils' ? { backgroundColor: '#C9A84C' } : { backgroundColor: '#E0E0E0' }}>
          Profils PCI ({pcis.length})
        </button>
      </div>

      <div className="bg-white rounded-b-2xl rounded-tr-2xl shadow">
        {/* Barre de filtres */}
        <div className="p-4 border-b space-y-3" style={{ borderColor: '#E0E0E0' }}>
          <input className="w-full border rounded-lg px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-yellow-400" style={{ borderColor: '#E0E0E0' }} placeholder="Rechercher par nom ou numéro Amway..." value={recherche} onChange={e => setRecherche(e.target.value)} />

          <div className="flex flex-wrap gap-2 items-center">
            {evenements.length > 0 && (
              <select className="border rounded-lg px-3 py-1.5 text-sm outline-none" style={{ borderColor: '#E0E0E0' }} value={filtreEvenement} onChange={e => setFiltreEvenement(e.target.value)}>
                <option value="">Tous les événements</option>
                {evenements.map(ev => <option key={ev} value={ev}>{ev}</option>)}
              </select>
            )}

            {leadersGroupe.length > 0 && (
              <select className="border rounded-lg px-3 py-1.5 text-sm outline-none" style={{ borderColor: '#E0E0E0' }} value={filtreLeader} onChange={e => setFiltreLeader(e.target.value)}>
                <option value="">Tous les leaders</option>
                {leadersGroupe.map(l => <option key={l.id} value={l.id}>{l.prenom_1} {l.nom_1}</option>)}
              </select>
            )}

            <input className="border rounded-lg px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-yellow-400" style={{ borderColor: '#E0E0E0' }} placeholder="Filtrer par groupe..." value={filtreGroupe} onChange={e => setFiltreGroupe(e.target.value)} />

            {onglet === 'billets' && (
              <div className="flex gap-1 ml-auto">
                <span className="text-xs self-center mr-1" style={{ color: '#999999' }}>Trier :</span>
                {(['nom', 'evenement', 'statut', 'date'] as TriBillets[]).map(t => (
                  <button key={t} onClick={() => setTriBillets(t)} className={triClass(triBillets === t)} style={triBillets === t ? { backgroundColor: '#1A2535' } : { backgroundColor: '#E0E0E0' }}>
                    {t === 'nom' ? 'Nom' : t === 'evenement' ? 'Événement' : t === 'statut' ? 'Statut' : 'Date achat'}
                  </button>
                ))}
              </div>
            )}

            {onglet === 'profils' && (
              <div className="flex gap-1 ml-auto">
                <span className="text-xs self-center mr-1" style={{ color: '#999999' }}>Trier :</span>
                {(['nom', 'numero_amway', 'ville'] as TriProfils[]).map(t => (
                  <button key={t} onClick={() => setTriProfils(t)} className={triClass(triProfils === t)} style={triProfils === t ? { backgroundColor: '#1A2535' } : { backgroundColor: '#E0E0E0' }}>
                    {t === 'nom' ? 'Nom' : t === 'numero_amway' ? '# Amway' : 'Ville'}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* ONGLET BILLETS */}
        {onglet === 'billets' && (
          <div>
            {billetsFiltres.length === 0 ? (
              <div className="p-8 text-center" style={{ color: '#666666' }}>Aucun billet trouvé</div>
            ) : (
              billetsFiltres.map(billet => {
                const pci = pcis.find(p => p.id === billet.compte_id)
                const leader = pci ? nomLeader(pci.leader_id) : null
                return (
                  <div key={billet.id} className="p-4 border-b flex items-start justify-between gap-4" style={{ borderColor: '#E0E0E0' }}>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <p className="font-semibold" style={{ color: '#1A2535' }}>{billet.nom_pci}</p>
                        <span className="px-2 py-0.5 rounded-full text-xs font-medium" style={statutBilletStyle(billet.statut)}>
                          {statutBilletLabel(billet.statut)}
                        </span>
                        {billet.est_sans_frais && <span className="px-2 py-0.5 rounded-full text-xs font-medium" style={{ backgroundColor: '#E8F5E9', color: '#4CAF7D' }}>Sans frais</span>}
                        {billet.prix_paye === 0 && !billet.est_sans_frais && <span className="px-2 py-0.5 rounded-full text-xs font-medium" style={{ backgroundColor: '#F3E5F5', color: '#9C27B0' }}>Billet offert</span>}
                      </div>
                      <p className="text-sm" style={{ color: '#666666' }}>{billet.evenements?.nom}</p>
                      <div className="flex gap-3 mt-0.5 flex-wrap">
                        {pci && <p className="text-xs" style={{ color: '#999999' }}>#{pci.numero_amway}</p>}
                        {leader && <p className="text-xs" style={{ color: '#2E86C1' }}>Leader : {leader}</p>}
                        {pci?.groupe && <p className="text-xs font-medium" style={{ color: '#C9A84C' }}>Groupe : {pci.groupe}</p>}
                        <p className="text-xs" style={{ color: '#999999' }}>Acheté le {new Date(billet.created_at).toLocaleString('fr-CA', { dateStyle: 'short', timeStyle: 'short' })}</p>
                      </div>
                    </div>
                    {pci && (
                      <button onClick={() => ouvrirProfil(pci)} className="px-3 py-1.5 rounded-lg text-xs font-medium" style={{ backgroundColor: '#E3F2FD', color: '#2E86C1' }}>
                        ℹ️ Profil
                      </button>
                    )}
                  </div>
                )
              })
            )}
          </div>
        )}

        {/* ONGLET PROFILS */}
        {onglet === 'profils' && (
          <div>
            {pcisFiltres.length === 0 ? (
              <div className="p-8 text-center" style={{ color: '#666666' }}>Aucun PCI trouvé</div>
            ) : (
              pcisFiltres.map(pci => {
                const leader = nomLeader(pci.leader_id)
                return (
                  <div key={pci.id} className="p-4 border-b flex items-start justify-between gap-4" style={{ borderColor: '#E0E0E0' }}>
                    <div className="flex-1">
                      <p className="font-semibold" style={{ color: '#1A2535' }}>
                        {pci.prenom_1} {pci.nom_1}
                        {pci.prenom_2 && <span className="text-sm font-normal ml-2" style={{ color: '#666666' }}>+ {pci.prenom_2} {pci.nom_2}</span>}
                      </p>
                      {pci.groupe && <p className="text-xs font-medium mt-0.5" style={{ color: '#C9A84C' }}>Groupe : {pci.groupe}</p>}
                      <p className="text-sm" style={{ color: '#666666' }}>{pci.courriel}</p>
                      <p className="text-sm" style={{ color: '#666666' }}>{pci.ville}, {pci.province} · #{pci.numero_amway}</p>
                      {leader && <p className="text-xs mt-0.5" style={{ color: '#2E86C1' }}>Leader : {leader}</p>}
                      <p className="text-xs mt-1" style={{ color: '#4CAF7D' }}>
                        Sans frais jusqu'au {pci.periode_sf_fin ? new Date(pci.periode_sf_fin).toLocaleDateString('fr-CA') : 'N/A'}
                      </p>
                    </div>
                    <button onClick={() => ouvrirProfil(pci)} className="px-3 py-1.5 rounded-lg text-xs font-medium" style={{ backgroundColor: '#E3F2FD', color: '#2E86C1' }}>
                      ℹ️ Profil
                    </button>
                  </div>
                )
              })
            )}
          </div>
        )}
      </div>

      {/* Modal profil PCI */}
      {profilOuvert && (
        <div className="fixed inset-0 flex items-center justify-center z-50" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-md mx-4">
            <div className="flex justify-between items-start mb-4">
              <h2 className="text-lg font-bold" style={{ color: '#1A2535' }}>Profil PCI</h2>
              <button onClick={() => setProfilOuvert(null)} className="text-gray-400 hover:text-gray-600 text-xl">✕</button>
            </div>
            <div className="space-y-3">
              <div className="rounded-lg p-4 space-y-2" style={{ backgroundColor: '#F5F3EE' }}>
                <p className="font-semibold text-lg" style={{ color: '#1A2535' }}>{profilOuvert.prenom_1} {profilOuvert.nom_1}</p>
                {profilOuvert.prenom_2 && <p className="text-sm" style={{ color: '#666666' }}>Co-PCI : {profilOuvert.prenom_2} {profilOuvert.nom_2}</p>}
              </div>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span style={{ color: '#666666' }}>Courriel</span>
                  <span style={{ color: '#1A2535' }}>{profilOuvert.courriel}</span>
                </div>
                <div className="flex justify-between">
                  <span style={{ color: '#666666' }}>Téléphone</span>
                  <span style={{ color: '#1A2535' }}>{profilOuvert.telephone}</span>
                </div>
                <div className="flex justify-between">
                  <span style={{ color: '#666666' }}>Ville</span>
                  <span style={{ color: '#1A2535' }}>{profilOuvert.ville}, {profilOuvert.province}</span>
                </div>
                <div className="flex justify-between">
                  <span style={{ color: '#666666' }}>Numéro Amway</span>
                  <span style={{ color: '#1A2535' }}>#{profilOuvert.numero_amway}</span>
                </div>
                <div className="flex justify-between">
                  <span style={{ color: '#666666' }}>Leader</span>
                  <span style={{ color: '#2E86C1' }}>{nomLeader(profilOuvert.leader_id) ?? 'Aucun'}</span>
                </div>
                <div className="flex justify-between">
                  <span style={{ color: '#666666' }}>Sans frais jusqu'au</span>
                  <span style={{ color: '#4CAF7D' }}>{profilOuvert.periode_sf_fin ? new Date(profilOuvert.periode_sf_fin).toLocaleDateString('fr-CA') : 'N/A'}</span>
                </div>
                <div className="flex justify-between">
                  <span style={{ color: '#666666' }}>Billets</span>
                  <span style={{ color: '#1A2535' }}>{billets.filter(b => b.compte_id === profilOuvert.id).length} billet(s)</span>
                </div>
              </div>

              <div className="border-t pt-3" style={{ borderColor: '#E0E0E0' }}>
                <label className="block text-sm font-medium mb-1" style={{ color: '#C9A84C' }}>Groupe</label>
                <div className="flex gap-2">
                  <input className="flex-1 border rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-yellow-400" style={{ borderColor: '#E0E0E0' }} placeholder="Ex: BRISSON, ÉQUIPE-NORD..." value={groupeEdit} onChange={e => setGroupeEdit(e.target.value)} />
                  <button onClick={sauvegarderGroupe} disabled={sauvegroupeChargement} className="px-3 py-2 rounded-lg text-sm font-medium text-white disabled:opacity-50" style={{ backgroundColor: groupeSauvegarde ? '#4CAF7D' : '#C9A84C' }}>
                    {sauvegroupeChargement ? '...' : groupeSauvegarde ? '✓' : 'Sauver'}
                  </button>
                </div>
              </div>
            </div>

            <button onClick={() => setProfilOuvert(null)} className="w-full mt-6 py-2 rounded-lg text-sm font-medium text-white" style={{ backgroundColor: '#C9A84C' }}>
              Fermer
            </button>
          </div>
        </div>
      )}
    </div>
  )
}