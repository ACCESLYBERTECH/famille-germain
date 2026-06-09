'use client'

import { useState, useEffect, useCallback } from 'react'

interface CarrouselImage {
  id: string
  url: string
  ordre: number
}

interface Props {
  photoLeader: { url: string; nom: string } | null
  images: CarrouselImage[]
  prenom: string
}

export default function CarrouselAccueil({ photoLeader, images, prenom }: Props) {
  const [indexActif, setIndexActif] = useState(0)

  const slides: { url: string; legende?: string; estLeader?: boolean }[] = []

  if (photoLeader) {
    slides.push({ url: photoLeader.url, legende: photoLeader.nom, estLeader: true })
  } else {
    slides.push({ url: '/bienvenue.jpg', legende: 'Famille Germain – Yager Group', estLeader: true })
  }

  images.forEach(img => slides.push({ url: img.url }))

  const total = slides.length

  const precedent = useCallback(() => {
    setIndexActif(i => (i - 1 + total) % total)
  }, [total])

  const suivant = useCallback(() => {
    setIndexActif(i => (i + 1) % total)
  }, [total])

  useEffect(() => {
    if (total <= 1) return
    const timer = setInterval(suivant, 5000)
    return () => clearInterval(timer)
  }, [suivant, total])

  if (total === 0) return null

  const slide = slides[indexActif]
  const estSlideLeader = slide.estLeader && photoLeader !== null

  return (
    <div className="w-full">

      {/* Carrousel principal */}
      <div
        className="relative w-full rounded-2xl overflow-hidden shadow-lg"
        style={{
          backgroundColor: '#1A2535',
          height: estSlideLeader ? '480px' : undefined,
          aspectRatio: estSlideLeader ? undefined : '16/9',
        }}
      >
        {estSlideLeader ? (
          /* Photo leader : disposition côte-à-côte */
          <div className="flex h-full">
            {/* Photo à gauche */}
            <div className="w-1/2 h-full relative">
              <img
                src={slide.url}
                alt={slide.legende}
                className="w-full h-full object-cover object-top"
              />
            </div>
            {/* Texte à droite */}
            <div className="w-1/2 h-full flex flex-col justify-center px-10" style={{ backgroundColor: '#1A2535' }}>
              <p className="text-xs uppercase tracking-widest mb-3" style={{ color: '#C9A84C' }}>Votre leader</p>
              <p className="text-3xl font-bold text-white mb-4">{slide.legende}</p>
              <div className="w-12 h-0.5 mb-4" style={{ backgroundColor: '#C9A84C' }}></div>
              <p className="text-sm" style={{ color: 'rgba(255,255,255,0.6)' }}>Famille Germain – Yager Group</p>
            </div>
          </div>
        ) : (
          /* Images carrousel normales */
          <img
            key={indexActif}
            src={slide.url}
            alt={`Slide ${indexActif + 1}`}
            className="w-full h-full object-cover"
          />
        )}

        {/* Flèches navigation */}
        {total > 1 && (
          <>
            <button
              onClick={precedent}
              className="absolute left-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full flex items-center justify-center text-white font-bold transition-all hover:scale-110 text-xl"
              style={{ backgroundColor: 'rgba(26,37,53,0.6)' }}
            >
              ‹
            </button>
            <button
              onClick={suivant}
              className="absolute right-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full flex items-center justify-center text-white font-bold transition-all hover:scale-110 text-xl"
              style={{ backgroundColor: 'rgba(26,37,53,0.6)' }}
            >
              ›
            </button>
          </>
        )}

        {/* Indicateurs */}
        {total > 1 && (
          <div className="absolute bottom-4 right-4 flex gap-1.5">
            {slides.map((_, i) => (
              <button
                key={i}
                onClick={() => setIndexActif(i)}
                className="rounded-full transition-all"
                style={{
                  width: i === indexActif ? '20px' : '8px',
                  height: '8px',
                  backgroundColor: i === indexActif ? '#C9A84C' : 'rgba(255,255,255,0.5)',
                }}
              />
            ))}
          </div>
        )}
      </div>

      {/* Miniatures */}
      {total > 1 && (
        <div className="flex gap-3 mt-4 overflow-x-auto pb-2">
          {slides.map((s, i) => (
            <button
              key={i}
              onClick={() => setIndexActif(i)}
              className="flex-shrink-0 rounded-xl overflow-hidden transition-all"
              style={{
                width: '100px',
                height: '60px',
                border: i === indexActif ? '2px solid #C9A84C' : '2px solid transparent',
                opacity: i === indexActif ? 1 : 0.6,
              }}
            >
              <img src={s.url} alt={`Miniature ${i + 1}`} className="w-full h-full object-cover object-top" />
            </button>
          ))}
        </div>
      )}

    </div>
  )
}