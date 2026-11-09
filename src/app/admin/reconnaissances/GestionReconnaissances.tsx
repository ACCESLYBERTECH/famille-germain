'use client'

import { useState } from 'react'
import { createClient } from '@/utils/supabase/client'
import type { TypeReconnaissance } from '@/lib/reconnaissances'

// Liste des reconnaissances : l'ordre ici = l'ordre sur la scène
export default function GestionReconnaissances({ typesInitiaux }: { typesInitiaux: TypeReconnaissance[] }) {
  const supabase = createClient()
  const [types, setTypes] = useState<TypeReconnaissance[]>(typesInitiaux)
  const [nouveau, setNouveau] = useState('')
  const [edition, setEdition] = useState<{ id: string; nom: string } | null>(null)
  const [message, setMessage] = useState<{ type: 'succes' | 'erreur'; texte: string } | null>(null)

  const erreur = (texte: string) => setMessage({ type: 'erreur', texte })
  const succes = (texte: string) => setMessage({ type: 'succes', texte })

  async function ajouter() {
    const nom = nouveau.trim().replace(/\s+/g, ' ')
    if (!nom) return
    if (types.some(t => t.nom.toLowerCase() === nom.toLowerCase())) { erreur('Cette reconnaissance existe déjà.'); return }
    const ordre = types.length > 0 ? Math.max(...types.map(t => t.ordre)) + 1 : 1
    const { data, error } = await supabase.from('reconnaissance_types').insert({ nom, ordre }).select('id, nom, ordre, actif').single()
    if (error || !data) { erreur("Erreur lors de l'ajout"); return }
    setTypes([...types, data])
    setNouveau('')
    succes(`« ${nom} » ajoutée à la fin de la liste.`)
  }

  async function renommer() {
    if (!edition) return
    const nom = edition.nom.trim().replace(/\s+/g, ' ')
    if (!nom) return
    const { error } = await supabase.from('reconnaissance_types').update({ nom }).eq('id', edition.id)
    if (error) { erreur('Erreur lors de la sauvegarde'); return }
    setTypes(types.map(t => t.id === edition.id ? { ...t, nom } : t))
    setEdition(null)
    succes('Nom modifié.')
  }

  async function basculerActif(t: TypeReconnaissance) {
    const { error } = await supabase.from('reconnaissance_types').update({ actif: !t.actif }).eq('id', t.id)
    if (error) { erreur('Erreur lors de la sauvegarde'); return }
    setTypes(types.map(x => x.id === t.id ? { ...x, actif: !t.actif } : x))
    succes(t.actif ? `« ${t.nom} » désactivée : elle n'apparaît plus dans les formulaires des leaders.` : `« ${t.nom} » réactivée.`)
  }

  async function deplacer(index: number, direction: -1 | 1) {
    const cible = index + direction
    if (cible < 0 || cible >= types.length) return
    const liste = [...types]
    ;[liste[index], liste[cible]] = [liste[cible], liste[index]]
    const renumerotee = liste.map((t, i) => ({ ...t, ordre: i + 1 }))
    setTypes(renumerotee)
    const resultats = await Promise.all(renumerotee.map(t => supabase.from('reconnaissance_types').update({ ordre: t.ordre }).eq('id', t.id)))
    if (resultats.some(r => r.error)) erreur("Erreur lors de la sauvegarde de l'ordre")
    else setMessage(null)
  }

  return (
    <div className="px-4 pb-10 sm:px-8">
      <div className="max-w-5xl mx-auto">

        {message && (
          <div className={`mb-4 p-3 rounded-lg text-sm font-medium ${message.type === 'succes' ? 'bg-green-50 text-green-800 border border-green-200' : 'bg-red-50 text-red-800 border border-red-200'}`}>
            {message.texte}
          </div>
        )}

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 sm:p-6">
          <h2 className="text-lg font-semibold" style={{ color: '#1A2535' }}>⚙️ Liste des reconnaissances ({types.filter(t => t.actif).length} actives)</h2>
          <p className="text-sm text-gray-400 mb-4">L&apos;ordre de cette liste est l&apos;ordre de la feuille de scène. Une reconnaissance désactivée disparaît des formulaires, mais reste dans les anciennes entrées.</p>

          <div className="flex gap-2 mb-4">
            <input className="flex-1 min-w-0 border rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-yellow-400" style={{ borderColor: '#E0E0E0' }}
              placeholder="Nouvelle reconnaissance (ex. Platine)" value={nouveau} maxLength={80}
              onChange={e => setNouveau(e.target.value)} onKeyDown={e => e.key === 'Enter' && ajouter()} />
            <button onClick={ajouter} disabled={!nouveau.trim()} className="px-4 py-2 rounded-lg text-sm font-medium text-white disabled:opacity-50 flex-shrink-0" style={{ backgroundColor: '#C9A84C' }}>+ Ajouter</button>
          </div>

          <div className="border rounded-xl overflow-hidden" style={{ borderColor: '#EEEEEE' }}>
            {types.map((t, i) => (
              <div key={t.id} className="flex items-center gap-3 px-3 py-2 border-b last:border-b-0" style={{ borderColor: '#F0F0F0', backgroundColor: t.actif ? 'white' : '#FAFAFA' }}>
                <div className="flex flex-col items-center">
                  <button onClick={() => deplacer(i, -1)} disabled={i === 0} className="text-xs text-gray-400 hover:text-gray-700 disabled:opacity-20 leading-none px-1" aria-label="Monter">▲</button>
                  <button onClick={() => deplacer(i, 1)} disabled={i === types.length - 1} className="text-xs text-gray-400 hover:text-gray-700 disabled:opacity-20 leading-none px-1" aria-label="Descendre">▼</button>
                </div>
                <span className="text-sm font-bold w-6 text-center" style={{ color: '#C9A84C' }}>{i + 1}</span>
                {edition?.id === t.id ? (
                  <div className="flex-1 flex gap-2 min-w-0">
                    <input autoFocus className="flex-1 min-w-0 border rounded-lg px-2 py-1 text-sm outline-none focus:ring-2 focus:ring-yellow-400" style={{ borderColor: '#E0E0E0' }}
                      value={edition.nom} maxLength={80} onChange={e => setEdition({ ...edition, nom: e.target.value })}
                      onKeyDown={e => { if (e.key === 'Enter') renommer(); if (e.key === 'Escape') setEdition(null) }} />
                    <button onClick={renommer} className="px-3 py-1 rounded-lg text-xs font-medium text-white" style={{ backgroundColor: '#4CAF7D' }}>OK</button>
                  </div>
                ) : (
                  <span className="flex-1 min-w-0 text-sm" style={{ color: t.actif ? '#1A2535' : '#AAAAAA', textDecoration: t.actif ? undefined : 'line-through' }}>{t.nom}</span>
                )}
                {edition?.id !== t.id && (
                  <div className="flex gap-1 flex-shrink-0">
                    <button onClick={() => setEdition({ id: t.id, nom: t.nom })} className="px-2 py-1 rounded-lg text-xs font-medium hover:bg-blue-50" style={{ color: '#2E86C1' }}>Renommer</button>
                    <button onClick={() => basculerActif(t)} className="px-2 py-1 rounded-lg text-xs font-medium hover:bg-gray-100" style={{ color: t.actif ? '#E57373' : '#4CAF7D' }}>{t.actif ? 'Désactiver' : 'Réactiver'}</button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
