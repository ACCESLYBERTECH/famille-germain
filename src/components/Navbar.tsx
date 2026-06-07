'use client'

import { createClient } from '@/utils/supabase/client'
import { useRouter } from 'next/navigation'

interface NavbarProps {
  prenom: string
  role: string
}

export default function Navbar({ prenom, role }: NavbarProps) {
  const router = useRouter()
  const supabase = createClient()

  async function handleDeconnexion() {
    await supabase.auth.signOut()
    router.push('/connexion')
    router.refresh()
  }

  return (
    <nav className="w-full px-6 py-4 flex items-center justify-between" style={{ backgroundColor: '#1A2535' }}>
      
      {/* Logo / Titre */}
      <div>
        <span className="text-white font-bold text-lg">Famille Germain</span>
        <span className="text-xs ml-2" style={{ color: '#C9A84C' }}>Yager Group</span>
      </div>

      {/* Droite — nom + rôle + déconnexion */}
      <div className="flex items-center gap-4">
        <div className="text-right hidden sm:block">
          <p className="text-white text-sm font-medium">{prenom}</p>
          <p className="text-xs capitalize" style={{ color: '#C9A84C' }}>{role}</p>
        </div>
        <button
          onClick={handleDeconnexion}
          className="text-sm px-4 py-2 rounded-lg font-medium transition-opacity hover:opacity-80"
          style={{ backgroundColor: '#C9A84C', color: '#1A2535' }}
        >
          Déconnexion
        </button>
      </div>

    </nav>
  )
}