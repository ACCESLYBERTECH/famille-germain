'use client'

import { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'

interface Billet {
  id: string
  nom_pci: string
  statut: string
  prix_paye: number
  est_sans_frais: boolean
  created_at: string
  stripe_payment_intent_id: string | null
  evenements: { nom: string; date_debut: string; a_banquet: boolean } | null
  comptes: { prenom_1: string; nom_1: string; courriel: string; numero_amway: string; leader_id: string | null } | null
}

interface Evenement {
  id: string
  nom: string
}

interface PCI {
  id: string
  prenom_1: string
  nom_1: string
  courriel: string
}

interface Leader {
  id: string
  prenom_1: string
  nom_1: string
}

interface BanquetAchete {
  billet_id: string
  banquet_id: string
  nom_pci: string
}

interface Props {
  billets: Billet[]
  evenements: Evenement[]
  pcis: PCI[]
  leaders: Leader[]
  banquetsAchetes: BanquetAchete[]
}

type TriType = 'nom' | 'evenement' | 'statut' | 'numero_amway' | 'date'

export default function GestionBillets({ billets, evenements, pcis, leaders, banquetsAchetes = [] }: Props) {
  const [chargement, setChargement] = useState<string | null>(null)
  const [filtreStatut, setFiltreStatut] = useState<'tous' | 'vendu' | 'utilise' | 'rembourse'>('tous')
  const [filtreEvenement, setFiltreEvenement] = useState('')
  const [filtreLeader, setFiltreLeader] = useState('')
  const [recherche, setRecherche] = useState('')
  const [tri, setTri] = useState<TriType>('nom')
  const [modalOuvert, setModalOuvert] = useState(false)
  const [recherchePCI, setRecherchePCI] = useState('')
  const [selectedPCI, setSelectedPCI] = useState<PCI | null>(null)
  const [selectedEvenement, setSelectedEvenement] = useState('')
  const [envoiBillet, setEnvoiBillet] = useState(false)
  const [erreurBillet, setErreurBillet] = useState('')
  const [modalRapport, setModalRapport] = useState(false)
  const [rapportEvenement, setRapportEvenement] = useState('')
  const [rapportDestinataire, setRapportDestinataire] = useState('')
  const [envoiRapport, setEnvoiRapport] = useState(false)
  const [erreurRapport, setErreurRapport] = useState('')
  const [rapportEnvoye, setRapportEnvoye] = useState(false)
  const router = useRouter()

  const totauxParEvenement = useMemo(() => {
    const totaux: Record<string, number> = {}
    billets.forEach(b => {
      const nom = b.evenements?.nom ?? 'Inconnu'
      totaux[nom] = (totaux[nom] ?? 0) + 1
    })
    return totaux
  }, [billets])

  const nomsEvenements = useMemo(() => {
    const noms = new Set<string>()
    billets.forEach(b => { if (b.evenements?.nom) noms.add(b.evenements.nom) })
    return Array.from(noms).sort()
  }, [billets])

  const billetsFiltres = useMemo(() => {
    let result = billets.filter(b => {
      const matchStatut = filtreStatut === 'tous' ? true : b.statut === filtreStatut
      const matchEvenement = filtreEvenement === '' ? true : b.evenements?.nom === filtreEvenement
      const matchLeader = filtreLeader === '' ? true : b.comptes?.leader_id === filtreLeader
      const matchRecherche = recherche.length < 2 ? true :
        b.nom_pci.toLowerCase().includes(recherche.toLowerCase()) ||
        b.comptes?.courriel.toLowerCase().includes(recherche.toLowerCase()) ||
        b.comptes?.numero_amway.toLowerCase().includes(recherche.toLowerCase())
      return matchStatut && matchEvenement && matchLeader && matchRecherche
    })

    result = [...result].sort((a, b) => {
      if (tri === 'nom') return a.nom_pci.localeCompare(b.nom_pci)
      if (tri === 'evenement') return (a.evenements?.nom ?? '').localeCompare(b.evenements?.nom ?? '')
      if (tri === 'statut') return a.statut.localeCompare(b.statut)
      if (tri === 'numero_amway') return (a.comptes?.numero_amway ?? '').localeCompare(b.comptes?.numero_amway ?? '')
      if (tri === 'date') return new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
      return 0
    })

    return result
  }, [billets, filtreStatut, filtreEvenement, filtreLeader, recherche, tri])

  function exporterCSV() {
    const entetes = ['Date achat', '# Amway', 'Nom PCI', 'Courriel', 'Événement', 'Statut', 'Prix', 'Banquet']
    const lignes = billetsFiltres.map(b => {
      const date = new Date(b.created_at).toLocaleString('fr-CA', { dateStyle: 'short', timeStyle: 'short' })
      const amway = b.comptes?.numero_amway ?? ''
      const nom = b.nom_pci
      const courriel = b.comptes?.courriel ?? ''
      const evenement = b.evenements?.nom ?? ''
      const statut = b.statut === 'vendu' ? 'Vendu' : b.statut === 'utilise' ? 'Utilisé' : 'Remboursé'
      const prix = b.est_sans_frais ? 'Sans frais' : b.prix_paye === 0 ? 'Billet offert' : `${b.prix_paye.toFixed(2)} $`
      const banquet = b.est_sans_frais && b.evenements?.a_banquet
        ? (banquetsAchetes.some(ba => ba.billet_id === b.id) ? 'Avec banquet' : 'Sans banquet')
        : ''
      return [date, amway, nom, courriel, evenement, statut, prix, banquet]
    })

    const contenu = [entetes, ...lignes]
      .map(ligne => ligne.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
      .join('\n')

    const blob = new Blob(['\uFEFF' + contenu], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const lien = document.createElement('a')
    lien.href = url
    const nomFichier = filtreEvenement ? `billets-${filtreEvenement.replace(/\s+/g, '-')}.csv` : 'billets-tous.csv'
    lien.download = nomFichier
    lien.click()
    URL.revokeObjectURL(url)
  }

  async function envoyerRapport() {
    setErreurRapport('')
    if (!rapportEvenement) { setErreurRapport('Veuillez sélectionner un événement.'); return }
    if (!rapportDestinataire) { setErreurRapport('Veuillez entrer un courriel destinataire.'); return }
    setEnvoiRapport(true)

    const res = await fetch('/api/admin/rapport-excel', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ evenement_id: rapportEvenement, destinataire: rapportDestinataire }),
    })

    const data = await res.json()
    if (!res.ok) {
      setErreurRapport(data.error)
      setEnvoiRapport(false)
      return
    }

    setEnvoiRapport(false)
    setRapportEnvoye(true)
    setTimeout(() => {
      setModalRapport(false)
      setRapportEnvoye(false)
      setRapportEvenement('')
      setRapportDestinataire('')
    }, 2000)
  }

  const resultatsRecherche = recherchePCI.length >= 2
    ? pcis.filter(p => `${p.prenom_1} ${p.nom_1} ${p.courriel}`.toLowerCase().includes(recherchePCI.toLowerCase())).slice(0, 6)
    : []

  async function rembourser(billetId: string) {
    if (!confirm('Confirmer le remboursement de ce billet? Cette action est irréversible.')) return
    setChargement(billetId)
    const res = await fetch('/api/remboursement', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ billet_id: billetId }),
    })
    const data = await res.json()
    if (!res.ok) { alert(`Erreur : ${data.error}`) } else { router.refresh() }
    setChargement(null)
  }

  async function offirBillet() {
    setErreurBillet('')
    if (!selectedPCI || !selectedEvenement) { setErreurBillet('Veuillez sélectionner un PCI et un événement.'); return }
    setEnvoiBillet(true)

    const res = await fetch('/api/billets/offrir', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ evenement_id: selectedEvenement, compte_id: selectedPCI.id, nom_pci: `${selectedPCI.prenom_1} ${selectedPCI.nom_1}` }),
    })

    if (!res.ok) {
      const data = await res.json()
      setErreurBillet(data.error)
      setEnvoiBillet(false)
      return
    }

    const evenement = evenements.find(e => e.id === selectedEvenement)!
    await fetch('/api/emails/confirmation-billet-offert', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prenom: selectedPCI.prenom_1, nom: selectedPCI.nom_1, email: selectedPCI.courriel, evenement: evenement.nom, ville: '' }),
    })

    setEnvoiBillet(false)
    setModalOuvert(false)
    setSelectedPCI(null)
    setRecherchePCI('')
    setSelectedEvenement('')
    router.refresh()
  }

  function ouvrirModal() {
    setModalOuvert(true)
    setSelectedPCI(null)
    setRecherchePCI('')
    setSelectedEvenement('')
    setErreurBillet('')
  }

  const statutStyle = (statut: string) => {
    if (statut === 'vendu') return { backgroundColor: '#E3F2FD', color: '#2E86C1' }
    if (statut === 'utilise') return { backgroundColor: '#E8F5E9', color: '#4CAF7D' }
    if (statut === 'rembourse') return { backgroundColor: '#FFF3E0', color: '#E57373' }
    return {}
  }

  const statutLabel = (statut: string) => {
    if (statut === 'vendu') return 'Vendu'
    if (statut === 'utilise') return 'Utilisé'
    if (statut === 'rembourse') return 'Remboursé'
    return statut
  }

  const filtreClass = (actif: boolean) =>
    `px-4 py-2 text-sm font-medium rounded-lg transition-colors ${actif ? 'text-white' : 'text-gray-500'}`

  const triClass = (actif: boolean) =>
    `px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${actif ? 'text-white' : 'text-gray-500'}`

  return (
    <div>
      {/* Totaux par événement */}
      {nomsEvenements.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm p-4 mb-4">
          <p className="text-xs font-bold uppercase tracking-wide mb-3" style={{ color: '#C9A84C' }}>Billets par événement</p>
          <div className="space-y-2">
            {nomsEvenements.map(ev => (
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

      {/* Barre d'actions */}
      <div className="flex justify-between items-center mb-3 flex-wrap gap-3">
        <div className="flex gap-2 flex-wrap">
          {(['tous', 'vendu', 'utilise', 'rembourse'] as const).map(f => (
            <button key={f} onClick={() => setFiltreStatut(f)} className={filtreClass(filtreStatut === f)} style={filtreStatut === f ? { backgroundColor: '#C9A84C' } : { backgroundColor: '#E0E0E0' }}>
              {f === 'tous' ? 'Tous' : statutLabel(f)}
              <span className="ml-2 text-xs">({f === 'tous' ? billets.length : billets.filter(b => b.statut === f).length})</span>
            </button>
          ))}
        </div>
        <div className="flex gap-2 flex-wrap">
          <button onClick={exporterCSV} className="px-4 py-2 rounded-lg text-sm font-medium text-white" style={{ backgroundColor: '#2E86C1' }}>
            ⬇️ CSV ({billetsFiltres.length})
          </button>
          <button onClick={() => { setModalRapport(true); setErreurRapport(''); setRapportEnvoye(false) }} className="px-4 py-2 rounded-lg text-sm font-medium text-white" style={{ backgroundColor: '#1A2535' }}>
            📧 Rapport Excel
          </button>
          <button onClick={ouvrirModal} className="px-4 py-2 rounded-lg text-sm font-medium text-white" style={{ backgroundColor: '#4CAF7D' }}>
            + Offrir un billet
          </button>
        </div>
      </div>

      {/* Filtres secondaires */}
      <div className="bg-white rounded-t-2xl shadow px-4 pt-4 pb-3 border-b" style={{ borderColor: '#E0E0E0' }}>
        <div className="flex flex-wrap gap-3 items-center mb-3">
          <input className="flex-1 min-w-48 border rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-yellow-400" style={{ borderColor: '#E0E0E0' }} placeholder="Rechercher par nom, courriel ou # Amway..." value={recherche} onChange={e => setRecherche(e.target.value)} />
          {nomsEvenements.length > 0 && (
            <select className="border rounded-lg px-3 py-2 text-sm outline-none" style={{ borderColor: '#E0E0E0' }} value={filtreEvenement} onChange={e => setFiltreEvenement(e.target.value)}>
              <option value="">Tous les événements</option>
              {nomsEvenements.map(ev => <option key={ev} value={ev}>{ev}</option>)}
            </select>
          )}
          {leaders.length > 0 && (
            <select className="border rounded-lg px-3 py-2 text-sm outline-none" style={{ borderColor: '#E0E0E0' }} value={filtreLeader} onChange={e => setFiltreLeader(e.target.value)}>
              <option value="">Tous les leaders</option>
              {leaders.map(l => <option key={l.id} value={l.id}>{l.prenom_1} {l.nom_1}</option>)}
            </select>
          )}
        </div>
        <div className="flex gap-1 items-center">
          <span className="text-xs mr-1" style={{ color: '#999999' }}>Trier :</span>
          {(['nom', 'evenement', 'statut', 'numero_amway', 'date'] as TriType[]).map(t => (
            <button key={t} onClick={() => setTri(t)} className={triClass(tri === t)} style={tri === t ? { backgroundColor: '#1A2535' } : { backgroundColor: '#E0E0E0' }}>
              {t === 'nom' ? 'Nom' : t === 'evenement' ? 'Événement' : t === 'statut' ? 'Statut' : t === 'numero_amway' ? '# Amway' : 'Date achat'}
            </button>
          ))}
          <span className="ml-auto text-xs" style={{ color: '#999999' }}>{billetsFiltres.length} résultat{billetsFiltres.length !== 1 ? 's' : ''}</span>
        </div>
      </div>

      {/* Liste billets */}
      <div className="bg-white rounded-b-2xl shadow">
        {billetsFiltres.length === 0 ? (
          <div className="p-8 text-center" style={{ color: '#666666' }}>Aucun billet trouvé</div>
        ) : (
          billetsFiltres.map(billet => {
            const leaderNom = billet.comptes?.leader_id
              ? leaders.find(l => l.id === billet.comptes?.leader_id)
              : null
            const aBanquetAchete = banquetsAchetes.some(b => b.billet_id === billet.id)
            return (
              <div key={billet.id} className="p-4 border-b flex items-start justify-between gap-4" style={{ borderColor: '#E0E0E0' }}>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <p className="font-semibold" style={{ color: '#1A2535' }}>{billet.nom_pci}</p>
                    <span className="px-2 py-0.5 rounded-full text-xs font-medium" style={statutStyle(billet.statut)}>{statutLabel(billet.statut)}</span>
                    {billet.est_sans_frais && <span className="px-2 py-0.5 rounded-full text-xs font-medium" style={{ backgroundColor: '#E8F5E9', color: '#4CAF7D' }}>Sans frais</span>}
                    {billet.prix_paye === 0 && !billet.est_sans_frais && <span className="px-2 py-0.5 rounded-full text-xs font-medium" style={{ backgroundColor: '#F3E5F5', color: '#9C27B0' }}>Billet offert</span>}
                    {billet.est_sans_frais && billet.evenements?.a_banquet && (
                      <span className="px-2 py-0.5 rounded-full text-xs font-medium" style={{ backgroundColor: aBanquetAchete ? '#E8F5E9' : '#FFF3E0', color: aBanquetAchete ? '#4CAF7D' : '#E57373' }}>
                        {aBanquetAchete ? '🍽️ Avec banquet' : '🍽️ Sans banquet'}
                      </span>
                    )}
                  </div>
                  <p className="text-sm" style={{ color: '#666666' }}>{billet.evenements?.nom}</p>
                  <div className="flex gap-3 mt-0.5 flex-wrap">
                    <p className="text-xs" style={{ color: '#999999' }}>{billet.comptes?.courriel}</p>
                    {billet.comptes?.numero_amway && <p className="text-xs" style={{ color: '#999999' }}>#{billet.comptes.numero_amway}</p>}
                    {leaderNom && <p className="text-xs" style={{ color: '#2E86C1' }}>Leader : {leaderNom.prenom_1} {leaderNom.nom_1}</p>}
                  </div>
                  <div className="flex gap-3 mt-0.5 flex-wrap">
                    <p className="text-xs" style={{ color: '#999999' }}>
                      {billet.prix_paye === 0 && !billet.est_sans_frais ? 'Billet offert' : billet.est_sans_frais ? 'Sans frais' : `${billet.prix_paye?.toFixed(2)} $`}
                    </p>
                    <p className="text-xs" style={{ color: '#999999' }}>
                      Acheté le {new Date(billet.created_at).toLocaleString('fr-CA', { dateStyle: 'short', timeStyle: 'short' })}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {billet.statut === 'vendu' && billet.stripe_payment_intent_id && (
                    <button onClick={() => rembourser(billet.id)} disabled={chargement === billet.id} className="px-4 py-2 rounded-lg text-sm font-medium text-white disabled:opacity-50" style={{ backgroundColor: '#E57373' }}>
                      {chargement === billet.id ? '...' : 'Rembourser'}
                    </button>
                  )}
                </div>
              </div>
            )
          })
        )}
      </div>

      {/* Modal offrir un billet */}
      {modalOuvert && (
        <div className="fixed inset-0 flex items-center justify-center z-50" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-md mx-4">
            <h2 className="text-lg font-bold mb-4" style={{ color: '#1A2535' }}>Offrir un billet</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1" style={{ color: '#1A2535' }}>PCI</label>
                {selectedPCI ? (
                  <div className="flex items-center justify-between rounded-lg px-4 py-2.5 border" style={{ borderColor: '#C9A84C', backgroundColor: '#FFFDF5' }}>
                    <div>
                      <p className="text-sm font-medium" style={{ color: '#1A2535' }}>{selectedPCI.prenom_1} {selectedPCI.nom_1}</p>
                      <p className="text-xs" style={{ color: '#666666' }}>{selectedPCI.courriel}</p>
                    </div>
                    <button onClick={() => { setSelectedPCI(null); setRecherchePCI('') }} className="text-xs px-2 py-1 rounded" style={{ color: '#E57373' }}>✕ Changer</button>
                  </div>
                ) : (
                  <div className="relative">
                    <input className="w-full border rounded-lg px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-yellow-400" style={{ borderColor: '#E0E0E0' }} placeholder="Rechercher par nom ou courriel..." value={recherchePCI} onChange={e => setRecherchePCI(e.target.value)} autoFocus />
                    {resultatsRecherche.length > 0 && (
                      <div className="absolute z-10 w-full bg-white border rounded-lg shadow-lg mt-1" style={{ borderColor: '#E0E0E0' }}>
                        {resultatsRecherche.map(pci => (
                          <button key={pci.id} onClick={() => { setSelectedPCI(pci); setRecherchePCI('') }} className="w-full text-left px-4 py-3 hover:bg-gray-50 border-b last:border-b-0 transition-colors" style={{ borderColor: '#F0F0F0' }}>
                            <p className="text-sm font-medium" style={{ color: '#1A2535' }}>{pci.prenom_1} {pci.nom_1}</p>
                            <p className="text-xs" style={{ color: '#666666' }}>{pci.courriel}</p>
                          </button>
                        ))}
                      </div>
                    )}
                    {recherchePCI.length >= 2 && resultatsRecherche.length === 0 && (
                      <div className="absolute z-10 w-full bg-white border rounded-lg shadow-lg mt-1 px-4 py-3" style={{ borderColor: '#E0E0E0' }}>
                        <p className="text-sm" style={{ color: '#666666' }}>Aucun PCI trouvé</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium mb-1" style={{ color: '#1A2535' }}>Événement</label>
                <select className="w-full border rounded-lg px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-yellow-400" style={{ borderColor: '#E0E0E0' }} value={selectedEvenement} onChange={e => setSelectedEvenement(e.target.value)}>
                  <option value="">Sélectionner un événement...</option>
                  {evenements.map(ev => <option key={ev.id} value={ev.id}>{ev.nom}</option>)}
                </select>
              </div>
              {erreurBillet && <p className="text-sm" style={{ color: '#E57373' }}>{erreurBillet}</p>}
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button onClick={() => setModalOuvert(false)} className="px-4 py-2 rounded-lg text-sm font-medium" style={{ color: '#666666', backgroundColor: '#F5F3EE' }}>Annuler</button>
              <button onClick={offirBillet} disabled={envoiBillet} className="px-4 py-2 rounded-lg text-sm font-medium text-white disabled:opacity-50" style={{ backgroundColor: '#4CAF7D' }}>
                {envoiBillet ? 'Envoi...' : 'Offrir le billet'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal rapport Excel */}
      {modalRapport && (
        <div className="fixed inset-0 flex items-center justify-center z-50" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-md mx-4">
            <h2 className="text-lg font-bold mb-4" style={{ color: '#1A2535' }}>Rapport Excel par email</h2>
            {rapportEnvoye ? (
              <div className="text-center py-6">
                <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4" style={{ backgroundColor: '#4CAF7D' }}>
                  <span className="text-white text-3xl">✓</span>
                </div>
                <p className="font-medium" style={{ color: '#1A2535' }}>Rapport envoyé avec succès!</p>
              </div>
            ) : (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1" style={{ color: '#1A2535' }}>Événement</label>
                  <select className="w-full border rounded-lg px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-yellow-400" style={{ borderColor: '#E0E0E0' }} value={rapportEvenement} onChange={e => setRapportEvenement(e.target.value)}>
                    <option value="">Sélectionner un événement...</option>
                    {evenements.map(ev => <option key={ev.id} value={ev.id}>{ev.nom}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1" style={{ color: '#1A2535' }}>Courriel destinataire</label>
                  <input type="email" className="w-full border rounded-lg px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-yellow-400" style={{ borderColor: '#E0E0E0' }} placeholder="exemple@courriel.com" value={rapportDestinataire} onChange={e => setRapportDestinataire(e.target.value)} />
                </div>
                {erreurRapport && <p className="text-sm" style={{ color: '#E57373' }}>{erreurRapport}</p>}
                <div className="flex justify-end gap-3 mt-2">
                  <button onClick={() => setModalRapport(false)} className="px-4 py-2 rounded-lg text-sm font-medium" style={{ color: '#666666', backgroundColor: '#F5F3EE' }}>Annuler</button>
                  <button onClick={envoyerRapport} disabled={envoiRapport} className="px-4 py-2 rounded-lg text-sm font-medium text-white disabled:opacity-50" style={{ backgroundColor: '#1A2535' }}>
                    {envoiRapport ? 'Envoi...' : 'Envoyer le rapport'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}