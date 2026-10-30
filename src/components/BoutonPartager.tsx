'use client'

import { useState } from 'react'

// Bouton de partage d'un document.
// - Téléphone / tablette : ouvre le menu de partage du téléphone (Messenger, texto, courriel...)
// - Ordinateur : copie le lien dans le presse-papiers
export default function BoutonPartager({ titre, url }: { titre: string; url: string }) {
  const [message, setMessage] = useState<string | null>(null)

  const afficher = (texte: string) => {
    setMessage(texte)
    setTimeout(() => setMessage(null), 2500)
  }

  const copierLien = async () => {
    try {
      await navigator.clipboard.writeText(url)
      afficher('Lien copié ✓')
    } catch {
      // Ancienne méthode si le presse-papiers moderne est bloqué
      const zone = document.createElement('textarea')
      zone.value = url
      zone.style.position = 'fixed'
      zone.style.opacity = '0'
      document.body.appendChild(zone)
      zone.select()
      const ok = document.execCommand('copy')
      document.body.removeChild(zone)
      afficher(ok ? 'Lien copié ✓' : 'Copie impossible')
    }
  }

  const partager = async () => {
    const ecranTactile = typeof window !== 'undefined' && window.matchMedia('(pointer: coarse)').matches
    if (ecranTactile && typeof navigator.share === 'function') {
      try {
        await navigator.share({
          title: titre,
          text: `${titre} — Famille Germain – Yager Group`,
          url,
        })
      } catch (e) {
        // La personne a fermé le menu de partage : rien à faire
        if ((e as Error)?.name !== 'AbortError') await copierLien()
      }
      return
    }
    await copierLien()
  }

  return (
    <button
      type="button"
      onClick={partager}
      className="flex-1 sm:flex-none text-center px-4 py-2.5 sm:py-2 rounded-lg text-sm font-medium border bg-white transition-colors hover:bg-gray-50"
      style={{ borderColor: '#C9A84C', color: message ? '#27AE60' : '#1A2535' }}
      aria-label={`Partager ${titre}`}
    >
      {message ?? '📤 Partager'}
    </button>
  )
}
