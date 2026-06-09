'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

interface Portier {
  id: string
  identifiant: string
  nom_affichage: string
  actif: boolean
  evenement_id: string | null
  evenement_ville_id: string | null
  evenements: { nom: string } | null
  evenement_villes: { nom_ville: string } | null
  created_at: string
}

interface Evenement {
  id: string
  nom: string
  villes: { id: string; nom_ville: string }[]
}

interface Props {
  portiers: Portier[]
  evenements: Evenement[]
}

export default function GestionPortiers({ portiers, evenements }: Props) {
  const [modalOuvert, setModalOuvert] = useState(false)
  const [modalModif, setModalModif] = useState<Portier | null>(null)
  const [chargement, setChargement] = useState(false)
  const [erreur, setErreur] = useState('')
  const router = useRouter()

  // Formulaire création
  const [formCreer, setFormCreer] = useState({
    identifiant: '',
    mot_de_passe: '',
    nom_affichage: '',
    evenement_id: '',
    evenement_ville_id: '',
  })

  // Formulaire modification
  const [formModif, setFormModif] = useState({
    nom_affichage: '',
    actif: true,
    evenement_id: '',
    evenement_ville_id: '',
    mot_de_passe: '',
  })

  const villesEvenementCreer = evenements.find(e => e.id === formCreer.evenement_id)?.villes ?? []
  const villesEvenementModif = evenements.find(e => e.id === formModif.evenement_id)?.villes ?? []

  async function creerPortier() {
    setErreur('')
    if (!formCreer.identifiant || !formCreer.mot_de_passe || !formCreer.nom_affichage) {
      setErreur('Veuillez remplir tous les champs obligatoires.'); return
    }
    if (formCreer.mot_de_passe.length < 8) {
      setErreur('Le mot de passe doit contenir au moins 8 caractères.'); return
    }
    setChargement(true)

    const res = await fetch('/api/admin/portiers', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'creer', ...formCreer }),
    })

    const data = await res.json()
    if (!res.ok) {
      setErreur(data.error)
      setChargement(false)
      return
    }

    setChargement(false)
    setModalOuvert(false)
    setFormCreer({ identifiant: '', mot_de_passe: '', nom_affichage: '', evenement_id: '', evenement_ville_id: '' })
    router.refresh()
  }

  function ouvrirModif(portier: Portier) {
    setModalModif(portier)
    setFormModif({
      nom_affichage: portier.nom_affichage,
      actif: portier.actif,
      evenement_id: portier.evenement_id ?? '',
      evenement_ville_id: portier.evenement_ville_id ?? '',
      mot_de_passe: '',
    })
    setErreur('')
  }

  async function modifierPortier() {
    if (!modalModif) return
    setChargement(true)
    setErreur('')

    const res = await fetch('/api/admin/portiers', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'modifier', id: modalModif.id, ...formModif }),
    })

    const data = await res.json()
    if (!res.ok) {
      setErreur(data.error)
      setChargement(false)
      return
    }

    setChargement(false)
    setModalModif(null)
    router.refresh()
  }

  const inputClass = "w-full border rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-yellow-400"

  return (
    <div>
      {/* Bouton créer */}
      <div className="flex justify-end mb-4">
        <button onClick={() => { setModalOuvert(true); setErreur('') }} className="px-4 py-2 rounded-lg text-sm font-medium text-white" style={{ backgroundColor: '#4CAF7D' }}>
          + Nouveau portier
        </button>
      </div>

      {/* Liste portiers */}
      <div className="bg-white rounded-2xl shadow">
        {portiers.length === 0 ? (
          <div className="p-8 text-center" style={{ color: '#666666' }}>Aucun portier créé</div>
        ) : (
          portiers.map(portier => (
            <div key={portier.id} className="p-4 border-b flex items-start justify-between gap-4" style={{ borderColor: '#E0E0E0' }}>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1 flex-wrap">
                  <p className="font-semibold font-mono" style={{ color: '#1A2535' }}>{portier.identifiant}</p>
                  <span className="px-2 py-0.5 rounded-full text-xs font-medium" style={portier.actif ? { backgroundColor: '#E8F5E9', color: '#4CAF7D' } : { backgroundColor: '#F5F5F5', color: '#999999' }}>
                    {portier.actif ? 'Actif' : 'Inactif'}
                  </span>
                </div>
                <p className="text-sm" style={{ color: '#666666' }}>{portier.nom_affichage}</p>
                {portier.evenements && (
                  <p className="text-xs mt-0.5" style={{ color: '#2E86C1' }}>
                    {portier.evenements.nom}
                    {portier.evenement_villes && ` · ${portier.evenement_villes.nom_ville}`}
                  </p>
                )}
              </div>
              <button onClick={() => ouvrirModif(portier)} className="px-3 py-1.5 rounded-lg text-xs font-medium" style={{ backgroundColor: '#F5F3EE', color: '#1A2535' }}>
                ✏️ Modifier
              </button>
            </div>
          ))
        )}
      </div>

      {/* Modal créer portier */}
      {modalOuvert && (
        <div className="fixed inset-0 flex items-center justify-center z-50 p-4" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md mx-4">
            <div className="px-6 pt-6 pb-4 border-b flex justify-between items-center" style={{ borderColor: '#E0E0E0' }}>
              <h2 className="text-lg font-bold" style={{ color: '#1A2535' }}>Nouveau portier</h2>
              <button onClick={() => setModalOuvert(false)} className="text-gray-400 hover:text-gray-600 text-xl">✕</button>
            </div>

            <div className="px-6 py-4 space-y-4">
              <div>
                <label className="block text-xs font-medium mb-1" style={{ color: '#1A2535' }}>Identifiant * (ex: PORTIER1-LONGUEUIL)</label>
                <input className={inputClass} style={{ borderColor: '#E0E0E0' }} placeholder="PORTIER1-LONGUEUIL" value={formCreer.identifiant} onChange={e => setFormCreer(f => ({ ...f, identifiant: e.target.value.toUpperCase() }))} />
                <p className="text-xs mt-1" style={{ color: '#999999' }}>Sera converti en : {formCreer.identifiant.toLowerCase().replace(/\s+/g, '-') || 'identifiant'}@acceslybertech.com</p>
              </div>
              <div>
                <label className="block text-xs font-medium mb-1" style={{ color: '#1A2535' }}>Nom d'affichage *</label>
                <input className={inputClass} style={{ borderColor: '#E0E0E0' }} placeholder="Ex: Portier Longueuil #1" value={formCreer.nom_affichage} onChange={e => setFormCreer(f => ({ ...f, nom_affichage: e.target.value }))} />
              </div>
              <div>
                <label className="block text-xs font-medium mb-1" style={{ color: '#1A2535' }}>Mot de passe * (min. 8 caractères)</label>
                <input type="password" className={inputClass} style={{ borderColor: '#E0E0E0' }} placeholder="••••••••" value={formCreer.mot_de_passe} onChange={e => setFormCreer(f => ({ ...f, mot_de_passe: e.target.value }))} />
              </div>
              <div>
                <label className="block text-xs font-medium mb-1" style={{ color: '#1A2535' }}>Événement assigné</label>
                <select className={inputClass} style={{ borderColor: '#E0E0E0' }} value={formCreer.evenement_id} onChange={e => setFormCreer(f => ({ ...f, evenement_id: e.target.value, evenement_ville_id: '' }))}>
                  <option value="">Aucun événement</option>
                  {evenements.map(ev => <option key={ev.id} value={ev.id}>{ev.nom}</option>)}
                </select>
              </div>
              {villesEvenementCreer.length > 0 && (
                <div>
                  <label className="block text-xs font-medium mb-1" style={{ color: '#1A2535' }}>Ville assignée</label>
                  <select className={inputClass} style={{ borderColor: '#E0E0E0' }} value={formCreer.evenement_ville_id} onChange={e => setFormCreer(f => ({ ...f, evenement_ville_id: e.target.value }))}>
                    <option value="">Aucune ville</option>
                    {villesEvenementCreer.map(v => <option key={v.id} value={v.id}>{v.nom_ville}</option>)}
                  </select>
                </div>
              )}
              {erreur && <p className="text-sm" style={{ color: '#E57373' }}>{erreur}</p>}
            </div>

            <div className="px-6 py-4 border-t flex justify-end gap-3" style={{ borderColor: '#E0E0E0' }}>
              <button onClick={() => setModalOuvert(false)} className="px-4 py-2 rounded-lg text-sm font-medium" style={{ color: '#666666', backgroundColor: '#F5F3EE' }}>Annuler</button>
              <button onClick={creerPortier} disabled={chargement} className="px-4 py-2 rounded-lg text-sm font-medium text-white disabled:opacity-50" style={{ backgroundColor: '#4CAF7D' }}>
                {chargement ? 'Création...' : 'Créer le portier'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal modifier portier */}
      {modalModif && (
        <div className="fixed inset-0 flex items-center justify-center z-50 p-4" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md mx-4">
            <div className="px-6 pt-6 pb-4 border-b flex justify-between items-center" style={{ borderColor: '#E0E0E0' }}>
              <h2 className="text-lg font-bold" style={{ color: '#1A2535' }}>Modifier le portier</h2>
              <button onClick={() => setModalModif(null)} className="text-gray-400 hover:text-gray-600 text-xl">✕</button>
            </div>

            <div className="px-6 py-4 space-y-4">
              <div className="rounded-lg p-3" style={{ backgroundColor: '#F5F3EE' }}>
                <p className="font-mono font-medium" style={{ color: '#1A2535' }}>{modalModif.identifiant}</p>
              </div>
              <div>
                <label className="block text-xs font-medium mb-1" style={{ color: '#1A2535' }}>Nom d'affichage</label>
                <input className={inputClass} style={{ borderColor: '#E0E0E0' }} value={formModif.nom_affichage} onChange={e => setFormModif(f => ({ ...f, nom_affichage: e.target.value }))} />
              </div>
              <div>
                <label className="block text-xs font-medium mb-1" style={{ color: '#1A2535' }}>Statut</label>
                <div className="flex gap-3">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="radio" checked={formModif.actif} onChange={() => setFormModif(f => ({ ...f, actif: true }))} />
                    <span className="text-sm" style={{ color: '#4CAF7D' }}>Actif</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="radio" checked={!formModif.actif} onChange={() => setFormModif(f => ({ ...f, actif: false }))} />
                    <span className="text-sm" style={{ color: '#E57373' }}>Inactif</span>
                  </label>
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium mb-1" style={{ color: '#1A2535' }}>Événement assigné</label>
                <select className={inputClass} style={{ borderColor: '#E0E0E0' }} value={formModif.evenement_id} onChange={e => setFormModif(f => ({ ...f, evenement_id: e.target.value, evenement_ville_id: '' }))}>
                  <option value="">Aucun événement</option>
                  {evenements.map(ev => <option key={ev.id} value={ev.id}>{ev.nom}</option>)}
                </select>
              </div>
              {villesEvenementModif.length > 0 && (
                <div>
                  <label className="block text-xs font-medium mb-1" style={{ color: '#1A2535' }}>Ville assignée</label>
                  <select className={inputClass} style={{ borderColor: '#E0E0E0' }} value={formModif.evenement_ville_id} onChange={e => setFormModif(f => ({ ...f, evenement_ville_id: e.target.value }))}>
                    <option value="">Aucune ville</option>
                    {villesEvenementModif.map(v => <option key={v.id} value={v.id}>{v.nom_ville}</option>)}
                  </select>
                </div>
              )}
              <div>
                <label className="block text-xs font-medium mb-1" style={{ color: '#1A2535' }}>Nouveau mot de passe (laisser vide pour ne pas changer)</label>
                <input type="password" className={inputClass} style={{ borderColor: '#E0E0E0' }} placeholder="••••••••" value={formModif.mot_de_passe} onChange={e => setFormModif(f => ({ ...f, mot_de_passe: e.target.value }))} />
              </div>
              {erreur && <p className="text-sm" style={{ color: '#E57373' }}>{erreur}</p>}
            </div>

            <div className="px-6 py-4 border-t flex justify-end gap-3" style={{ borderColor: '#E0E0E0' }}>
              <button onClick={() => setModalModif(null)} className="px-4 py-2 rounded-lg text-sm font-medium" style={{ color: '#666666', backgroundColor: '#F5F3EE' }}>Annuler</button>
              <button onClick={modifierPortier} disabled={chargement} className="px-4 py-2 rounded-lg text-sm font-medium text-white disabled:opacity-50" style={{ backgroundColor: '#C9A84C' }}>
                {chargement ? 'Sauvegarde...' : 'Sauvegarder'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}