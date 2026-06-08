'use client'

import { useState } from 'react'
import { createClient } from '@/utils/supabase/client'

export default function MotDePasseOubliePage() {
  const [courriel, setCourriel] = useState('')
  const [envoye, setEnvoye] = useState(false)
  const [chargement, setChargement] = useState(false)
  const [erreur, setErreur] = useState('')
  const supabase = createClient()

  async function handleEnvoyer() {
    if (!courriel) { setErreur('Veuillez entrer votre courriel.'); return }
    setChargement(true)
    setErreur('')

    const { error } = await supabase.auth.resetPasswordForEmail(courriel, {
      redirectTo: `${window.location.origin}/reinitialiser-mot-de-passe`,
    })

    if (error) {
      setErreur('Erreur lors de l\'envoi. Vérifiez votre courriel.')
      setChargement(false)
      return
    }

    setEnvoye(true)
    setChargement(false)
  }

  if (envoye) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#F5F3EE' }}>
        <div className="bg-white rounded-2xl shadow-lg p-8 w-full max-w-md text-center">
          <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4" style={{ backgroundColor: '#4CAF7D' }}>
            <span className="text-white text-3xl">✓</span>
          </div>
          <h1 className="text-xl font-bold mb-2" style={{ color: '#1A2535' }}>Courriel envoyé!</h1>
          <p className="text-sm mb-6" style={{ color: '#666666' }}>
            Si un compte existe avec cette adresse, vous recevrez un lien pour réinitialiser votre mot de passe.
          </p>
          <a href="/connexion" className="inline-block px-6 py-3 rounded-lg text-white font-medium text-sm" style={{ backgroundColor: '#C9A84C' }}>
            Retour à la connexion
          </a>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#F5F3EE' }}>
      <div className="bg-white rounded-2xl shadow-lg p-8 w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold" style={{ color: '#1A2535' }}>Mot de passe oublié</h1>
          <p className="text-sm mt-1" style={{ color: '#666666' }}>Entrez votre courriel pour recevoir un lien de réinitialisation</p>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1" style={{ color: '#1A2535' }}>Courriel</label>
            <input type="email" value={courriel} onChange={e => setCourriel(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleEnvoyer()} className="w-full border rounded-lg px-4 py-2.5 text-sm outline-none focus:ring-2" style={{ borderColor: '#E0E0E0' }} placeholder="votre@courriel.com" />
          </div>

          {erreur && <p className="text-sm text-center" style={{ color: '#E57373' }}>{erreur}</p>}

          <button onClick={handleEnvoyer} disabled={chargement} className="w-full py-3 rounded-lg text-white font-medium text-sm disabled:opacity-50" style={{ backgroundColor: '#C9A84C' }}>
            {chargement ? 'Envoi...' : 'Envoyer le lien'}
          </button>

          <p className="text-center text-sm">
            <a href="/connexion" className="hover:underline" style={{ color: '#2E86C1' }}>← Retour à la connexion</a>
          </p>
        </div>
      </div>
    </div>
  )
}