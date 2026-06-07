'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Navbar from '@/components/Navbar'

interface Props {
  searchParams?: { prenom?: string; role?: string }
}

export default function ContactPage() {
  const [form, setForm] = useState({ sujet: '', message: '' })
  const [envoye, setEnvoye] = useState(false)
  const [chargement, setChargement] = useState(false)

  async function handleEnvoyer() {
    if (!form.sujet || !form.message) return
    setChargement(true)
    // On connectera Resend ici plus tard
    await new Promise(r => setTimeout(r, 1000))
    setEnvoye(true)
    setChargement(false)
  }

  const inputClass = "w-full border rounded-lg px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-yellow-400"

  if (envoye) {
    return (
      <div className="min-h-screen" style={{ backgroundColor: '#F5F3EE' }}>
        <div className="max-w-xl mx-auto pt-20 px-4 text-center">
          <div className="bg-white rounded-2xl shadow-lg p-8">
            <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4" style={{ backgroundColor: '#4CAF7D' }}>
              <span className="text-white text-3xl">✓</span>
            </div>
            <h1 className="text-xl font-bold mb-2" style={{ color: '#1A2535' }}>Message envoyé !</h1>
            <p className="text-sm mb-6" style={{ color: '#666666' }}>
              Nous vous répondrons dans les plus brefs délais.
            </p>
            <a href="/" className="inline-block px-6 py-3 rounded-lg text-white font-medium text-sm" style={{ backgroundColor: '#C9A84C' }}>
              Retour à l'accueil
            </a>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#F5F3EE' }}>
      <div className="max-w-xl mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold mb-6" style={{ color: '#1A2535' }}>Nous contacter</h1>

        <div className="bg-white rounded-2xl shadow-lg p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1" style={{ color: '#1A2535' }}>Sujet *</label>
            <input className={inputClass} style={{ borderColor: '#E0E0E0' }} placeholder="Ex: Question sur mon billet..." value={form.sujet} onChange={e => setForm(f => ({ ...f, sujet: e.target.value }))} />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1" style={{ color: '#1A2535' }}>Message *</label>
            <textarea className={inputClass} style={{ borderColor: '#E0E0E0' }} rows={5} placeholder="Votre message..." value={form.message} onChange={e => setForm(f => ({ ...f, message: e.target.value }))} />
          </div>
          <button onClick={handleEnvoyer} disabled={chargement || !form.sujet || !form.message} className="w-full py-3 rounded-lg text-white font-medium text-sm disabled:opacity-50" style={{ backgroundColor: '#C9A84C' }}>
            {chargement ? 'Envoi...' : 'Envoyer le message'}
          </button>
        </div>
      </div>
    </div>
  )
}