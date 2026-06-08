'use client'

import { useState } from 'react'
import { createClient } from '@/utils/supabase/client'
import { useRouter } from 'next/navigation'
import type { Compte } from '@/lib/types'

interface Props {
  pciEnAttente: Compte[]
  pciActifs: Compte[]
}

export default function GestionPCI({ pciEnAttente, pciActifs }: Props) {
  const [onglet, setOnglet] = useState<'attente' | 'actifs'>('attente')
  const [chargement, setChargement] = useState<string | null>(null)
  const router = useRouter()
  const supabase = createClient()

  async function approuver(id: string) {
    setChargement(id)
    const debut = new Date()
    const fin = new Date(debut)
    fin.setFullYear(fin.getFullYear() + 1)

    await supabase.from('comptes').update({
      statut: 'actif',
      periode_sf_debut: debut.toISOString(),
      periode_sf_fin: fin.toISOString(),
    }).eq('id', id)

    // Récupérer les infos du PCI pour l'email
    const pci = pciEnAttente.find(p => p.id === id)
    if (pci) {
      await fetch('/api/emails/bienvenue-pci', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prenom: pci.prenom_1,
          nom: pci.nom_1,
          email: pci.courriel,
        }),
      })
    }

    setChargement(null)
    router.refresh()
  }

  async function refuser(id: string) {
    setChargement(id)
    await supabase.from('comptes').update({ statut: 'inactif' }).eq('id', id)
    setChargement(null)
    router.refresh()
  }

  const ongletClass = (actif: boolean) =>
    `px-4 py-2 text-sm font-medium rounded-t-lg transition-colors ${
      actif ? 'text-white' : 'text-gray-500 hover:text-gray-700'
    }`

  return (
    <div>
      {/* Onglets */}
      <div className="flex gap-2 mb-0">
        <button onClick={() => setOnglet('attente')} className={ongletClass(onglet === 'attente')} style={onglet === 'attente' ? { backgroundColor: '#C9A84C' } : { backgroundColor: '#E0E0E0' }}>
          En attente
          {pciEnAttente.length > 0 && (
            <span className="ml-2 px-1.5 py-0.5 rounded-full text-xs font-bold" style={{ backgroundColor: '#E57373', color: 'white' }}>
              {pciEnAttente.length}
            </span>
          )}
        </button>
        <button onClick={() => setOnglet('actifs')} className={ongletClass(onglet === 'actifs')} style={onglet === 'actifs' ? { backgroundColor: '#C9A84C' } : { backgroundColor: '#E0E0E0' }}>
          PCI actifs ({pciActifs.length})
        </button>
      </div>

      {/* Contenu */}
      <div className="bg-white rounded-b-2xl rounded-tr-2xl shadow">

        {/* EN ATTENTE */}
        {onglet === 'attente' && (
          <div>
            {pciEnAttente.length === 0 ? (
              <div className="p-8 text-center" style={{ color: '#666666' }}>
                Aucune demande en attente ✓
              </div>
            ) : (
              pciEnAttente.map(pci => (
                <div key={pci.id} className="p-4 border-b flex items-start justify-between gap-4" style={{ borderColor: '#E0E0E0' }}>
                  <div className="flex-1">
                    <p className="font-semibold" style={{ color: '#1A2535' }}>
                      {pci.prenom_1} {pci.nom_1}
                      {pci.prenom_2 && (
                        <span className="text-sm font-normal ml-2" style={{ color: '#666666' }}>
                          + {pci.prenom_2} {pci.nom_2}
                        </span>
                      )}
                    </p>
                    <p className="text-sm" style={{ color: '#666666' }}>{pci.courriel}</p>
                    <p className="text-sm" style={{ color: '#666666' }}>
                      {pci.ville}, {pci.province} · #{pci.numero_amway}
                    </p>
                    <p className="text-xs mt-1" style={{ color: '#999999' }}>
                      Inscrit le {new Date(pci.created_at).toLocaleDateString('fr-CA')}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => approuver(pci.id)} disabled={chargement === pci.id} className="px-4 py-2 rounded-lg text-sm font-medium text-white disabled:opacity-50" style={{ backgroundColor: '#4CAF7D' }}>
                      {chargement === pci.id ? '...' : 'Approuver'}
                    </button>
                    <button onClick={() => refuser(pci.id)} disabled={chargement === pci.id} className="px-4 py-2 rounded-lg text-sm font-medium text-white disabled:opacity-50" style={{ backgroundColor: '#E57373' }}>
                      Refuser
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* ACTIFS */}
        {onglet === 'actifs' && (
          <div>
            {pciActifs.length === 0 ? (
              <div className="p-8 text-center" style={{ color: '#666666' }}>
                Aucun PCI actif
              </div>
            ) : (
              pciActifs.map(pci => (
                <div key={pci.id} className="p-4 border-b flex items-start justify-between gap-4" style={{ borderColor: '#E0E0E0' }}>
                  <div className="flex-1">
                    <p className="font-semibold" style={{ color: '#1A2535' }}>
                      {pci.prenom_1} {pci.nom_1}
                      {pci.prenom_2 && (
                        <span className="text-sm font-normal ml-2" style={{ color: '#666666' }}>
                          + {pci.prenom_2} {pci.nom_2}
                        </span>
                      )}
                    </p>
                    <p className="text-sm" style={{ color: '#666666' }}>{pci.courriel}</p>
                    <p className="text-sm" style={{ color: '#666666' }}>
                      {pci.ville}, {pci.province} · #{pci.numero_amway}
                    </p>
                    <p className="text-xs mt-1" style={{ color: '#4CAF7D' }}>
                      Sans frais jusqu'au {pci.periode_sf_fin
                        ? new Date(pci.periode_sf_fin).toLocaleDateString('fr-CA')
                        : 'N/A'}
                    </p>
                  </div>
                  <span className="px-3 py-1 rounded-full text-xs font-medium" style={{ backgroundColor: '#E8F5E9', color: '#4CAF7D' }}>
                    Actif
                  </span>
                </div>
              ))
            )}
          </div>
        )}

      </div>
    </div>
  )
}