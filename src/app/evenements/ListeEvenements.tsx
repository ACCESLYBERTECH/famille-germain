'use client'

import { useState } from 'react'
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
  if (!palierActuel) return { prix: paliersTriés[paliersTriés.length - 1].prix }
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

function formatDateCourte(dateStr: string): string {
  const [datePart] = dateStr.split('T')
  const [year, month, day] = datePart.split('-').map(Number)
  const d = new Date(year, month - 1, day)
  return d.toLocaleDateString('fr-CA', { year: 'numeric', month: 'long', day: 'numeric' })
}

function formatHeure(dateStr: string): string {
  const timePart = dateStr.split('T')[1] ?? ''
  const [heure, minute] = timePart.replace('Z', '').split(':')
  return `${heure} h ${minute} (HE)`
}

function memeJour(date1: string, date2: string): boolean {
  return date1.split('T')[0] === date2.split('T')[0]
}

function joursAvantEvenement(dateStr: string): number {
  const aujourd_hui = new Date()
  aujourd_hui.setHours(0, 0, 0, 0)
  const [datePart] = dateStr.split('T')
  const [year, month, day] = datePart.split('-').map(Number)
  const dateEv = new Date(year, month - 1, day)
  const diff = dateEv.getTime() - aujourd_hui.getTime()
  return Math.ceil(diff / (1000 * 60 * 60 * 24))
}

function joursRestantsSF(dateStr: string): number {
  const aujourd_hui = new Date()
  aujourd_hui.setHours(0, 0, 0, 0)
  const [datePart] = dateStr.split('T')
  const [year, month, day] = datePart.split('-').map(Number)
  const dateFin = new Date(year, month - 1, day)
  const diff = dateFin.getTime() - aujourd_hui.getTime()
  return Math.ceil(diff / (1000 * 60 * 60 * 24))
}

const LONGUEUR_MAX = 200

function CarteEvenement({ ev, compte }: { ev: Evenement; compte: Compte }) {
  const [descriptionExpanded, setDescriptionExpanded] = useState(false)
  const sf = estSansFrais(compte, ev)
  const { prix, prochainPalier } = getPrixActuel(ev.paliers ?? [])
  const urlAchat = '/evenements/achat?evenement_id=' + ev.id
  const memeJourEv = memeJour(ev.date_debut, ev.date_fin)
  const jours = joursAvantEvenement(ev.date_debut)
  const descriptionLongue = (ev.description ?? '').length > LONGUEUR_MAX

  return (
    <div className="rounded-2xl shadow-lg overflow-hidden" style={{ border: '1px solid #E0E0E0' }}>

      {/* En-tête navy */}
      <div className="px-6 py-4 flex items-center justify-between" style={{ backgroundColor: '#1A2535' }}>
        <div className="flex items-center gap-3 flex-wrap">
          <h2 className="text-xl font-bold text-white">{ev.nom}</h2>
          {ev.acces === 'platine' && (
            <span className="px-2 py-0.5 rounded-full text-xs font-bold" style={{ backgroundColor: '#C9A84C', color: '#1A2535' }}>★ PLATINE</span>
          )}
          {ev.a_billets && (
            <span className="px-2 py-0.5 rounded-full text-xs font-bold uppercase" style={{ backgroundColor: 'rgba(255,255,255,0.15)', color: '#C9A84C' }}>
              {memeJourEv ? 'Session' : 'Congrès'}
            </span>
          )}
          {!ev.a_billets && (
            <span className="px-2 py-0.5 rounded-full text-xs font-bold uppercase" style={{ backgroundColor: 'rgba(255,255,255,0.15)', color: '#4CAF7D' }}>Informatif</span>
          )}
        </div>

        {jours > 0 && (
          <div className="text-right flex-shrink-0">
            <p className="text-2xl font-bold" style={{ color: '#C9A84C' }}>{jours}</p>
            <p className="text-xs text-white opacity-70">jour{jours > 1 ? 's' : ''}</p>
          </div>
        )}
        {jours === 0 && (
          <span className="px-3 py-1 rounded-full text-xs font-bold" style={{ backgroundColor: '#4CAF7D', color: 'white' }}>Aujourd'hui!</span>
        )}
        {jours < 0 && (
          <span className="px-3 py-1 rounded-full text-xs font-bold" style={{ backgroundColor: 'rgba(255,255,255,0.15)', color: 'rgba(255,255,255,0.5)' }}>Terminé</span>
        )}
      </div>

      {/* Corps */}
      <div className="bg-white px-6 py-4">

        {/* Prix / Sans frais + Bouton */}
        {ev.a_billets && (
          <div className="flex items-center justify-between mb-4 pb-4" style={{ borderBottom: '1px solid #F0F0F0' }}>
            <div>
              {sf ? (
                <div className="flex items-center gap-2">
                  <span className="px-3 py-1.5 rounded-lg text-sm font-bold" style={{ backgroundColor: '#E8F5E9', color: '#4CAF7D' }}>✓ Sans frais</span>
                  <span className="text-xs" style={{ color: '#999' }}>Inclus avec votre adhésion</span>
                </div>
              ) : (
                <div>
                  <p className="text-3xl font-bold" style={{ color: '#1A2535' }}>{prix === 0 ? 'Gratuit' : prix.toFixed(2) + ' $'}</p>
                  {prochainPalier && (
                    <p className="text-xs mt-1 font-medium" style={{ color: '#E57373' }}>⏰ Prix augmente le {new Date(prochainPalier.date_fin).toLocaleDateString('fr-CA')}</p>
                  )}
                </div>
              )}
            </div>
            <a href={urlAchat} className="px-8 py-3 rounded-xl text-white font-bold text-sm transition-opacity hover:opacity-90" style={{ backgroundColor: sf ? '#4CAF7D' : '#C9A84C' }}>
              {sf ? '🎟️ Obtenir mon billet' : '🎟️ Acheter un billet'}
            </a>
          </div>
        )}

        {/* Date et heure */}
        <div className="space-y-1.5 mb-3">
          {memeJourEv ? (
            <>
              <p className="text-sm font-medium" style={{ color: '#1A2535' }}>📅 {formatDate(ev.date_debut)}</p>
              <p className="text-sm" style={{ color: '#666666' }}>🕐 {formatHeure(ev.date_debut)} → {formatHeure(ev.date_fin)}</p>
            </>
          ) : (
            <>
              <p className="text-sm font-medium" style={{ color: '#1A2535' }}>📅 {formatDate(ev.date_debut)} — {formatHeure(ev.date_debut)}</p>
              <p className="text-sm" style={{ color: '#666666' }}>{'   → '}{formatDate(ev.date_fin)} — {formatHeure(ev.date_fin)}</p>
            </>
          )}
          {ev.lieu && <p className="text-sm" style={{ color: '#666666' }}>📍 {ev.lieu}</p>}
          {ev.villes && ev.villes.length > 0 && (
            <p className="text-sm" style={{ color: '#666666' }}>🏙️ {ev.villes.map(v => v.nom_ville).join(' · ')}</p>
          )}
        </div>

        {/* Description avec Voir plus / Voir moins */}
        {ev.description && (
          <div className="mt-3 pt-3" style={{ borderTop: '1px solid #F0F0F0' }}>
            <div className="rounded-xl p-4 text-sm whitespace-pre-line leading-relaxed" style={{ backgroundColor: '#F8F7F4', color: '#555555' }}>
              {descriptionLongue && !descriptionExpanded
                ? ev.description.substring(0, LONGUEUR_MAX) + '...'
                : ev.description
              }
            </div>
            {descriptionLongue && (
              <button onClick={() => setDescriptionExpanded(!descriptionExpanded)} className="mt-2 text-xs font-medium transition-colors hover:opacity-70" style={{ color: '#C9A84C' }}>
                {descriptionExpanded ? '▲ Voir moins' : '▼ Voir plus'}
              </button>
            )}
          </div>
        )}

        {!ev.a_billets && (
          <p className="text-sm mt-2 italic" style={{ color: '#999999' }}>Aucun billet requis pour cet événement</p>
        )}

      </div>
    </div>
  )
}

export default function ListeEvenements({ evenements, compte }: Props) {
  if (evenements.length === 0) {
    return (
      <div className="bg-white rounded-2xl shadow p-8 text-center" style={{ color: '#666666' }}>
        Aucun événement disponible pour le moment.
      </div>
    )
  }

  const aujourd_hui = new Date()
  aujourd_hui.setHours(0, 0, 0, 0)
  const aUneSF = !!compte.periode_sf_fin
  const finSF = aUneSF ? new Date(compte.periode_sf_fin!.split('T')[0]) : null
  const sfActive = finSF ? finSF >= aujourd_hui : false
  const joursRestants = finSF ? joursRestantsSF(compte.periode_sf_fin!) : 0
  const expirationProche = joursRestants > 0 && joursRestants <= 30

  return (
    <div>
      {/* Bandeau sans frais actif */}
      {sfActive && (
        <div className="rounded-2xl px-5 py-4 mb-6 flex items-center justify-between" style={{ backgroundColor: expirationProche ? '#FFF8E1' : '#E8F5E9', border: `1px solid ${expirationProche ? '#FFE082' : '#A5D6A7'}` }}>
          <div className="flex items-center gap-3">
            <span className="text-2xl">✅</span>
            <div>
              <p className="font-bold text-sm" style={{ color: expirationProche ? '#F57F17' : '#2E7D32' }}>
                Programme sans frais actif
              </p>
              <p className="text-xs mt-0.5" style={{ color: expirationProche ? '#F57F17' : '#388E3C' }}>
                Valide jusqu'au <strong>{formatDateCourte(compte.periode_sf_fin!)}</strong>
                {expirationProche && ` — il reste ${joursRestants} jour${joursRestants > 1 ? 's' : ''}`}
              </p>
            </div>
          </div>
          <span className="text-xs font-bold px-3 py-1.5 rounded-full" style={{ backgroundColor: expirationProche ? '#FFE082' : '#C8E6C9', color: expirationProche ? '#F57F17' : '#2E7D32' }}>
            {joursRestants} jour{joursRestants > 1 ? 's' : ''} restant{joursRestants > 1 ? 's' : ''}
          </span>
        </div>
      )}

      <div className="grid gap-6">
        {evenements.map(ev => (
          <CarteEvenement key={ev.id} ev={ev} compte={compte} />
        ))}
      </div>
    </div>
  )
}