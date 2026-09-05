'use client'

import { useState, useMemo } from 'react'

interface Palier { id: string; prix: number; date_fin: string; ordre: number }
interface Ville { id: string; nom_ville: string }

interface Evenement {
  id: string
  nom: string
  description: string | null
  date_debut: string
  lieu: string | null
  paliers: Palier[]
  villes: Ville[]
}

interface Campagne {
  id: string
  evenement_nom: string
  sujet: string
  nombre_destinataires: number
  created_at: string
}

interface Props {
  evenements: Evenement[]
  nombreDestinataires: number
  campagnes: Campagne[]
}

export default function GestionMarketing({ evenements, nombreDestinataires, campagnes }: Props) {
  const [evenementId, setEvenementId] = useState('')
  const [sujet, setSujet] = useState('')
  const [imageUrl, setImageUrl] = useState('')
  const [chargementTest, setChargementTest] = useState(false)
  const [chargementEnvoi, setChargementEnvoi] = useState(false)
  const [message, setMessage] = useState<{ type: 'succes' | 'erreur'; texte: string } | null>(null)

  const evenement = useMemo(() => evenements.find(e => e.id === evenementId) ?? null, [evenements, evenementId])

  const prixActuel = useMemo(() => {
    if (!evenement || evenement.paliers.length === 0) return null
    const maintenant = new Date()
    const paliersTries = [...evenement.paliers].sort((a, b) => a.ordre - b.ordre)
    const palierActuel = paliersTries.find(p => new Date(p.date_fin) > maintenant)
    return palierActuel ? palierActuel.prix : paliersTries[paliersTries.length - 1].prix
  }, [evenement])

  function choisirEvenement(id: string) {
    setEvenementId(id)
    setMessage(null)
    const ev = evenements.find(e => e.id === id)
    setSujet(ev ? `🎉 ${ev.nom} arrive bientôt !` : '')
  }

  async function envoyerTest() {
    if (!evenementId || !sujet) return
    setMessage(null)
    setChargementTest(true)
    const res = await fetch('/api/admin/marketing/test', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ evenementId, sujet, imageUrl }),
    })
    const data = await res.json()
    setChargementTest(false)
    if (!res.ok) {
      setMessage({ type: 'erreur', texte: data.error ?? "Erreur lors de l'envoi du test." })
      return
    }
    setMessage({ type: 'succes', texte: 'Courriel de test envoyé à votre propre adresse.' })
  }

  async function envoyerATous() {
    if (!evenementId || !sujet) return
    const confirmation = window.confirm(
      `Envoyer ce courriel à environ ${nombreDestinataires} PCI/leaders actifs ? Cette action est irréversible.`
    )
    if (!confirmation) return

    setMessage(null)
    setChargementEnvoi(true)
    const res = await fetch('/api/admin/marketing/envoyer', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ evenementId, sujet, imageUrl }),
    })
    const data = await res.json()
    setChargementEnvoi(false)
    if (!res.ok) {
      setMessage({ type: 'erreur', texte: data.error ?? "Erreur lors de l'envoi." })
      return
    }
    setMessage({ type: 'succes', texte: `Envoyé avec succès à ${data.nombre} destinataires.` })
    setImageUrl('')
    window.location.reload()
  }

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-2xl shadow p-6">
        <h2 className="font-semibold mb-4" style={{ color: '#1A2535' }}>Composer une promotion</h2>

        <label className="block text-sm font-medium mb-1" style={{ color: '#1A2535' }}>Événement</label>
        <select
          value={evenementId}
          onChange={e => choisirEvenement(e.target.value)}
          className="w-full p-2.5 rounded-lg border mb-4"
          style={{ borderColor: '#E0E0E0' }}
        >
          <option value="">— Choisir un événement —</option>
          {evenements.map(ev => (
            <option key={ev.id} value={ev.id}>
              {ev.nom} ({new Date(ev.date_debut).toLocaleDateString('fr-CA')})
            </option>
          ))}
        </select>

        {evenement && (
          <div className="rounded-xl p-4 mb-4" style={{ backgroundColor: '#F5F3EE' }}>
            <p className="text-sm" style={{ color: '#666666' }}>
              📅 {new Date(evenement.date_debut).toLocaleDateString('fr-CA', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
              {evenement.lieu && ` · 📍 ${evenement.lieu}`}
            </p>
            {evenement.villes.length > 0 && (
              <p className="text-sm mt-1" style={{ color: '#666666' }}>🏙️ {evenement.villes.map(v => v.nom_ville).join(' · ')}</p>
            )}
            {prixActuel !== null && (
              <p className="text-sm mt-1 font-medium" style={{ color: '#C9A84C' }}>💰 À partir de {prixActuel.toFixed(2)} $</p>
            )}
          </div>
        )}

        <label className="block text-sm font-medium mb-1" style={{ color: '#1A2535' }}>Sujet du courriel</label>
        <input
          type="text"
          value={sujet}
          onChange={e => setSujet(e.target.value)}
          className="w-full p-2.5 rounded-lg border mb-4"
          style={{ borderColor: '#E0E0E0' }}
          placeholder="Sujet du courriel"
        />

        <label className="block text-sm font-medium mb-1" style={{ color: '#1A2535' }}>Image bannière (URL, optionnel)</label>
        <input
          type="text"
          value={imageUrl}
          onChange={e => setImageUrl(e.target.value)}
          className="w-full p-2.5 rounded-lg border mb-4"
          style={{ borderColor: '#E0E0E0' }}
          placeholder="https://..."
        />

        {message && (
          <div
            className="rounded-lg p-3 mb-4 text-sm"
            style={{
              backgroundColor: message.type === 'succes' ? '#E8F5E9' : '#FDECEA',
              color: message.type === 'succes' ? '#4CAF7D' : '#E57373',
            }}
          >
            {message.texte}
          </div>
        )}

        <div className="flex flex-wrap gap-3">
          <button
            onClick={envoyerTest}
            disabled={!evenementId || !sujet || chargementTest || chargementEnvoi}
            className="px-4 py-2.5 rounded-lg text-sm font-medium disabled:opacity-50"
            style={{ backgroundColor: '#E3F2FD', color: '#2E86C1' }}
          >
            {chargementTest ? 'Envoi du test...' : 'Envoyer un test à moi-même'}
          </button>
          <button
            onClick={envoyerATous}
            disabled={!evenementId || !sujet || chargementTest || chargementEnvoi}
            className="px-4 py-2.5 rounded-lg text-sm font-medium text-white disabled:opacity-50"
            style={{ backgroundColor: '#C9A84C' }}
          >
            {chargementEnvoi ? 'Envoi en cours...' : `Envoyer à tous (~${nombreDestinataires} PCI/leaders)`}
          </button>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow">
        <div className="p-4 border-b" style={{ borderColor: '#E0E0E0' }}>
          <h2 className="font-semibold" style={{ color: '#1A2535' }}>Historique des envois</h2>
        </div>
        {campagnes.length === 0 ? (
          <div className="p-8 text-center" style={{ color: '#666666' }}>Aucun envoi pour l'instant.</div>
        ) : (
          campagnes.map(c => (
            <div key={c.id} className="p-4 border-b flex items-center justify-between gap-4" style={{ borderColor: '#E0E0E0' }}>
              <div>
                <p className="font-medium" style={{ color: '#1A2535' }}>{c.evenement_nom}</p>
                <p className="text-sm" style={{ color: '#666666' }}>{c.sujet}</p>
              </div>
              <div className="text-right flex-shrink-0">
                <p className="text-sm font-medium" style={{ color: '#1A2535' }}>{c.nombre_destinataires} destinataires</p>
                <p className="text-xs" style={{ color: '#999999' }}>
                  {new Date(c.created_at).toLocaleDateString('fr-CA', { year: 'numeric', month: 'long', day: 'numeric' })} à {new Date(c.created_at).toLocaleTimeString('fr-CA', { hour: '2-digit', minute: '2-digit' })}
                </p>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}