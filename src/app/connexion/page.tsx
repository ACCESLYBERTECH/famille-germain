'use client'

import { useState } from 'react'
import { createClient } from '@/utils/supabase/client'
import { useRouter } from 'next/navigation'

export default function ConnexionPage() {
  const [identifiant, setIdentifiant] = useState('')
  const [motDePasse, setMotDePasse] = useState('')
  const [erreur, setErreur] = useState('')
  const [chargement, setChargement] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  async function handleConnexion() {
    setChargement(true)
    setErreur('')

    let courriel = identifiant.trim()

    // Si pas de @, c'est peut-être un identifiant portier
    if (!courriel.includes('@')) {
      const res = await fetch('/api/auth/resoudre-identifiant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifiant: courriel }),
      })

      const data = await res.json()

      if (!res.ok) {
        setErreur(data.error ?? 'Identifiant introuvable.')
        setChargement(false)
        return
      }

      courriel = data.courriel
    }

    const { error } = await supabase.auth.signInWithPassword({
      email: courriel,
      password: motDePasse,
    })

    if (error) {
      setErreur('Identifiant ou mot de passe incorrect.')
      setChargement(false)
      return
    }

    router.push('/')
    router.refresh()
  }

  return (
    <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#F5F3EE' }}>
      <div className="bg-white rounded-2xl shadow-lg p-8 w-full max-w-md">

        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold" style={{ color: '#1A2535' }}>Famille Germain</h1>
          <p className="text-sm mt-1" style={{ color: '#666666' }}>Yager Group — Espace membres</p>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1" style={{ color: '#1A2535' }}>Courriel ou identifiant</label>
            <input type="text" value={identifiant} onChange={e => setIdentifiant(e.target.value)} className="w-full border rounded-lg px-4 py-2.5 text-sm outline-none focus:ring-2" style={{ borderColor: '#E0E0E0' }} placeholder="votre@courriel.com ou PORTIER1-LONGUEUIL" />
          </div>

          <div>
            <div className="flex justify-between items-center mb-1">
              <label className="block text-sm font-medium" style={{ color: '#1A2535' }}>Mot de passe</label>
              <a href="/mot-de-passe-oublie" className="text-xs hover:underline" style={{ color: '#2E86C1' }}>Mot de passe oublié?</a>
            </div>
            <input type="password" value={motDePasse} onChange={e => setMotDePasse(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleConnexion()} className="w-full border rounded-lg px-4 py-2.5 text-sm outline-none focus:ring-2" style={{ borderColor: '#E0E0E0' }} placeholder="••••••••" />
          </div>

          {erreur && <p className="text-sm text-center" style={{ color: '#E57373' }}>{erreur}</p>}

          <button onClick={handleConnexion} disabled={chargement} className="w-full py-3 rounded-lg text-white font-medium text-sm transition-opacity hover:opacity-90 disabled:opacity-50" style={{ backgroundColor: '#C9A84C' }}>
            {chargement ? 'Connexion...' : 'Se connecter'}
          </button>

          <p className="text-center text-sm" style={{ color: '#666666' }}>
            Pas encore de compte ?{' '}
            <a href="/inscription" style={{ color: '#2E86C1' }} className="font-medium hover:underline">Créer un compte</a>
          </p>
        </div>

      </div>
    </div>
  )
}