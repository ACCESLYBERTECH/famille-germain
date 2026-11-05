'use client'

import { useMemo } from 'react'
import { arbreGroupes, SANS_GROUPE } from '@/lib/groupes'

interface Props {
  valeur: string
  onChange: (valeur: string) => void
  elements: { groupe: string | null | undefined; leader_id: string | null | undefined }[]
  filtreLeader?: string
  // Nom à afficher pour chaque leader propriétaire de groupes
  nomLeader?: (leaderId: string) => string | null
  // Vue leader : ses propres groupes s'appellent « Mes groupes », les autres ont un 🔒
  moiId?: string
  className?: string
}

const ESPACE = '   '

// Liste déroulante des groupes en arbre (une section par leader, sous-groupes indentés)
export default function FiltreGroupe({ valeur, onChange, elements, filtreLeader = '', nomLeader, moiId, className }: Props) {
  const { sections, sansGroupe } = useMemo(() => arbreGroupes(elements, filtreLeader), [elements, filtreLeader])

  const titreSection = (leaderId: string) => {
    if (moiId && leaderId === moiId) return 'Mes groupes'
    const nom = leaderId ? nomLeader?.(leaderId) : null
    const titre = leaderId ? `Groupes de ${nom ?? 'un autre leader'}` : 'PCI sans leader'
    return moiId ? `${titre} 🔒` : titre
  }

  // « Mes groupes » en premier, puis les autres leaders par ordre alphabétique
  const sectionsTriees = [...sections].sort((a, b) => {
    if (moiId && a.leaderId === moiId) return -1
    if (moiId && b.leaderId === moiId) return 1
    return titreSection(a.leaderId).localeCompare(titreSection(b.leaderId), 'fr-CA')
  })

  const options = (s: typeof sections[number]) => s.noeuds.map(n => (
    <option key={n.valeur} value={n.valeur}>
      {ESPACE.repeat(n.niveau)}{n.niveau > 0 ? '└ ' : ''}{n.nom} ({n.nombre})
    </option>
  ))

  return (
    <select className={className ?? 'border rounded-lg px-3 py-2 text-sm outline-none max-w-full'} style={{ borderColor: '#E0E0E0' }} value={valeur} onChange={e => onChange(e.target.value)}>
      <option value="">Tous les groupes</option>
      {sectionsTriees.length === 1 && !(moiId && sectionsTriees[0].leaderId !== moiId)
        ? options(sectionsTriees[0])
        : sectionsTriees.map(s => (
            <optgroup key={s.leaderId || 'sans-leader'} label={titreSection(s.leaderId)}>
              {options(s)}
            </optgroup>
          ))}
      {sansGroupe > 0 && <option value={SANS_GROUPE}>Sans groupe ({sansGroupe})</option>}
    </select>
  )
}
