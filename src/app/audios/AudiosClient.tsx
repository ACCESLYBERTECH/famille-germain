'use client'

import { useRef } from 'react'

interface Categorie { id: string; nom: string; ordre: number }
interface Audio { id: string; categorie_id: string | null; titre: string; description: string | null; url: string }

// Liste des audios par catégorie — écoute seulement (pas de bouton de téléchargement)
export default function AudiosClient({ categories, audios }: { categories: Categorie[]; audios: Audio[] }) {
  const conteneur = useRef<HTMLDivElement>(null)

  // Un seul audio joue à la fois
  function surLecture(e: React.SyntheticEvent<HTMLAudioElement>) {
    conteneur.current?.querySelectorAll('audio').forEach(a => { if (a !== e.currentTarget) a.pause() })
  }

  const sections = [
    ...categories.map(c => ({ id: c.id, nom: c.nom, audios: audios.filter(a => a.categorie_id === c.id) })),
    { id: 'autres', nom: 'Autres audios', audios: audios.filter(a => !a.categorie_id || !categories.some(c => c.id === a.categorie_id)) },
  ].filter(s => s.audios.length > 0)

  if (sections.length === 0) {
    return (
      <div className="bg-white rounded-2xl shadow p-8 text-center" style={{ color: '#666666' }}>
        Aucun audio pour le moment. Revenez bientôt!
      </div>
    )
  }

  return (
    <div ref={conteneur} className="space-y-6" onContextMenu={e => e.preventDefault()}>
      {sections.map(section => (
        <div key={section.id} className="bg-white rounded-2xl shadow overflow-hidden">
          <div className="px-5 py-3" style={{ backgroundColor: '#1A2535' }}>
            <p className="font-bold" style={{ color: '#C9A84C' }}>{section.nom}</p>
          </div>
          <div>
            {section.audios.map(audio => (
              <div key={audio.id} className="px-5 py-4 border-b last:border-b-0" style={{ borderColor: '#E0E0E0' }}>
                <p className="font-semibold" style={{ color: '#1A2535' }}>{audio.titre}</p>
                {audio.description && <p className="text-sm mt-0.5" style={{ color: '#666666' }}>{audio.description}</p>}
                <audio controls controlsList="nodownload" preload="none" className="w-full mt-3" src={audio.url} onPlay={surLecture} />
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}
