'use client'

import { createClient } from '@/utils/supabase/client'
import { useRouter } from 'next/navigation'
import { useState, useRef, useEffect } from 'react'
import { aAccesAudios } from '@/lib/audios'

interface NavbarProps {
  prenom: string
  role: string
}

export default function Navbar({ prenom, role }: NavbarProps) {
  const router = useRouter()
  const supabase = createClient()
  const [menuOuvert, setMenuOuvert] = useState(false)
  const [gestionOuvert, setGestionOuvert] = useState(false)
  const gestionRef = useRef<HTMLDivElement>(null)
  const [accesAudios, setAccesAudios] = useState(false)
  const [nomComplet, setNomComplet] = useState(prenom)
  const [coPCI, setCoPCI] = useState('')

  // Compte connecté : nom complet + co-PCI (coin supérieur droit) et accès aux Audios
  useEffect(() => {
    let annule = false
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) return
      const { data } = await supabase
        .from('comptes')
        .select('role, statut, periode_sf_debut, periode_sf_fin, prenom_1, nom_1, prenom_2, nom_2')
        .eq('id', user.id)
        .single()
      if (annule || !data) return
      const nom1 = [data.prenom_1, data.nom_1].filter(Boolean).join(' ').trim()
      const nom2 = [data.prenom_2, data.nom_2].filter(Boolean).join(' ').trim()
      if (nom1) setNomComplet(nom1)
      setCoPCI(nom2)
      if (role === 'pci' || role === 'leader') setAccesAudios(aAccesAudios(data))
    })
    return () => { annule = true }
  }, [role])

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

  const lienAudios = accesAudios ? [{ href: '/audios', label: '🎧 Audios' }] : []

  const liensCommuns = [
    { href: '/evenements', label: 'Événements' },
    { href: '/evenements/mes-billets', label: 'Mes billets' },
    ...lienAudios,
    { href: '/documents', label: 'Documents' },
    { href: '/contact', label: 'Contact' },
  ]

  const liensLeader = [
    { href: '/evenements', label: 'Événements' },
    { href: '/evenements/mes-billets', label: 'Mes billets' },
    { href: '/leader/platines-et-plus', label: 'Platines et plus' },
    ...lienAudios,
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
    { href: '/admin/audios', label: '🎧 Audios' },
    { href: '/admin/banquets', label: '🍽️ Rapport banquets' },
    { href: '/admin/carrousel', label: '🖼️ Carrousel' },
    { href: '/admin/marketing', label: '📣 Marketing' },
  ]

  const liensAdminMobile = [
    { href: '/evenements', label: 'Événements' },
    { href: '/admin/pci', label: 'Gestion PCI' },
    { href: '/admin/evenements', label: 'Gestion événements' },
    { href: '/admin/billets', label: 'Gestion billets' },
    { href: '/admin/portiers', label: 'Portiers' },
    { href: '/admin/documents', label: 'Gestion documents' },
    { href: '/admin/audios', label: 'Audios' },
    { href: '/admin/banquets', label: 'Rapport banquets' },
    { href: '/admin/carrousel', label: 'Carrousel' },
    { href: '/admin/marketing', label: 'Marketing' },
    { href: '/documents', label: 'Documents' },
    { href: '/contact', label: 'Contact' },
    { href: '/scan', label: 'Scanner' },
  ]

  // Le développeur voit tous les menus admin. Les pages qui lui sont interdites
  // (Gestion billets, Rapport banquets, Platines et plus) affichent « Non accessible au développeur »
  const estDev = role === 'developpeur'
  const aMenuGestion = role === 'admin' || estDev
  const liensGestion = estDev ? [...liensAdminGestion, { href: '/leader/platines-et-plus', label: '👑 Platines et plus' }] : liensAdminGestion
  const liensAdminMobileFiltres = estDev ? [...liensAdminMobile, { href: '/leader/platines-et-plus', label: 'Platines et plus' }] : liensAdminMobile

  const liens = role === 'portier' ? liensPortier : role === 'leader' ? liensLeader : liensCommuns
  const liensMobile = aMenuGestion ? liensAdminMobileFiltres : role === 'portier' ? liensPortier : role === 'leader' ? liensLeader : liensCommuns

  return (
    <nav className="w-full px-3 sm:px-6 py-2 sm:py-3 sticky top-0 z-40" style={{ backgroundColor: '#1A2535' }}>
      <div className="flex items-center justify-between gap-2 relative">

        {/* Logos : Yager Group en premier et plus gros, puis Famille Germain « Membre du Yager Group » */}
        <a href="/" className="flex items-center gap-2 sm:gap-4 min-w-0 flex-shrink">
          <img src="/logo-yager.png" alt="Yager Group" className="h-9 sm:h-12 xl:h-14 w-auto" />
          <span className="self-stretch w-px flex-shrink-0" style={{ backgroundColor: 'rgba(201,168,76,0.5)' }} />
          <span className="flex flex-col items-center min-w-0">
            <img src="/logo-germain.png" alt="La Famille Germain" className="h-5 sm:h-7 xl:h-8 w-auto" />
            <span className="text-[8px] sm:text-[10px] xl:text-[11px] tracking-wide whitespace-nowrap mt-0.5" style={{ color: '#C9A84C' }}>Membre du Yager Group</span>
          </span>
        </a>

        {/* Menu complet : seulement sur grand écran (sinon il chevauche les logos) */}
        <div className="hidden xl:flex items-center gap-1 absolute left-1/2 -translate-x-1/2">
          {aMenuGestion && (
            <div className="relative" ref={gestionRef}>
              <button onClick={() => setGestionOuvert(!gestionOuvert)} className="px-3 py-2 rounded-lg text-base font-medium transition-colors hover:bg-white/10 flex items-center gap-1" style={{ color: gestionOuvert ? '#C9A84C' : '#E0E0E0' }}>
                Gestion <span className="text-xs">{gestionOuvert ? '▲' : '▼'}</span>
              </button>
              {gestionOuvert && (
                <div className="absolute top-full left-0 mt-1 rounded-xl shadow-lg overflow-hidden z-50 min-w-48" style={{ backgroundColor: '#1A2535', border: '1px solid rgba(255,255,255,0.1)' }}>
                  {liensGestion.map(lien => (
                    <a key={lien.href} href={lien.href} onClick={() => setGestionOuvert(false)} className="block px-4 py-2.5 text-sm transition-colors hover:bg-white/10" style={{ color: '#E0E0E0' }}>{lien.label}</a>
                  ))}
                </div>
              )}
            </div>
          )}
          {(aMenuGestion ? liensAdminPrincipaux : liens).map(lien => (
            <a key={lien.href} href={lien.href} className="px-3 py-2 rounded-lg text-base font-medium transition-colors hover:bg-white/10 whitespace-nowrap" style={{ color: '#E0E0E0' }}>{lien.label}</a>
          ))}
        </div>

        <div className="flex items-center gap-2 sm:gap-4 flex-shrink-0">
          <div className="text-right hidden sm:block max-w-56 leading-tight">
            <p className="text-white text-sm font-medium truncate" title={nomComplet}>{nomComplet}</p>
            {coPCI && <p className="text-xs truncate" style={{ color: '#B8C0CC' }} title={coPCI}>& {coPCI}</p>}
            <p className="text-xs capitalize mt-0.5" style={{ color: '#C9A84C' }}>{estDev ? 'Développeur' : role}</p>
          </div>
          <button onClick={handleDeconnexion} className="hidden sm:inline-block text-sm px-4 py-2 rounded-lg font-medium transition-opacity hover:opacity-80" style={{ backgroundColor: '#C9A84C', color: '#1A2535' }}>Déconnexion</button>
          <button className="xl:hidden text-white text-2xl leading-none p-2 -mr-1 rounded-lg" aria-label="Menu" onClick={() => setMenuOuvert(!menuOuvert)}>{menuOuvert ? '✕' : '☰'}</button>
        </div>
      </div>

      {menuOuvert && (
        <div className="xl:hidden mt-2 pt-3 pb-1 border-t border-white/20 max-h-[75vh] overflow-y-auto">
          <div className="sm:hidden px-3 pb-3 mb-2 border-b border-white/10">
            <p className="text-white text-sm font-medium">{nomComplet}</p>
            {coPCI && <p className="text-xs" style={{ color: '#B8C0CC' }}>& {coPCI}</p>}
            <p className="text-xs capitalize" style={{ color: '#C9A84C' }}>{estDev ? 'Développeur' : role}</p>
          </div>
          {liensMobile.map(lien => (
            <a key={lien.href} href={lien.href} className="block px-3 py-2.5 rounded-lg text-base font-medium" style={{ color: '#E0E0E0' }} onClick={() => setMenuOuvert(false)}>{lien.label}</a>
          ))}
          <button onClick={handleDeconnexion} className="sm:hidden w-full mt-3 py-2.5 rounded-lg font-medium text-base" style={{ backgroundColor: '#C9A84C', color: '#1A2535' }}>Déconnexion</button>
        </div>
      )}
    </nav>
  )
}