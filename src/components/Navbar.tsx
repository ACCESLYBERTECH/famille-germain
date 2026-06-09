'use client'

import { createClient } from '@/utils/supabase/client'
import { useRouter } from 'next/navigation'
import { useState } from 'react'

interface NavbarProps {
  prenom: string
  role: string
}

export default function Navbar({ prenom, role }: NavbarProps) {
  const router = useRouter()
  const supabase = createClient()
  const [menuOuvert, setMenuOuvert] = useState(false)

  async function handleDeconnexion() {
    await supabase.auth.signOut()
    router.push('/connexion')
    router.refresh()
  }

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

  const liensAdmin = [
    { href: '/evenements', label: 'Événements' },
    { href: '/admin/pci', label: 'Gestion PCI' },
    { href: '/admin/evenements', label: 'Gestion événements' },
    { href: '/admin/billets', label: 'Gestion billets' },
    { href: '/admin/portiers', label: 'Portiers' },
    { href: '/admin/documents', label: 'Documents' },
    { href: '/admin/carrousel', label: 'Carrousel' },
    { href: '/contact', label: 'Contact' },
    { href: '/scan', label: 'Scanner' },
  ]

  const liens = role === 'admin' ? liensAdmin
    : role === 'portier' ? liensPortier
    : role === 'leader' ? liensLeader
    : liensCommuns

  return (
    <nav className="w-full px-6 py-4" style={{ backgroundColor: '#1A2535' }}>
      <div className="flex items-center justify-between">

        <a href="/" className="flex items-center gap-2">
          <span className="text-white font-bold text-lg">Famille Germain</span>
          <span className="text-xs" style={{ color: '#C9A84C' }}>Yager Group</span>
        </a>

        <div className="hidden md:flex items-center gap-1">
          {liens.map(lien => (
            <a key={lien.href} href={lien.href} className="px-3 py-2 rounded-lg text-sm font-medium" style={{ color: '#E0E0E0' }}>{lien.label}</a>
          ))}
        </div>

        <div className="flex items-center gap-4">
          <div className="text-right hidden sm:block">
            <p className="text-white text-sm font-medium">{prenom}</p>
            <p className="text-xs capitalize" style={{ color: '#C9A84C' }}>{role}</p>
          </div>
          <button onClick={handleDeconnexion} className="text-sm px-4 py-2 rounded-lg font-medium transition-opacity hover:opacity-80" style={{ backgroundColor: '#C9A84C', color: '#1A2535' }}>
            Déconnexion
          </button>
          <button className="md:hidden text-white" onClick={() => setMenuOuvert(!menuOuvert)}>
            ☰
          </button>
        </div>
      </div>

      {menuOuvert && (
        <div className="md:hidden mt-3 pt-3 border-t border-white border-opacity-20">
          {liens.map(lien => (
            <a key={lien.href} href={lien.href} className="block px-3 py-2 rounded-lg text-sm font-medium" style={{ color: '#E0E0E0' }} onClick={() => setMenuOuvert(false)}>{lien.label}</a>
          ))}
        </div>
      )}
    </nav>
  )
}