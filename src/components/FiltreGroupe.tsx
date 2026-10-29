'use client'

import { useMemo } from 'react'
import { optionsGroupes, SANS_GROUPE } from '@/lib/groupes'

interface Props {
  valeur: string
  onChange: (valeur: string) => void
  elements: { groupe: string | null | undefined; leader_id: string | null | undefined }[]
  filtreLeader?: string
  className?: string
}

// Liste déroulante des groupes existants (liée au filtre Leader)
export default function FiltreGroupe({ valeur, onChange, elements, filtreLeader = '', className }: Props) {
  const { groupes, sansGroupe } = useMemo(() => optionsGroupes(elements, filtreLeader), [elements, filtreLeader])

  return (
    <select className={className ?? 'border rounded-lg px-3 py-2 text-sm outline-none'} style={{ borderColor: '#E0E0E0' }} value={valeur} onChange={e => onChange(e.target.value)}>
      <option value="">Tous les groupes</option>
      {groupes.map(g => <option key={g.cle} value={g.cle}>{g.cle} ({g.nombre})</option>)}
      {sansGroupe > 0 && <option value={SANS_GROUPE}>Sans groupe ({sansGroupe})</option>}
    </select>
  )
}
