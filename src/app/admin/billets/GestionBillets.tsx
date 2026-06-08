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
  evenements: { nom: string; ville: string; date_debut: string } | null
  comptes: { prenom_1: string; nom_1: string; courriel: string } | null
}

interface Props {
  billets: Billet[]
}

export default function GestionBillets({ billets }: Props) {
  const [chargement, setChargement] = useState<string | null>(null)
  const [filtre, setFiltre] = useState<'tous' | 'vendu' | 'utilise' | 'rembourse'>('tous')
  const router = useRouter()

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
      {/* Filtres */}
      <div className="flex gap-2 mb-4 flex-wrap">
        {(['tous', 'vendu', 'utilise', 'rembourse'] as const).map(f => (
          <button key={f} onClick={() => setFiltre(f)} className={filtreClass(filtre === f)} style={filtre === f ? { backgroundColor: '#C9A84C' } : { backgroundColor: '#E0E0E0' }}>
            {f === 'tous' ? 'Tous' : statutLabel(f)}
            <span className="ml-2 text-xs">
              ({f === 'tous' ? billets.length : billets.filter(b => b.statut === f).length})
            </span>
          </button>
        ))}
      </div>

      {/* Liste */}
      <div className="bg-white rounded-2xl shadow">
        {billetsFiltres.length === 0 ? (
          <div className="p-8 text-center" style={{ color: '#666666' }}>Aucun billet trouvé</div>
        ) : (
          billetsFiltres.map(billet => (
            <div key={billet.id} className="p-4 border-b flex items-start justify-between gap-4" style={{ borderColor: '#E0E0E0' }}>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <p className="font-semibold" style={{ color: '#1A2535' }}>{billet.nom_pci}</p>
                  <span className="px-2 py-0.5 rounded-full text-xs font-medium" style={statutStyle(billet.statut)}>
                    {statutLabel(billet.statut)}
                  </span>
                  {billet.est_sans_frais && (
                    <span className="px-2 py-0.5 rounded-full text-xs font-medium" style={{ backgroundColor: '#E8F5E9', color: '#4CAF7D' }}>
                      Sans frais
                    </span>
                  )}
                </div>
                <p className="text-sm" style={{ color: '#666666' }}>
                  {billet.evenements?.nom} — {billet.evenements?.ville}
                </p>
                <p className="text-sm" style={{ color: '#666666' }}>
                  {billet.evenements?.date_debut && new Date(billet.evenements.date_debut).toLocaleDateString('fr-CA')}
                </p>
                <p className="text-xs mt-1" style={{ color: '#999999' }}>
                  {billet.comptes?.courriel} · {billet.est_sans_frais ? 'Sans frais' : `${billet.prix_paye?.toFixed(2)} $`}
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
    </div>
  )
}