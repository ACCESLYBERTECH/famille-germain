'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

interface Billet {
  id: string
  nom_pci: string
  statut: string
  prix_paye: number
  est_sans_frais: boolean
  created_at: string
  stripe_payment_intent_id: string | null
  evenements: { nom: string; date_debut: string } | null
  comptes: { prenom_1: string; nom_1: string; courriel: string } | null
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

interface Props {
  billets: Billet[]
  evenements: Evenement[]
  pcis: PCI[]
}

export default function GestionBillets({ billets, evenements, pcis }: Props) {
  const [chargement, setChargement] = useState<string | null>(null)
  const [filtre, setFiltre] = useState<'tous' | 'vendu' | 'utilise' | 'rembourse'>('tous')
  const [modalOuvert, setModalOuvert] = useState(false)
  const [recherchePCI, setRecherchePCI] = useState('')
  const [selectedPCI, setSelectedPCI] = useState<PCI | null>(null)
  const [selectedEvenement, setSelectedEvenement] = useState('')
  const [envoiBillet, setEnvoiBillet] = useState(false)
  const [erreurBillet, setErreurBillet] = useState('')
  const router = useRouter()

  const billetsFiltres = billets.filter(b => filtre === 'tous' ? true : b.statut === filtre)

  const resultatsRecherche = recherchePCI.length >= 2
    ? pcis.filter(p =>
        `${p.prenom_1} ${p.nom_1} ${p.courriel}`.toLowerCase().includes(recherchePCI.toLowerCase())
      ).slice(0, 6)
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
    if (!res.ok) {
      alert(`Erreur : ${data.error}`)
    } else {
      router.refresh()
    }
    setChargement(null)
  }

  async function offirBillet() {
    setErreurBillet('')
    if (!selectedPCI || !selectedEvenement) {
      setErreurBillet('Veuillez sélectionner un PCI et un événement.'); return
    }
    setEnvoiBillet(true)

    const res = await fetch('/api/billets/offrir', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        evenement_id: selectedEvenement,
        compte_id: selectedPCI.id,
        nom_pci: `${selectedPCI.prenom_1} ${selectedPCI.nom_1}`,
      }),
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
      body: JSON.stringify({
        prenom: selectedPCI.prenom_1,
        nom: selectedPCI.nom_1,
        email: selectedPCI.courriel,
        evenement: evenement.nom,
        ville: '',
      }),
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

  return (
    <div>
      {/* Barre d'actions */}
      <div className="flex justify-between items-center mb-4 flex-wrap gap-3">
        <div className="flex gap-2 flex-wrap">
          {(['tous', 'vendu', 'utilise', 'rembourse'] as const).map(f => (
            <button key={f} onClick={() => setFiltre(f)} className={filtreClass(filtre === f)} style={filtre === f ? { backgroundColor: '#C9A84C' } : { backgroundColor: '#E0E0E0' }}>
              {f === 'tous' ? 'Tous' : statutLabel(f)}
              <span className="ml-2 text-xs">
                ({f === 'tous' ? billets.length : billets.filter(b => b.statut === f).length})
              </span>
            </button>
          ))}
        </div>
        <button onClick={ouvrirModal} className="px-4 py-2 rounded-lg text-sm font-medium text-white" style={{ backgroundColor: '#4CAF7D' }}>
          + Offrir un billet
        </button>
      </div>

      {/* Liste billets */}
      <div className="bg-white rounded-2xl shadow">
        {billetsFiltres.length === 0 ? (
          <div className="p-8 text-center" style={{ color: '#666666' }}>Aucun billet trouvé</div>
        ) : (
          billetsFiltres.map(billet => (
            <div key={billet.id} className="p-4 border-b flex items-start justify-between gap-4" style={{ borderColor: '#E0E0E0' }}>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1 flex-wrap">
                  <p className="font-semibold" style={{ color: '#1A2535' }}>{billet.nom_pci}</p>
                  <span className="px-2 py-0.5 rounded-full text-xs font-medium" style={statutStyle(billet.statut)}>
                    {statutLabel(billet.statut)}
                  </span>
                  {billet.est_sans_frais && (
                    <span className="px-2 py-0.5 rounded-full text-xs font-medium" style={{ backgroundColor: '#E8F5E9', color: '#4CAF7D' }}>Sans frais</span>
                  )}
                  {billet.prix_paye === 0 && !billet.est_sans_frais && (
                    <span className="px-2 py-0.5 rounded-full text-xs font-medium" style={{ backgroundColor: '#F3E5F5', color: '#9C27B0' }}>Billet offert</span>
                  )}
                </div>
                <p className="text-sm" style={{ color: '#666666' }}>{billet.evenements?.nom}</p>
                <p className="text-sm" style={{ color: '#666666' }}>
                  {billet.evenements?.date_debut && new Date(billet.evenements.date_debut).toLocaleDateString('fr-CA')}
                </p>
                <p className="text-xs mt-1" style={{ color: '#999999' }}>
                  {billet.comptes?.courriel} · {billet.prix_paye === 0 && !billet.est_sans_frais ? 'Billet offert' : billet.est_sans_frais ? 'Sans frais' : `${billet.prix_paye?.toFixed(2)} $`}
                </p>
              </div>
              <div className="flex items-center gap-2">
                {billet.statut === 'vendu' && billet.stripe_payment_intent_id && (
                  <button onClick={() => rembourser(billet.id)} disabled={chargement === billet.id} className="px-4 py-2 rounded-lg text-sm font-medium text-white disabled:opacity-50" style={{ backgroundColor: '#E57373' }}>
                    {chargement === billet.id ? '...' : 'Rembourser'}
                  </button>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Modal offrir un billet */}
      {modalOuvert && (
        <div className="fixed inset-0 flex items-center justify-center z-50" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-md mx-4">
            <h2 className="text-lg font-bold mb-4" style={{ color: '#1A2535' }}>Offrir un billet</h2>

            <div className="space-y-4">

              {/* Recherche PCI */}
              <div>
                <label className="block text-sm font-medium mb-1" style={{ color: '#1A2535' }}>PCI</label>
                {selectedPCI ? (
                  <div className="flex items-center justify-between rounded-lg px-4 py-2.5 border" style={{ borderColor: '#C9A84C', backgroundColor: '#FFFDF5' }}>
                    <div>
                      <p className="text-sm font-medium" style={{ color: '#1A2535' }}>{selectedPCI.prenom_1} {selectedPCI.nom_1}</p>
                      <p className="text-xs" style={{ color: '#666666' }}>{selectedPCI.courriel}</p>
                    </div>
                    <button onClick={() => { setSelectedPCI(null); setRecherchePCI('') }} className="text-xs px-2 py-1 rounded" style={{ color: '#E57373' }}>
                      ✕ Changer
                    </button>
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

              {/* Événement */}
              <div>
                <label className="block text-sm font-medium mb-1" style={{ color: '#1A2535' }}>Événement</label>
                <select className="w-full border rounded-lg px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-yellow-400" style={{ borderColor: '#E0E0E0' }} value={selectedEvenement} onChange={e => setSelectedEvenement(e.target.value)}>
                  <option value="">Sélectionner un événement...</option>
                  {evenements.map(ev => (
                    <option key={ev.id} value={ev.id}>{ev.nom}</option>
                  ))}
                </select>
              </div>

              {erreurBillet && <p className="text-sm" style={{ color: '#E57373' }}>{erreurBillet}</p>}
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <button onClick={() => setModalOuvert(false)} className="px-4 py-2 rounded-lg text-sm font-medium" style={{ color: '#666666', backgroundColor: '#F5F3EE' }}>
                Annuler
              </button>
              <button onClick={offirBillet} disabled={envoiBillet} className="px-4 py-2 rounded-lg text-sm font-medium text-white disabled:opacity-50" style={{ backgroundColor: '#4CAF7D' }}>
                {envoiBillet ? 'Envoi...' : 'Offrir le billet'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}