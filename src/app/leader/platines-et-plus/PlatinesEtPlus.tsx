'use client'

import { useState } from 'react'

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

interface Props {
  pcis: PCI[]
  billets: Billet[]
}

export default function PlatinesEtPlus({ pcis, billets }: Props) {
  const [onglet, setOnglet] = useState<'billets' | 'profils'>('billets')
  const [recherche, setRecherche] = useState('')
  const [profilOuvert, setProfilOuvert] = useState<PCI | null>(null)

  const billetsFiltres = billets.filter(b =>
    recherche.length < 2 ? true :
    b.nom_pci.toLowerCase().includes(recherche.toLowerCase()) ||
    pcis.find(p => p.id === b.compte_id && (
      `${p.prenom_1} ${p.nom_1}`.toLowerCase().includes(recherche.toLowerCase()) ||
      p.courriel.toLowerCase().includes(recherche.toLowerCase())
    ))
  )

  const pcisFiltres = pcis.filter(p =>
    recherche.length < 2 ? true :
    `${p.prenom_1} ${p.nom_1}`.toLowerCase().includes(recherche.toLowerCase()) ||
    p.courriel.toLowerCase().includes(recherche.toLowerCase())
  )

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

  return (
    <div>
      {/* Stats rapides */}
      <div className="grid grid-cols-3 gap-4 mb-6">
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

      {/* Onglets */}
      <div className="flex gap-2 mb-0">
        <button onClick={() => setOnglet('billets')} className={ongletClass(onglet === 'billets')} style={onglet === 'billets' ? { backgroundColor: '#C9A84C' } : { backgroundColor: '#E0E0E0' }}>
          Billets ({billets.length})
        </button>
        <button onClick={() => setOnglet('profils')} className={ongletClass(onglet === 'profils')} style={onglet === 'profils' ? { backgroundColor: '#C9A84C' } : { backgroundColor: '#E0E0E0' }}>
          Profils PCI ({pcis.length})
        </button>
      </div>

      {/* Recherche */}
      <div className="bg-white rounded-b-2xl rounded-tr-2xl shadow">
        <div className="p-4 border-b" style={{ borderColor: '#E0E0E0' }}>
          <input className="w-full border rounded-lg px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-yellow-400" style={{ borderColor: '#E0E0E0' }} placeholder="Rechercher par nom ou courriel..." value={recherche} onChange={e => setRecherche(e.target.value)} />
        </div>

        {/* ONGLET BILLETS */}
        {onglet === 'billets' && (
          <div>
            {billetsFiltres.length === 0 ? (
              <div className="p-8 text-center" style={{ color: '#666666' }}>Aucun billet trouvé</div>
            ) : (
              billetsFiltres.map(billet => {
                const pci = pcis.find(p => p.id === billet.compte_id)
                return (
                  <div key={billet.id} className="p-4 border-b flex items-start justify-between gap-4" style={{ borderColor: '#E0E0E0' }}>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <p className="font-semibold" style={{ color: '#1A2535' }}>{billet.nom_pci}</p>
                        <span className="px-2 py-0.5 rounded-full text-xs font-medium" style={statutBilletStyle(billet.statut)}>
                          {statutBilletLabel(billet.statut)}
                        </span>
                        {billet.est_sans_frais && (
                          <span className="px-2 py-0.5 rounded-full text-xs font-medium" style={{ backgroundColor: '#E8F5E9', color: '#4CAF7D' }}>Sans frais</span>
                        )}
                        {billet.prix_paye === 0 && !billet.est_sans_frais && (
                          <span className="px-2 py-0.5 rounded-full text-xs font-medium" style={{ backgroundColor: '#F3E5F5', color: '#9C27B0' }}>Billet offert</span>
                        )}
                      </div>
                      <p className="text-sm" style={{ color: '#666666' }}>{billet.evenements?.nom}</p>
                      <p className="text-xs mt-1" style={{ color: '#999999' }}>
                        {billet.evenements?.date_debut && new Date(billet.evenements.date_debut).toLocaleDateString('fr-CA')}
                      </p>
                    </div>
                    {pci && (
                      <button onClick={() => setProfilOuvert(pci)} className="px-3 py-1.5 rounded-lg text-xs font-medium" style={{ backgroundColor: '#E3F2FD', color: '#2E86C1' }}>
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
              pcisFiltres.map(pci => (
                <div key={pci.id} className="p-4 border-b flex items-start justify-between gap-4" style={{ borderColor: '#E0E0E0' }}>
                  <div className="flex-1">
                    <p className="font-semibold" style={{ color: '#1A2535' }}>
                      {pci.prenom_1} {pci.nom_1}
                      {pci.prenom_2 && <span className="text-sm font-normal ml-2" style={{ color: '#666666' }}>+ {pci.prenom_2} {pci.nom_2}</span>}
                    </p>
                    <p className="text-sm" style={{ color: '#666666' }}>{pci.courriel}</p>
                    <p className="text-sm" style={{ color: '#666666' }}>{pci.ville}, {pci.province}</p>
                    <p className="text-xs mt-1" style={{ color: '#4CAF7D' }}>
                      Sans frais jusqu'au {pci.periode_sf_fin ? new Date(pci.periode_sf_fin).toLocaleDateString('fr-CA') : 'N/A'}
                    </p>
                  </div>
                  <button onClick={() => setProfilOuvert(pci)} className="px-3 py-1.5 rounded-lg text-xs font-medium" style={{ backgroundColor: '#E3F2FD', color: '#2E86C1' }}>
                    ℹ️ Profil
                  </button>
                </div>
              ))
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
                  <span style={{ color: '#666666' }}>Sans frais jusqu'au</span>
                  <span style={{ color: '#4CAF7D' }}>{profilOuvert.periode_sf_fin ? new Date(profilOuvert.periode_sf_fin).toLocaleDateString('fr-CA') : 'N/A'}</span>
                </div>
                <div className="flex justify-between">
                  <span style={{ color: '#666666' }}>Billets</span>
                  <span style={{ color: '#1A2535' }}>{billets.filter(b => b.compte_id === profilOuvert.id).length} billet(s)</span>
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