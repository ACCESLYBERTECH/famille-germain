'use client'

import { useState } from 'react'

export interface Facture {
  id: string
  type: 'billet' | 'banquet'
  numero: string
  dateAchat: string
  titre: string
  dateEvenement: string | null
  pour: string
  montant: number
  rembourse: boolean
}

// Une date seule (AAAA-MM-JJ) est lue à midi pour ne pas reculer d'un jour avec le fuseau horaire
const lireDate = (d: string) => new Date(/^\d{4}-\d{2}-\d{2}$/.test(d) ? `${d}T12:00:00` : d)
const dateCourte = (d: string) => lireDate(d).toLocaleDateString('fr-CA', { year: 'numeric', month: 'long', day: 'numeric' })

export default function MesFactures({ factures }: { factures: Facture[] }) {
  const [chargement, setChargement] = useState<string | null>(null)

  async function telecharger(f: Facture) {
    setChargement(f.id)
    try {
      const res = await fetch(`/api/facture/billet?billet_id=${f.id}&type=${f.type}`)
      if (!res.ok) { alert('Erreur lors de la génération de la facture'); return }
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const lien = document.createElement('a')
      lien.href = url
      lien.download = `facture-${f.numero}.pdf`
      lien.click()
      URL.revokeObjectURL(url)
    } finally {
      setChargement(null)
    }
  }

  if (factures.length === 0) {
    return (
      <div className="bg-white rounded-2xl shadow p-8 text-center" style={{ color: '#666666' }}>
        <p className="text-3xl mb-2">🧾</p>
        <p>Aucune facture pour l&apos;instant.</p>
        <p className="text-sm mt-1" style={{ color: '#999999' }}>Les billets sans frais n&apos;ont pas de facture.</p>
      </div>
    )
  }

  // Regroupées par année d'achat
  const parAnnee = new Map<number, Facture[]>()
  for (const f of factures) {
    const annee = lireDate(f.dateAchat).getFullYear()
    if (!parAnnee.has(annee)) parAnnee.set(annee, [])
    parAnnee.get(annee)!.push(f)
  }

  return (
    <div className="space-y-6">
      {Array.from(parAnnee.entries()).map(([annee, liste]) => {
        const total = liste.filter(f => !f.rembourse).reduce((s, f) => s + f.montant, 0)
        return (
          <section key={annee}>
            <div className="flex items-baseline justify-between mb-2 px-1">
              <h2 className="text-sm font-bold uppercase tracking-widest" style={{ color: '#C9A84C' }}>{annee}</h2>
              <span className="text-xs" style={{ color: '#999999' }}>{liste.length} facture{liste.length > 1 ? 's' : ''} · {total.toFixed(2)} $</span>
            </div>
            <div className="bg-white rounded-2xl shadow overflow-hidden">
              {liste.map(f => (
                <div key={f.id} className="p-4 border-b last:border-b-0 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3" style={{ borderColor: '#E0E0E0' }}>
                  <div className="min-w-0">
                    <p className="text-xs" style={{ color: '#999999' }}>{dateCourte(f.dateAchat)} · Facture #{f.numero}</p>
                    <p className="font-semibold" style={{ color: '#1A2535' }}>
                      {f.type === 'banquet' ? '🍽️ ' : '🎫 '}{f.titre}
                    </p>
                    <p className="text-sm" style={{ color: '#666666' }}>
                      {f.type === 'banquet' ? 'Banquet pour' : 'Billet pour'} : {f.pour}
                      {f.dateEvenement && <> · événement le {dateCourte(f.dateEvenement)}</>}
                    </p>
                  </div>
                  <div className="flex items-center gap-3 sm:flex-shrink-0">
                    <span className="text-sm font-semibold" style={{ color: f.rembourse ? '#999999' : '#1A2535', textDecoration: f.rembourse ? 'line-through' : undefined }}>{f.montant.toFixed(2)} $</span>
                    {f.rembourse
                      ? <span className="px-2 py-0.5 rounded-full text-xs font-medium" style={{ backgroundColor: '#FFF3E0', color: '#E57373' }}>Remboursé</span>
                      : <span className="px-2 py-0.5 rounded-full text-xs font-medium" style={{ backgroundColor: '#E8F5E9', color: '#4CAF7D' }}>Payé</span>}
                    <button onClick={() => telecharger(f)} disabled={chargement === f.id} className="ml-auto sm:ml-0 px-3 py-2 rounded-lg text-sm font-medium disabled:opacity-50" style={{ backgroundColor: '#F5F3EE', color: '#1A2535' }}>
                      {chargement === f.id ? '⏳ ...' : '📄 PDF'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )
      })}
    </div>
  )
}
