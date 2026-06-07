'use client'

import { useState } from 'react'
import { createClient } from '@/utils/supabase/client'
import { useRouter } from 'next/navigation'

export default function ConnexionPage() {
  const [courriel, setCourriel] = useState('')
  const [motDePasse, setMotDePasse] = useState('')
  const [erreur, setErreur] = useState('')
  const [chargement, setChargement] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  async function handleConnexion() {
    setChargement(true)
    setErreur('')

    const { error } = await supabase.auth.signInWithPassword({
      email: courriel,
      password: motDePasse,
    })

    if (error) {
      setErreur('Courriel ou mot de passe incorrect.')
      setChargement(false)
      return
    }

    router.push('/')
    router.refresh()
  }

  return (
    <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#F5F3EE' }}>
      <div className="bg-white rounded-2xl shadow-lg p-8 w-full max-w-md">

        {/* Logo / Titre */}
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold" style={{ color: '#1A2535' }}>
            Famille Germain
          </h1>
          <p className="text-sm mt-1" style={{ color: '#666666' }}>
            Yager Group — Espace membres
          </p>
        </div>

        {/* Formulaire */}
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1" style={{ color: '#1A2535' }}>
              Courriel
            </label>
            <input
              type="email"
              value={courriel}
              onChange={e => setCourriel(e.target.value)}
              className="w-full border rounded-lg px-4 py-2.5 text-sm outline-none focus:ring-2"
              style={{ borderColor: '#E0E0E0' }}
              placeholder="votre@courriel.com"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1" style={{ color: '#1A2535' }}>
              Mot de passe
            </label>
            <input
              type="password"
              value={motDePasse}
              onChange={e => setMotDePasse(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleConnexion()}
              className="w-full border rounded-lg px-4 py-2.5 text-sm outline-none focus:ring-2"
              style={{ borderColor: '#E0E0E0' }}
              placeholder="••••••••"
            />
          </div>

          {erreur && (
            <p className="text-sm text-center" style={{ color: '#E57373' }}>
              {erreur}
            </p>
          )}

          <button
            onClick={handleConnexion}
            disabled={chargement}
            className="w-full py-3 rounded-lg text-white font-medium text-sm transition-opacity hover:opacity-90 disabled:opacity-50"
            style={{ backgroundColor: '#C9A84C' }}
          >
            {chargement ? 'Connexion...' : 'Se connecter'}
          </button>

          <p className="text-center text-sm" style={{ color: '#666666' }}>
            Pas encore de compte ?{' '}
            <a href="/inscription" style={{ color: '#2E86C1' }} className="font-medium hover:underline">
              Créer un compte
            </a>
          </p>
        </div>

      </div>
    </div>
  )
}