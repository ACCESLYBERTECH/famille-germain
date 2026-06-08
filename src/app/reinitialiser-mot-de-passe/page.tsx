'use client'

import { useState } from 'react'
import { createClient } from '@/utils/supabase/client'
import { useRouter } from 'next/navigation'

export default function ReinitialiserMotDePassePage() {
  const [motDePasse, setMotDePasse] = useState('')
  const [confirmation, setConfirmation] = useState('')
  const [erreur, setErreur] = useState('')
  const [chargement, setChargement] = useState(false)
  const [succes, setSucces] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  async function handleReinitialiser() {
    setErreur('')
    if (!motDePasse || !confirmation) { setErreur('Veuillez remplir tous les champs.'); return }
    if (motDePasse.length < 8) { setErreur('Le mot de passe doit contenir au moins 8 caractères.'); return }
    if (motDePasse !== confirmation) { setErreur('Les mots de passe ne correspondent pas.'); return }

    setChargement(true)

    const { error } = await supabase.auth.updateUser({ password: motDePasse })

    if (error) {
      setErreur('Erreur lors de la réinitialisation. Le lien est peut-être expiré.')
      setChargement(false)
      return
    }

    setSucces(true)
    setChargement(false)
    setTimeout(() => router.push('/connexion'), 3000)
  }

  if (succes) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#F5F3EE' }}>
        <div className="bg-white rounded-2xl shadow-lg p-8 w-full max-w-md text-center">
          <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4" style={{ backgroundColor: '#4CAF7D' }}>
            <span className="text-white text-3xl">✓</span>
          </div>
          <h1 className="text-xl font-bold mb-2" style={{ color: '#1A2535' }}>Mot de passe modifié!</h1>
          <p className="text-sm" style={{ color: '#666666' }}>Vous allez être redirigé vers la page de connexion...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#F5F3EE' }}>
      <div className="bg-white rounded-2xl shadow-lg p-8 w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold" style={{ color: '#1A2535' }}>Nouveau mot de passe</h1>
          <p className="text-sm mt-1" style={{ color: '#666666' }}>Choisissez un nouveau mot de passe sécurisé</p>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1" style={{ color: '#1A2535' }}>Nouveau mot de passe (min. 8 caractères)</label>
            <input type="password" value={motDePasse} onChange={e => setMotDePasse(e.target.value)} className="w-full border rounded-lg px-4 py-2.5 text-sm outline-none focus:ring-2" style={{ borderColor: '#E0E0E0' }} placeholder="••••••••" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1" style={{ color: '#1A2535' }}>Confirmer le mot de passe</label>
            <input type="password" value={confirmation} onChange={e => setConfirmation(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleReinitialiser()} className="w-full border rounded-lg px-4 py-2.5 text-sm outline-none focus:ring-2" style={{ borderColor: '#E0E0E0' }} placeholder="••••••••" />
          </div>

          {erreur && <p className="text-sm text-center" style={{ color: '#E57373' }}>{erreur}</p>}

          <button onClick={handleReinitialiser} disabled={chargement} className="w-full py-3 rounded-lg text-white font-medium text-sm disabled:opacity-50" style={{ backgroundColor: '#C9A84C' }}>
            {chargement ? 'Sauvegarde...' : 'Réinitialiser mon mot de passe'}
          </button>
        </div>
      </div>
    </div>
  )
}