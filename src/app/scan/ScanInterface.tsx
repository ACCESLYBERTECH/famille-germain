'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/utils/supabase/client'
import type { Compte } from '@/lib/types'

interface Props {
  compte: Compte
  evenement: any
  ville: any
  evenements: any[] | null
}

type ResultatScan = {
  type: 'succes' | 'erreur' | 'deja_scanne' | 'annule'
  message: string
  sousTitre?: string
  couleur: string
}

export default function ScanInterface({ compte, evenement, ville, evenements }: Props) {
  const [token, setToken] = useState('')
  const [recherche, setRecherche] = useState('')
  const [resultat, setResultat] = useState<ResultatScan | null>(null)
  const [chargement, setChargement] = useState(false)
  const [evenementChoisi, setEvenementChoisi] = useState(evenement?.id ?? '')
  const [villeChoisie, setVilleChoisie] = useState(ville?.id ?? '')
  const [billetsRecherche, setBilletsRecherche] = useState<any[]>([])
  const [statsVilles, setStatsVilles] = useState<{ nom: string; count: number }[]>([])
  const supabase = createClient()

  const evenementActif = evenement ?? evenements?.find(e => e.id === evenementChoisi)
  const villeActive = ville ?? evenementActif?.villes?.find((v: any) => v.id === villeChoisie)

  // Charger stats par ville (admin seulement)
  useEffect(() => {
    if (compte.role !== 'admin') return
    if (!evenementActif?.id) return
    chargerStats()
  }, [evenementChoisi, resultat])

  async function chargerStats() {
    if (!evenementActif?.id) return

    const { data: billets } = await supabase
      .from('billets')
      .select('scanne_ville_id, evenement_villes(nom_ville)')
      .eq('evenement_id', evenementActif.id)
      .eq('statut', 'utilise')

    if (!billets) return

    const stats: Record<string, { nom: string; count: number }> = {}

    // Initialiser toutes les villes à 0
    evenementActif.villes?.forEach((v: any) => {
      stats[v.id] = { nom: v.nom_ville, count: 0 }
    })
    stats['sans_ville'] = { nom: 'Non assigné', count: 0 }

    billets.forEach((b: any) => {
      if (b.scanne_ville_id && stats[b.scanne_ville_id]) {
        stats[b.scanne_ville_id].count++
      } else {
        stats['sans_ville'].count++
      }
    })

    const result = Object.values(stats).filter(s => s.nom !== 'Non assigné' || s.count > 0)
    setStatsVilles(result)
  }

  async function scanner(tokenScan: string) {
    if (!tokenScan.trim()) return
    setChargement(true)
    setResultat(null)
    setBilletsRecherche([])

    const res = await fetch('/api/scan', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        token: tokenScan.trim(),
        evenement_id: evenementActif?.id ?? null,
        ville_id: villeActive?.id ?? villeChoisie ?? null,
      }),
    })

    const data = await res.json()

    const couleurs: Record<string, string> = {
      succes: '#4CAF7D',
      deja_scanne: '#FF9800',
      invalide: '#E57373',
      annule: '#E57373',
    }

    setResultat({
      type: data.resultat === 'succes' ? 'succes' : data.resultat === 'deja_scanne' ? 'deja_scanne' : 'erreur',
      message: data.message,
      sousTitre: data.sousTitre,
      couleur: couleurs[data.resultat] ?? '#E57373',
    })

    setToken('')
    setChargement(false)
  }

  async function rechercherManuel() {
    if (!recherche.trim()) return
    setChargement(true)
    setResultat(null)
    setBilletsRecherche([])

    const termes = recherche.trim().toLowerCase()
    const { data: billets } = await supabase
      .from('billets')
      .select('*, evenement:evenements(*)')
      .eq('evenement_id', evenementActif?.id)
      .neq('statut', 'rembourse')

    const trouves = billets?.filter(b =>
      b.nom_pci.toLowerCase().includes(termes)
    ) ?? []

    if (trouves.length === 0) {
      setResultat({ type: 'erreur', message: '❌ Aucun billet trouvé', couleur: '#E57373' })
    } else {
      setBilletsRecherche(trouves)
    }
    setChargement(false)
  }

  async function confirmerScan(billet: any) {
    setBilletsRecherche([])
    await scanner(billet.qr_code_token)
  }

  return (
    <div className="space-y-4">

      {/* Sélection événement (admin seulement) */}
      {compte.role === 'admin' && evenements && (
        <div className="bg-white rounded-2xl shadow p-4 space-y-3">
          <div>
            <label className="block text-sm font-medium mb-1" style={{ color: '#1A2535' }}>Événement</label>
            <select className="w-full border rounded-lg px-4 py-2.5 text-sm outline-none" style={{ borderColor: '#E0E0E0' }} value={evenementChoisi} onChange={e => { setEvenementChoisi(e.target.value); setVilleChoisie('') }}>
              <option value="">Sélectionner...</option>
              {evenements.map(ev => <option key={ev.id} value={ev.id}>{ev.nom}</option>)}
            </select>
          </div>
          {evenementActif?.villes?.length > 0 && (
            <div>
              <label className="block text-sm font-medium mb-1" style={{ color: '#1A2535' }}>Ville</label>
              <select className="w-full border rounded-lg px-4 py-2.5 text-sm outline-none" style={{ borderColor: '#E0E0E0' }} value={villeChoisie} onChange={e => setVilleChoisie(e.target.value)}>
                <option value="">Toutes les villes</option>
                {evenementActif.villes.map((v: any) => <option key={v.id} value={v.id}>{v.nom_ville}</option>)}
              </select>
            </div>
          )}
        </div>
      )}

      {/* Stats par ville (admin seulement) */}
      {compte.role === 'admin' && statsVilles.length > 0 && (
        <div className="bg-white rounded-2xl shadow p-4">
          <p className="text-xs font-bold uppercase tracking-wide mb-3" style={{ color: '#C9A84C' }}>Scans par ville</p>
          <div className="space-y-2">
            {statsVilles.map(stat => (
              <div key={stat.nom} className="flex justify-between items-center">
                <span className="text-sm" style={{ color: '#1A2535' }}>{stat.nom}</span>
                <span className="px-2 py-0.5 rounded-full text-xs font-bold" style={{ backgroundColor: '#E8F5E9', color: '#4CAF7D' }}>
                  {stat.count} scan{stat.count !== 1 ? 's' : ''}
                </span>
              </div>
            ))}
            <div className="flex justify-between items-center pt-2 border-t" style={{ borderColor: '#E0E0E0' }}>
              <span className="text-sm font-bold" style={{ color: '#1A2535' }}>Total</span>
              <span className="px-2 py-0.5 rounded-full text-xs font-bold" style={{ backgroundColor: '#E3F2FD', color: '#2E86C1' }}>
                {statsVilles.reduce((acc, s) => acc + s.count, 0)} scans
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Résultat du scan */}
      {resultat && (
        <div className="rounded-2xl p-6 text-center" style={{ backgroundColor: resultat.couleur }}>
          <p className="text-white font-bold text-lg">{resultat.message}</p>
          {resultat.sousTitre && <p className="text-white text-sm mt-1 opacity-90">{resultat.sousTitre}</p>}
        </div>
      )}

      {/* Résultats de recherche */}
      {billetsRecherche.length > 0 && (
        <div className="bg-white rounded-2xl shadow p-4">
          <p className="text-sm font-medium mb-3" style={{ color: '#1A2535' }}>
            {billetsRecherche.length} résultat(s) — Confirmez le bon billet :
          </p>
          <div className="space-y-2">
            {billetsRecherche.map(b => (
              <div key={b.id} className="flex items-center justify-between p-3 rounded-lg border" style={{ borderColor: '#E0E0E0' }}>
                <div>
                  <p className="font-medium text-sm" style={{ color: '#1A2535' }}>{b.nom_pci}</p>
                  <p className="text-xs" style={{ color: b.statut === 'utilise' ? '#FF9800' : '#4CAF7D' }}>
                    {b.statut === 'utilise' ? 'Déjà scanné' : 'Valide'}
                  </p>
                </div>
                <button onClick={() => confirmerScan(b)} disabled={chargement} className="px-4 py-2 rounded-lg text-white text-sm font-medium disabled:opacity-50" style={{ backgroundColor: b.statut === 'utilise' ? '#FF9800' : '#4CAF7D' }}>
                  Confirmer
                </button>
              </div>
            ))}
          </div>
          <button onClick={() => setBilletsRecherche([])} className="mt-3 text-sm w-full text-center" style={{ color: '#666666' }}>
            Annuler
          </button>
        </div>
      )}

      {/* Scan QR */}
      <div className="bg-white rounded-2xl shadow p-4">
        <label className="block text-sm font-medium mb-2" style={{ color: '#1A2535' }}>Scanner un QR code</label>
        <div className="flex gap-2">
          <input className="flex-1 border rounded-lg px-4 py-2.5 text-sm outline-none" style={{ borderColor: '#E0E0E0' }} placeholder="Token du billet..." value={token} onChange={e => setToken(e.target.value)} onKeyDown={e => e.key === 'Enter' && scanner(token)} autoFocus />
          <button onClick={() => scanner(token)} disabled={chargement || !token.trim()} className="px-4 py-2.5 rounded-lg text-white font-medium text-sm disabled:opacity-50" style={{ backgroundColor: '#C9A84C' }}>
            {chargement ? '...' : 'Scanner'}
          </button>
        </div>
        <p className="text-xs mt-2" style={{ color: '#999999' }}>Pointez un lecteur QR ou entrez le token manuellement.</p>
      </div>

      {/* Recherche manuelle */}
      <div className="bg-white rounded-2xl shadow p-4">
        <label className="block text-sm font-medium mb-2" style={{ color: '#1A2535' }}>Recherche manuelle (nom)</label>
        <div className="flex gap-2">
          <input className="flex-1 border rounded-lg px-4 py-2.5 text-sm outline-none" style={{ borderColor: '#E0E0E0' }} placeholder="Prénom ou nom du PCI..." value={recherche} onChange={e => setRecherche(e.target.value)} onKeyDown={e => e.key === 'Enter' && rechercherManuel()} />
          <button onClick={rechercherManuel} disabled={chargement || !recherche.trim()} className="px-4 py-2.5 rounded-lg text-white font-medium text-sm disabled:opacity-50" style={{ backgroundColor: '#2E86C1' }}>
            Chercher
          </button>
        </div>
      </div>

    </div>
  )
}