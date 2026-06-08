'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/utils/supabase/client'

interface Billet {
  id: string
  nom_pci: string
  statut: string
  prix_paye: number
  est_sans_frais: boolean
  created_at: string
  stripe_payment_intent_id: string | null
  evenements: { nom: string; ville: string; date_debut: string } | null
  comptes: { prenom_1: string; nom_1: string; courriel: string } | null
}

interface Evenement {
  id: string
  nom: string
  ville: string
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
  const [selectedPCI, setSelectedPCI] = useState('')
  const [selectedEvenement, setSelectedEvenement] = useState('')
  const [envoiBillet, setEnvoiBillet] = useState(false)
  const [erreurBillet, setErreurBillet] = useState('')
  const router = useRouter()
  const supabase = createClient()

  const billetsFiltres = billets.filter(b => filtre === 'tous' ? true : b.statut === filtre)

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

    const pci = pcis.find(p => p.id === selectedPCI)!
    const token = crypto.randomUUID()

    const { error } = await supabase.from('billets').insert({
      evenement_id: selectedEvenement,
      compte_id: selectedPCI,
      nom_pci: `${pci.prenom_1} ${pci.nom_1}`,
      est_sans_frais: false,
      prix_paye: 0,
      stripe_payment_intent_id: null,
      qr_code_token: token,
      statut: 'vendu',
    })

    if (error) {
      setErreurBillet(error.message)
      setEnvoiBillet(false)
      return
    }

    const evenement = evenements.find(e => e.id === selectedEvenement)!
    await fetch('/api/emails/confirmation-billet-offert', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        prenom: pci.prenom_1,
        nom: pci.nom_1,
        email: pci.courriel,
        evenement: evenement.nom,
        ville: evenement.ville,
      }),
    })

    setEnvoiBillet(false)
    setModalOuvert(false)
    setSelectedPCI('')
    setSelectedEvenement('')
    router.refresh()
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
        <button onClick={() => setModalOuvert(true)} className="px-4 py-2 rounded-lg text-sm font-medium text-white" style={{ backgroundColor: '#4CAF7D' }}>
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
                <p className="text-sm" style={{ color: '#666666' }}>{billet.evenements?.nom} — {billet.evenements?.ville}</p>
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
              <div>
                <label className="block text-sm font-medium mb-1" style={{ color: '#1A2535' }}>PCI</label>
                <select className="w-full border rounded-lg px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-yellow-400" style={{ borderColor: '#E0E0E0' }} value={selectedPCI} onChange={e => setSelectedPCI(e.target.value)}>
                  <option value="">Sélectionner un PCI...</option>
                  {pcis.map(pci => (
                    <option key={pci.id} value={pci.id}>{pci.prenom_1} {pci.nom_1} — {pci.courriel}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1" style={{ color: '#1A2535' }}>Événement</label>
                <select className="w-full border rounded-lg px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-yellow-400" style={{ borderColor: '#E0E0E0' }} value={selectedEvenement} onChange={e => setSelectedEvenement(e.target.value)}>
                  <option value="">Sélectionner un événement...</option>
                  {evenements.map(ev => (
                    <option key={ev.id} value={ev.id}>{ev.nom} — {ev.ville}</option>
                  ))}
                </select>
              </div>

              {erreurBillet && <p className="text-sm" style={{ color: '#E57373' }}>{erreurBillet}</p>}
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <button onClick={() => { setModalOuvert(false); setErreurBillet('') }} className="px-4 py-2 rounded-lg text-sm font-medium" style={{ color: '#666666', backgroundColor: '#F5F3EE' }}>
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