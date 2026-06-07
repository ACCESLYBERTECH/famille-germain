'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/utils/supabase/client'
import type { Evenement } from '@/lib/types'
import FormulaireEvenement from './FormulaireEvenement'

interface Props {
  evenements: Evenement[]
}

export default function GestionEvenements({ evenements }: Props) {
  const [afficherFormulaire, setAfficherFormulaire] = useState(false)
  const [evenementModifier, setEvenementModifier] = useState<Evenement | null>(null)
  const [chargement, setChargement] = useState<string | null>(null)
  const router = useRouter()
  const supabase = createClient()

  async function toggleStatut(id: string, statut: string) {
    setChargement(id)
    const nouveau = statut === 'actif' ? 'inactif' : 'actif'
    await supabase.from('evenements').update({ statut: nouveau }).eq('id', id)
    setChargement(null)
    router.refresh()
  }

  async function dupliquer(evenement: Evenement) {
    setChargement(evenement.id)
    const { data: nouvel } = await supabase.from('evenements').insert({
      nom: `${evenement.nom} (copie)`,
      description: evenement.description,
      date_debut: evenement.date_debut,
      date_fin: evenement.date_fin,
      lieu: evenement.lieu,
      acces: evenement.acces,
      a_billets: evenement.a_billets,
      a_banquet: evenement.a_banquet,
      stripe_account: evenement.stripe_account,
      statut: 'inactif',
    }).select().single()

    if (nouvel && evenement.paliers) {
      for (const palier of evenement.paliers) {
        await supabase.from('evenement_paliers').insert({
          evenement_id: nouvel.id,
          prix: palier.prix,
          date_fin: palier.date_fin,
          ordre: palier.ordre,
        })
      }
    }

    if (nouvel && evenement.villes) {
      for (const ville of evenement.villes) {
        await supabase.from('evenement_villes').insert({
          evenement_id: nouvel.id,
          nom_ville: ville.nom_ville,
          ordre: ville.ordre,
        })
      }
    }

    setChargement(null)
    router.refresh()
  }

  function modifier(evenement: Evenement) {
    setEvenementModifier(evenement)
    setAfficherFormulaire(true)
  }

  const statutBadge = (statut: string) => {
    const styles: Record<string, { bg: string; color: string }> = {
      actif: { bg: '#E8F5E9', color: '#4CAF7D' },
      inactif: { bg: '#FFF3E0', color: '#FF9800' },
      archive: { bg: '#F5F5F5', color: '#999999' },
    }
    return styles[statut] ?? styles.inactif
  }

  return (
    <div>
      {/* Bouton créer */}
      <div className="flex justify-end mb-4">
        <button
          onClick={() => { setEvenementModifier(null); setAfficherFormulaire(true) }}
          className="px-5 py-2.5 rounded-lg text-white font-medium text-sm"
          style={{ backgroundColor: '#C9A84C' }}
        >
          + Nouvel événement
        </button>
      </div>

      {/* Formulaire */}
      {afficherFormulaire && (
        <FormulaireEvenement
          evenement={evenementModifier}
          onFermer={() => setAfficherFormulaire(false)}
          onSauvegarder={() => { setAfficherFormulaire(false); router.refresh() }}
        />
      )}

      {/* Liste */}
      <div className="bg-white rounded-2xl shadow">
        {evenements.length === 0 ? (
          <div className="p-8 text-center" style={{ color: '#666666' }}>
            Aucun événement — créez le premier !
          </div>
        ) : (
          evenements.map(ev => (
            <div key={ev.id} className="p-4 border-b flex items-start justify-between gap-4"
              style={{ borderColor: '#E0E0E0' }}>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <p className="font-semibold" style={{ color: '#1A2535' }}>{ev.nom}</p>
                  <span className="px-2 py-0.5 rounded-full text-xs font-medium"
                    style={{ backgroundColor: statutBadge(ev.statut).bg, color: statutBadge(ev.statut).color }}>
                    {ev.statut}
                  </span>
                  {ev.acces === 'platine' && (
                    <span className="px-2 py-0.5 rounded-full text-xs font-medium"
                      style={{ backgroundColor: '#FFF8E1', color: '#C9A84C' }}>
                      Platine
                    </span>
                  )}
                </div>
                <p className="text-sm" style={{ color: '#666666' }}>
                  {new Date(ev.date_debut).toLocaleDateString('fr-CA')}
                  {ev.date_fin !== ev.date_debut && ` → ${new Date(ev.date_fin).toLocaleDateString('fr-CA')}`}
                  {ev.lieu && ` · ${ev.lieu}`}
                </p>
                <p className="text-xs mt-1" style={{ color: '#999999' }}>
                  {ev.villes && ev.villes.length > 0 && `${ev.villes.map(v => v.nom_ville).join(', ')} · `}
                  {ev.paliers && ev.paliers.length > 0 && `${ev.paliers.length} palier(s) · `}
                  {ev.a_billets ? 'Avec billets' : 'Sans billets'}
                  {ev.a_banquet && ' · Banquet'}
                </p>
              </div>
              <div className="flex gap-2 flex-shrink-0">
                <button
                  onClick={() => modifier(ev)}
                  className="px-3 py-1.5 rounded-lg text-sm font-medium"
                  style={{ backgroundColor: '#F5F3EE', color: '#1A2535' }}
                >
                  Modifier
                </button>
                <button
                  onClick={() => dupliquer(ev)}
                  disabled={chargement === ev.id}
                  className="px-3 py-1.5 rounded-lg text-sm font-medium disabled:opacity-50"
                  style={{ backgroundColor: '#E3F2FD', color: '#2E86C1' }}
                >
                  Dupliquer
                </button>
                <button
                  onClick={() => toggleStatut(ev.id, ev.statut)}
                  disabled={chargement === ev.id}
                  className="px-3 py-1.5 rounded-lg text-sm font-medium text-white disabled:opacity-50"
                  style={{ backgroundColor: ev.statut === 'actif' ? '#E57373' : '#4CAF7D' }}
                >
                  {ev.statut === 'actif' ? 'Désactiver' : 'Activer'}
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}