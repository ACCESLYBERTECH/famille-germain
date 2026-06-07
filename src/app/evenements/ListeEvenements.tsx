'use client'

import type { Compte, Evenement, EvenementPalier } from '@/lib/types'

interface Props {
  evenements: Evenement[]
  compte: Compte
}

function getPrixActuel(paliers: EvenementPalier[]): { prix: number; prochainPalier?: EvenementPalier } {
  if (!paliers || paliers.length === 0) return { prix: 0 }
  
  const maintenant = new Date()
  const paliersTriés = [...paliers].sort((a, b) => a.ordre - b.ordre)
  
  // Trouver le palier actuel (date_fin pas encore passée)
  const palierActuel = paliersTriés.find(p => new Date(p.date_fin) > maintenant)
  
  if (!palierActuel) {
    // Tous les paliers sont expirés — dernier prix
    return { prix: paliersTriés[paliersTriés.length - 1].prix }
  }

  // Y a-t-il un prochain palier ?
  const indexActuel = paliersTriés.indexOf(palierActuel)
  const prochainPalier = paliersTriés[indexActuel + 1]

  return { prix: palierActuel.prix, prochainPalier: prochainPalier }
}

function estSansFrais(compte: Compte, evenement: Evenement): boolean {
  if (!compte.periode_sf_fin) return false
  const dateEvenement = new Date(evenement.date_debut)
  const finSF = new Date(compte.periode_sf_fin)
  return dateEvenement <= finSF
}

export default function ListeEvenements({ evenements, compte }: Props) {
  if (evenements.length === 0) {
    return (
      <div className="bg-white rounded-2xl shadow p-8 text-center" style={{ color: '#666666' }}>
        Aucun événement disponible pour le moment.
      </div>
    )
  }

  return (
    <div className="grid gap-4">
      {evenements.map(ev => {
        const sf = estSansFrais(compte, ev)
        const { prix, prochainPalier } = getPrixActuel(ev.paliers ?? [])

        return (
          <div key={ev.id} className="bg-white rounded-2xl shadow p-6">
            <div className="flex items-start justify-between gap-4">
              
              {/* Info événement */}
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <h2 className="text-xl font-bold" style={{ color: '#1A2535' }}>{ev.nom}</h2>
                  {ev.acces === 'platine' && (
                    <span className="px-2 py-0.5 rounded-full text-xs font-medium"
                      style={{ backgroundColor: '#FFF8E1', color: '#C9A84C' }}>
                      Platine
                    </span>
                  )}
                </div>

                <p className="text-sm mb-2" style={{ color: '#666666' }}>
                  📅 {new Date(ev.date_debut).toLocaleDateString('fr-CA', { 
                    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' 
                  })}
                  {ev.date_fin !== ev.date_debut && (
                    <> → {new Date(ev.date_fin).toLocaleDateString('fr-CA', { 
                      weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' 
                    })}</>
                  )}
                </p>

                {ev.lieu && (
                  <p className="text-sm mb-2" style={{ color: '#666666' }}>
                    📍 {ev.lieu}
                  </p>
                )}

                {ev.villes && ev.villes.length > 0 && (
                  <p className="text-sm mb-2" style={{ color: '#666666' }}>
                    🏙️ {ev.villes.map(v => v.nom_ville).join(' · ')}
                  </p>
                )}

                {ev.description && (
                  <p className="text-sm mt-3" style={{ color: '#666666' }}>{ev.description}</p>
                )}
              </div>

              {/* Prix et action */}
              <div className="flex flex-col items-end gap-3 flex-shrink-0">
                {ev.a_billets ? (
                  <>
                    {sf ? (
                      <div className="text-right">
                        <span className="px-3 py-1 rounded-full text-sm font-bold"
                          style={{ backgroundColor: '#E8F5E9', color: '#4CAF7D' }}>
                          Sans frais ✓
                        </span>
                      </div>
                    ) : (
                      <div className="text-right">
                        <p className="text-2xl font-bold" style={{ color: '#1A2535' }}>
                          {prix === 0 ? 'Gratuit' : `${prix.toFixed(2)} $`}
                        </p>
                        {prochainPalier && (
                          <p className="text-xs mt-0.5" style={{ color: '#E57373' }}>
                            ⏰ Prix augmente le {new Date(prochainPalier.date_fin).toLocaleDateString('fr-CA')}
                          </p>
                        )}
                      </div>
                    )}
                    <button
                      className="px-5 py-2.5 rounded-lg text-white font-medium text-sm"
                      style={{ backgroundColor: '#C9A84C' }}
                    >
                      Acheter un billet
                    </button>
                  </>
                ) : (
                  <span className="text-sm" style={{ color: '#666666' }}>
                    Événement informatif
                  </span>
                )}
              </div>

            </div>
          </div>
        )
      })}
    </div>
  )
}