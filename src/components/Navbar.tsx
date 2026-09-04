'use client'

import { createClient } from '@/utils/supabase/client'
import { useRouter } from 'next/navigation'
import { useState, useRef, useEffect } from 'react'

interface NavbarProps {
  prenom: string
  role: string
}

export default function Navbar({ prenom, role }: NavbarProps) {
  const router = useRouter()
  const supabase = createClient()
  const [menuOuvert, setMenuOuvert] = useState(false)
  const [gestionOuvert, setGestionOuvert] = useState(false)
  const [modeAccess, setModeAccess] = useState(false)
  const gestionRef = useRef<HTMLDivElement>(null)

  // Charger le mode accessibilité depuis localStorage
  useEffect(() => {
    const saved = localStorage.getItem('mode-accessibilite')
    if (saved === 'true') {
      setModeAccess(true)
      document.body.classList.add('mode-accessibilite')
    }
  }, [])

  function toggleModeAccess() {
    const nouveau = !modeAccess
    setModeAccess(nouveau)
    localStorage.setItem('mode-accessibilite', nouveau.toString())
    if (nouveau) {
      document.body.classList.add('mode-accessibilite')
    } else {
      document.body.classList.remove('mode-accessibilite')
    }
  }

  async function handleDeconnexion() {
    await supabase.auth.signOut()
    router.push('/connexion')
    router.refresh()
  }

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (gestionRef.current && !gestionRef.current.contains(e.target as Node)) {
        setGestionOuvert(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const liensCommuns = [
    { href: '/evenements', label: 'Événements' },
    { href: '/evenements/mes-billets', label: 'Mes billets' },
    { href: '/documents', label: 'Documents' },
    { href: '/contact', label: 'Contact' },
  ]

  const liensLeader = [
    { href: '/evenements', label: 'Événements' },
    { href: '/evenements/mes-billets', label: 'Mes billets' },
    { href: '/leader/platines-et-plus', label: 'Platines et plus' },
    { href: '/documents', label: 'Documents' },
    { href: '/contact', label: 'Contact' },
  ]

  const liensPortier = [
    { href: '/scan', label: 'Scanner' },
  ]

  const liensAdminPrincipaux = [
    { href: '/evenements', label: 'Événements' },
    { href: '/contact', label: 'Contact' },
    { href: '/scan', label: 'Scanner' },
  ]

  const liensAdminGestion = [
    { href: '/admin/pci', label: '👥 Gestion PCI' },
    { href: '/admin/evenements', label: '📅 Gestion événements' },
    { href: '/admin/billets', label: '🎫 Gestion billets' },
    { href: '/admin/portiers', label: '🔑 Portiers' },
    { href: '/admin/documents', label: '📄 Documents' },
    { href: '/admin/carrousel', label: '🖼️ Carrousel' },
  ]

  const liensAdminMobile = [
    { href: '/evenements', label: 'Événements' },
    { href: '/admin/pci', label: 'Gestion PCI' },
    { href: '/admin/evenements', label: 'Gestion événements' },
    { href: '/admin/billets', label: 'Gestion billets' },
    { href: '/admin/portiers', label: 'Portiers' },
    { href: '/admin/carrousel', label: 'Carrousel' },
    { href: '/documents', label: 'Documents' },
    { href: '/contact', label: 'Contact' },
    { href: '/scan', label: 'Scanner' },
  ]

  const liens = role === 'portier' ? liensPortier : role === 'leader' ? liensLeader : liensCommuns
  const liensMobile = role === 'admin' ? liensAdminMobile : role === 'portier' ? liensPortier : role === 'leader' ? liensLeader : liensCommuns

  return (
    <nav className="w-full px-6 py-3 sticky top-0 z-40" style={{ backgroundColor: '#1A2535' }}>
      <div className="flex items-center justify-between relative">

        <a href="/" className="flex items-center gap-3">
          <img src="/logo-germain.png" alt="La Famille Germain" className="h-16 w-auto" />
          <img src="/logo-yager.png" alt="Yager Group" className="h-14 w-auto opacity-90" />
        </a>

        <div className="hidden md:flex items-center gap-1 absolute left-1/2 -translate-x-1/2">

          {role === 'admin' && (
            <div className="relative" ref={gestionRef}>
              <button onClick={() => setGestionOuvert(!gestionOuvert)} className="px-3 py-2 rounded-lg text-base font-medium transition-colors hover:bg-white hover:bg-opacity-10 flex items-center gap-1" style={{ color: gestionOuvert ? '#C9A84C' : '#E0E0E0' }}>
                Gestion <span className="text-xs">{gestionOuvert ? '▲' : '▼'}</span>
              </button>

              {gestionOuvert && (
                <div className="absolute top-full left-0 mt-1 rounded-xl shadow-lg overflow-hidden z-50 min-w-48" style={{ backgroundColor: '#1A2535', border: '1px solid rgba(255,255,255,0.1)' }}>
                  {liensAdminGestion.map(lien => (
                    <a key={lien.href} href={lien.href} onClick={() => setGestionOuvert(false)} className="block px-4 py-2.5 text-sm transition-colors hover:bg-white hover:bg-opacity-10" style={{ color: '#E0E0E0' }}>{lien.label}</a>
                  ))}
                </div>
              )}
            </div>
          )}

          {(role === 'admin' ? liensAdminPrincipaux : liens).map(lien => (
            <a key={lien.href} href={lien.href} className="px-3 py-2 rounded-lg text-base font-medium transition-colors hover:bg-white hover:bg-opacity-10 whitespace-nowrap" style={{ color: '#E0E0E0' }}>{lien.label}</a>
          ))}
        </div>

        <div className="flex items-center gap-3">
          {/* Bouton accessibilité — admin seulement */}
          {role === 'admin' && (
            <button
              onClick={toggleModeAccess}
              title={modeAccess ? 'Désactiver le mode accessibilité' : 'Activer le mode accessibilité'}
              className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
              style={{
                backgroundColor: modeAccess ? '#C9A84C' : 'rgba(255,255,255,0.1)',
                color: modeAccess ? '#1A2535' : '#E0E0E0',
                border: modeAccess ? 'none' : '1px solid rgba(255,255,255,0.2)'
              }}
            >
              <span className="text-base">👁️</span>
              {modeAccess ? 'Grand texte ON' : 'Grand texte'}
            </button>
          )}

          <div className="text-right hidden sm:block">
            <p className="text-white text-sm font-medium">{prenom}</p>
            <p className="text-xs capitalize" style={{ color: '#C9A84C' }}>{role}</p>
          </div>
          <button onClick={handleDeconnexion} className="text-sm px-4 py-2 rounded-lg font-medium transition-opacity hover:opacity-80" style={{ backgroundColor: '#C9A84C', color: '#1A2535' }}>Déconnexion</button>
          <button className="md:hidden text-white text-xl" onClick={() => setMenuOuvert(!menuOuvert)}>☰</button>
        </div>
      </div>

      {menuOuvert && (
        <div className="md:hidden mt-3 pt-3 border-t border-white border-opacity-20">
          {liensMobile.map(lien => (
            <a key={lien.href} href={lien.href} className="block px-3 py-2 rounded-lg text-sm font-medium" style={{ color: '#E0E0E0' }} onClick={() => setMenuOuvert(false)}>{lien.label}</a>
          ))}
        </div>
      )}
    </nav>
  )
}