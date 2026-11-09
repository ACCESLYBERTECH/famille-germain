'use client'

import { useRouter } from 'next/navigation'

export default function ChoixEvenement({ evenements, valeur }: { evenements: { id: string; nom: string; date_debut: string }[]; valeur: string }) {
  const router = useRouter()
  return (
    <label className="block mb-6">
      <span className="text-xs font-bold uppercase tracking-wide" style={{ color: '#C9A84C' }}>Conférence</span>
      <select className="mt-1 w-full border rounded-lg px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-yellow-400 bg-white max-w-full" style={{ borderColor: '#E0E0E0' }}
        value={valeur} onChange={e => router.push(`/admin/reconnaissances?evenement=${e.target.value}`)}>
        {evenements.map(ev => (
          <option key={ev.id} value={ev.id}>{ev.nom} — {new Date(ev.date_debut).toLocaleDateString('fr-CA', { day: 'numeric', month: 'long', year: 'numeric' })}</option>
        ))}
      </select>
    </label>
  )
}
