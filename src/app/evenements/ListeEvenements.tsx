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
  const palierActuel = paliersTriés.find(p => new Date(p.date_fin) > maintenant)
  if (!palierActuel) {
    return { prix: paliersTriés[paliersTriés.length - 1].prix }
  }
  const indexActuel = paliersTriés.indexOf(palierActuel)
  const prochainPalier = paliersTriés[indexActuel + 1]
  return { prix: palierActuel.prix, prochainPalier }
}

function estSansFrais(compte: Compte, evenement: Evenement): boolean {
  if (!compte.periode_sf_fin) return false
  const dateEvenement = new Date(evenement.date_debut)
  const finSF = new Date(compte.periode_sf_fin)
  return dateEvenement <= finSF
}

function formatDate(dateStr: string): string {
  const [datePart] = dateStr.split('T')
  const [year, month, day] = datePart.split('-').map(Number)
  const d = new Date(year, month - 1, day)
  return d.toLocaleDateString('fr-CA', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })
}

function formatHeure(dateStr: string): string {
  const timePart = dateStr.split('T')[1] ?? ''
  const [heure, minute] = timePart.replace('Z', '').split(':')
  return `${heure} h ${minute} (HE)`
}

function memeJour(date1: string, date2: string): boolean {
  return date1.split('T')[0] === date2.split('T')[0]
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
        const urlAchat = '/evenements/achat?evenement_id=' + ev.id
        const memeJourEv = memeJour(ev.date_debut, ev.date_fin)

        return (
          <div key={ev.id} className="bg-white rounded-2xl shadow p-6">

            {/* En-tête : nom + prix */}
            <div className="flex items-start justify-between gap-4 mb-3">
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-xl font-bold" style={{ color: '#1A2535' }}>{ev.nom}</h2>
                {ev.acces === 'platine' && (
                  <span className="px-2 py-0.5 rounded-full text-xs font-medium" style={{ backgroundColor: '#FFF8E1', color: '#C9A84C' }}>Platine</span>
                )}
              </div>

              {ev.a_billets && (
                <div className="text-right flex-shrink-0">
                  {sf ? (
                    <span className="px-3 py-1 rounded-full text-sm font-bold" style={{ backgroundColor: '#E8F5E9', color: '#4CAF7D' }}>Sans frais ✓</span>
                  ) : (
                    <>
                      <p className="text-2xl font-bold" style={{ color: '#1A2535' }}>{prix === 0 ? 'Gratuit' : prix.toFixed(2) + ' $'}</p>
                      {prochainPalier && (
                        <p className="text-xs mt-0.5" style={{ color: '#E57373' }}>{'⏰ Prix augmente le '}{new Date(prochainPalier.date_fin).toLocaleDateString('fr-CA')}</p>
                      )}
                    </>
                  )}
                </div>
              )}
            </div>

            {/* Date et heure */}
            <div className="mb-1">
              {memeJourEv ? (
                <div>
                  <p className="text-sm" style={{ color: '#666666' }}>{'📅 '}{formatDate(ev.date_debut)}</p>
                  <p className="text-sm" style={{ color: '#666666' }}>{'🕐 '}{formatHeure(ev.date_debut)} → {formatHeure(ev.date_fin)}</p>
                </div>
              ) : (
                <div>
                  <p className="text-sm" style={{ color: '#666666' }}>{'📅 '}{formatDate(ev.date_debut)} — {formatHeure(ev.date_debut)}</p>
                  <p className="text-sm" style={{ color: '#666666' }}>{'   → '}{formatDate(ev.date_fin)} — {formatHeure(ev.date_fin)}</p>
                </div>
              )}
            </div>

            {ev.lieu && <p className="text-sm mb-1" style={{ color: '#666666' }}>{'📍 '}{ev.lieu}</p>}

            {ev.villes && ev.villes.length > 0 && (
              <p className="text-sm mb-1" style={{ color: '#666666' }}>{'🏙️ '}{ev.villes.map(v => v.nom_ville).join(' · ')}</p>
            )}

            {/* Description avec scroll */}
            {ev.description && (
              <div className="mt-3 pt-3 border-t" style={{ borderColor: '#E0E0E0' }}>
                <div className="overflow-y-auto rounded-lg p-3 text-sm whitespace-pre-line" style={{ maxHeight: '120px', backgroundColor: '#F5F3EE', color: '#666666' }}>
                  {ev.description}
                </div>
              </div>
            )}

            {/* Bouton en bas */}
            {ev.a_billets && (
              <div className="mt-4 flex justify-end">
                <a href={urlAchat} className="px-6 py-2.5 rounded-lg text-white font-medium text-sm inline-block" style={{ backgroundColor: '#C9A84C' }}>
                  Acheter un billet
                </a>
              </div>
            )}

            {!ev.a_billets && (
              <p className="text-sm mt-3" style={{ color: '#666666' }}>Événement informatif</p>
            )}

          </div>
        )
      })}
    </div>
  )
}