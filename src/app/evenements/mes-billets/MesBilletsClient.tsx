'use client'

import { useState } from 'react'
import QRCodeComponent from '@/components/QRCode'

interface Billet {
  id: string
  nom_pci: string
  qr_code_token: string
  est_sans_frais: boolean
  prix_paye: number
  prix_total: number | null
  statut: string
  evenement: {
    nom: string
    date_debut: string
    date_fin: string
    lieu: string | null
    a_banquet: boolean
  } | null
}

interface BanquetAchete {
  id: string
  billet_id: string
  nom_pci: string
  prix_total: number | null
  banquets: {
    nom: string
    evenement: { nom: string } | null
  } | null
}

interface Props {
  billets: Billet[]
  banquetsAchetes: BanquetAchete[]
}

export default function MesBilletsClient({ billets, banquetsAchetes }: Props) {
  const [billetZoom, setBilletZoom] = useState<Billet | null>(null)
  const [chargementFacture, setChargementFacture] = useState<string | null>(null)

  async function telechargerFacture(id: string, type: 'billet' | 'banquet', e: React.MouseEvent) {
    e.stopPropagation()
    setChargementFacture(`${type}-${id}`)
    try {
      const res = await fetch(`/api/facture/billet?billet_id=${id}&type=${type}`)
      if (!res.ok) { alert('Erreur lors de la génération de la facture'); return }
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const lien = document.createElement('a')
      lien.href = url
      lien.download = `facture-${type}-${id.slice(0, 8)}.pdf`
      lien.click()
      URL.revokeObjectURL(url)
    } finally {
      setChargementFacture(null)
    }
  }

  if (billets.length === 0) {
    return (
      <div className="bg-white rounded-2xl shadow p-8 text-center" style={{ color: '#666666' }}>
        Aucun billet actif pour le moment.
      </div>
    )
  }

  return (
    <>
      <div className="grid gap-4">
        {billets.map(billet => {
          const banquetsDuBillet = banquetsAchetes.filter(b => b.billet_id === billet.id)
          const factureKey = `billet-${billet.id}`
          return (
            <div key={billet.id} className="bg-white rounded-2xl shadow overflow-hidden">

              {/* Carte billet cliquable pour zoom */}
              <div className="p-6 cursor-pointer transition-all hover:bg-gray-50" onClick={() => setBilletZoom(billet)}>
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <h2 className="text-lg font-bold mb-1" style={{ color: '#1A2535' }}>
                      {billet.evenement?.nom}
                    </h2>
                    <p className="text-sm mb-1" style={{ color: '#666666' }}>
                      {'📅 '}{billet.evenement && new Date(billet.evenement.date_debut).toLocaleDateString('fr-CA', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                    </p>
                    {billet.evenement?.lieu && (
                      <p className="text-sm mb-1" style={{ color: '#666666' }}>{'📍 '}{billet.evenement.lieu}</p>
                    )}
                    <p className="text-sm mb-2" style={{ color: '#666666' }}>
                      Billet pour : <strong>{billet.nom_pci}</strong>
                    </p>
                    <div className="flex gap-2 flex-wrap">
                      {billet.est_sans_frais ? (
                        <span className="px-2 py-0.5 rounded-full text-xs font-medium" style={{ backgroundColor: '#E8F5E9', color: '#4CAF7D' }}>Sans frais</span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-full text-xs font-medium" style={{ backgroundColor: '#F5F3EE', color: '#666666' }}>{(billet.prix_total ?? billet.prix_paye).toFixed(2)} $</span>
                      )}
                      {billet.statut === 'utilise' && (
                        <span className="px-2 py-0.5 rounded-full text-xs font-medium" style={{ backgroundColor: '#E3F2FD', color: '#2E86C1' }}>Scanné ✓</span>
                      )}
                    </div>
                  </div>

                  <div className="flex-shrink-0 text-center">
                    <QRCodeComponent token={billet.qr_code_token} size={120} />
                    <p className="text-xs mt-1" style={{ color: '#999999' }}>Appuyer pour agrandir</p>
                  </div>
                </div>
              </div>

              {/* Bouton facture billet payant */}
              {!billet.est_sans_frais && billet.prix_paye > 0 && (
                <div className="px-6 pb-4 pt-0">
                  <button
                    onClick={e => telechargerFacture(billet.id, 'billet', e)}
                    disabled={chargementFacture === factureKey}
                    className="text-xs font-medium px-3 py-1.5 rounded-lg transition-colors"
                    style={{ backgroundColor: '#F5F3EE', color: '#1A2535' }}
                  >
                    {chargementFacture === factureKey ? '⏳ Génération...' : '📄 Télécharger la facture'}
                  </button>
                </div>
              )}

              {/* Banquets achetés pour ce billet */}
              {banquetsDuBillet.map(banquet => (
                <div key={banquet.id} className="mx-6 mb-4 p-3 rounded-xl flex items-center justify-between" style={{ backgroundColor: '#FFFBF0', border: '1px solid #F0E0A0' }}>
                  <div>
                    <p className="text-sm font-medium" style={{ color: '#1A2535' }}>🍽️ {banquet.banquets?.nom}</p>
                    <p className="text-xs" style={{ color: '#666666' }}>{(banquet.prix_total ?? 0).toFixed(2)} $ · {banquet.nom_pci}</p>
                  </div>
                  <button
                    onClick={e => telechargerFacture(banquet.id, 'banquet', e)}
                    disabled={chargementFacture === `banquet-${banquet.id}`}
                    className="text-xs font-medium px-3 py-1.5 rounded-lg transition-colors flex-shrink-0"
                    style={{ backgroundColor: '#F5F3EE', color: '#1A2535' }}
                  >
                    {chargementFacture === `banquet-${banquet.id}` ? '⏳' : '📄 Facture'}
                  </button>
                </div>
              ))}

            </div>
          )
        })}
      </div>

      {/* Modale zoom */}
      {billetZoom && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ backgroundColor: 'rgba(0,0,0,0.7)' }} onClick={() => setBilletZoom(null)}>
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-sm p-8 flex flex-col items-center" onClick={e => e.stopPropagation()}>

            <div className="w-full text-center mb-6">
              <p className="text-xs font-bold uppercase tracking-widest mb-2" style={{ color: '#C9A84C' }}>Famille Germain – Yager Group</p>
              <h2 className="text-xl font-bold" style={{ color: '#1A2535' }}>{billetZoom.evenement?.nom}</h2>
              {billetZoom.evenement?.date_debut && (
                <p className="text-sm mt-1" style={{ color: '#666666' }}>
                  {new Date(billetZoom.evenement.date_debut).toLocaleDateString('fr-CA', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                </p>
              )}
              {billetZoom.evenement?.lieu && (
                <p className="text-sm mt-0.5" style={{ color: '#666666' }}>📍 {billetZoom.evenement.lieu}</p>
              )}
            </div>

            <div className="p-4 rounded-2xl mb-6" style={{ backgroundColor: '#F5F3EE' }}>
              <QRCodeComponent token={billetZoom.qr_code_token} size={220} />
            </div>

            <div className="w-full text-center pb-4 mb-4" style={{ borderBottom: '1px solid #E0E0E0' }}>
              <p className="text-xs uppercase tracking-wide mb-1" style={{ color: '#999999' }}>Billet au nom de</p>
              <p className="text-xl font-bold" style={{ color: '#1A2535' }}>{billetZoom.nom_pci}</p>
            </div>

            <div className="flex gap-2 mb-6">
              {billetZoom.est_sans_frais ? (
                <span className="px-3 py-1 rounded-full text-sm font-bold" style={{ backgroundColor: '#E8F5E9', color: '#4CAF7D' }}>✓ Sans frais</span>
              ) : (
                <span className="px-3 py-1 rounded-full text-sm font-medium" style={{ backgroundColor: '#F5F3EE', color: '#666666' }}>{(billetZoom.prix_total ?? billetZoom.prix_paye).toFixed(2)} $</span>
              )}
              {billetZoom.statut === 'utilise' && (
                <span className="px-3 py-1 rounded-full text-sm font-bold" style={{ backgroundColor: '#E3F2FD', color: '#2E86C1' }}>Scanné ✓</span>
              )}
            </div>

            <button onClick={() => setBilletZoom(null)} className="w-full py-3 rounded-xl text-white font-bold transition-opacity hover:opacity-90" style={{ backgroundColor: '#1A2535' }}>
              Fermer
            </button>
          </div>
        </div>
      )}
    </>
  )
}