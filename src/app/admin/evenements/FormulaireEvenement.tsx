'use client'

import { useState } from 'react'
import { createClient } from '@/utils/supabase/client'
import type { Evenement, EvenementPalier, EvenementVille } from '@/lib/types'

interface Props {
  evenement: Evenement | null
  onFermer: () => void
  onSauvegarder: () => void
}

export default function FormulaireEvenement({ evenement, onFermer, onSauvegarder }: Props) {
  const supabase = createClient()
  const [chargement, setChargement] = useState(false)
  const [erreur, setErreur] = useState('')

  // Récupérer le banquet existant si modification
  const banquetExistant = (evenement as any)?.banquet?.[0] ?? null

  const [form, setForm] = useState({
    nom: evenement?.nom ?? '',
    description: evenement?.description ?? '',
    date_debut: evenement?.date_debut ? evenement.date_debut.slice(0, 16) : '',
    date_fin: evenement?.date_fin ? evenement.date_fin.slice(0, 16) : '',
    lieu: evenement?.lieu ?? '',
    acces: evenement?.acces ?? 'public',
    a_billets: evenement?.a_billets ?? true,
    a_banquet: evenement?.a_banquet ?? false,
    stripe_account: evenement?.stripe_account ?? 'principal',
    prix_banquet: banquetExistant?.prix ?? '',
    nom_banquet: banquetExistant?.nom ?? 'Banquet',
  })

  const [paliers, setPaliers] = useState<Partial<EvenementPalier>[]>(
    evenement?.paliers?.length ? evenement.paliers : [{ prix: 0, date_fin: '', ordre: 1 }]
  )

  const [villes, setVilles] = useState<Partial<EvenementVille>[]>(
    evenement?.villes?.length ? evenement.villes : [{ nom_ville: '', ordre: 1 }]
  )

  function update(champ: string, valeur: string | boolean) {
    setForm(f => ({ ...f, [champ]: valeur }))
  }

  function ajouterPalier() {
    if (paliers.length >= 4) return
    setPaliers(p => [...p, { prix: 0, date_fin: '', ordre: p.length + 1 }])
  }

  function supprimerPalier(index: number) {
    setPaliers(p => p.filter((_, i) => i !== index))
  }

  function updatePalier(index: number, champ: string, valeur: string | number) {
    setPaliers(p => p.map((pal, i) => i === index ? { ...pal, [champ]: valeur } : pal))
  }

  function ajouterVille() {
    setVilles(v => [...v, { nom_ville: '', ordre: v.length + 1 }])
  }

  function supprimerVille(index: number) {
    setVilles(v => v.filter((_, i) => i !== index))
  }

  function updateVille(index: number, valeur: string) {
    setVilles(v => v.map((ville, i) => i === index ? { ...ville, nom_ville: valeur } : ville))
  }

  async function handleSauvegarder() {
    setErreur('')
    if (!form.nom || !form.date_debut || !form.date_fin) {
      setErreur('Veuillez remplir le nom et les dates.'); return
    }
    if (form.a_banquet && !form.prix_banquet) {
      setErreur('Veuillez entrer un prix pour le banquet.'); return
    }
    setChargement(true)

    let evenementId = evenement?.id

    if (evenement) {
      await supabase.from('evenements').update({
        nom: form.nom,
        description: form.description || null,
        date_debut: form.date_debut,
        date_fin: form.date_fin,
        lieu: form.lieu || null,
        acces: form.acces,
        a_billets: form.a_billets,
        a_banquet: form.a_banquet,
        stripe_account: form.stripe_account,
      }).eq('id', evenement.id)

      await supabase.from('evenement_paliers').delete().eq('evenement_id', evenement.id)
      await supabase.from('evenement_villes').delete().eq('evenement_id', evenement.id)

      for (const palier of paliers) {
        if (palier.prix && palier.date_fin) {
          await supabase.from('evenement_paliers').insert({
            evenement_id: evenement.id,
            prix: palier.prix,
            date_fin: palier.date_fin,
            ordre: palier.ordre,
          })
        }
      }

      for (const ville of villes) {
        if (ville.nom_ville) {
          await supabase.from('evenement_villes').insert({
            evenement_id: evenement.id,
            nom_ville: ville.nom_ville,
            ordre: ville.ordre,
          })
        }
      }

      // Gérer le banquet
      if (form.a_banquet) {
        if (banquetExistant) {
          await supabase.from('banquets').update({
            nom: form.nom_banquet,
            prix: parseFloat(form.prix_banquet as string),
          }).eq('id', banquetExistant.id)
        } else {
          await supabase.from('banquets').insert({
            evenement_id: evenement.id,
            nom: form.nom_banquet,
            prix: parseFloat(form.prix_banquet as string),
            statut: 'actif',
          })
        }
      } else {
        // Si on décoche le banquet, supprimer l'entrée
        if (banquetExistant) {
          await supabase.from('banquets').delete().eq('id', banquetExistant.id)
        }
      }

    } else {
      const { data: nouvel } = await supabase.from('evenements').insert({
        nom: form.nom,
        description: form.description || null,
        date_debut: form.date_debut,
        date_fin: form.date_fin,
        lieu: form.lieu || null,
        acces: form.acces,
        a_billets: form.a_billets,
        a_banquet: form.a_banquet,
        stripe_account: form.stripe_account,
        statut: 'inactif',
      }).select().single()

      if (nouvel) {
        evenementId = nouvel.id

        for (const palier of paliers) {
          if (palier.prix && palier.date_fin) {
            await supabase.from('evenement_paliers').insert({
              evenement_id: nouvel.id,
              prix: palier.prix,
              date_fin: palier.date_fin,
              ordre: palier.ordre,
            })
          }
        }

        for (const ville of villes) {
          if (ville.nom_ville) {
            await supabase.from('evenement_villes').insert({
              evenement_id: nouvel.id,
              nom_ville: ville.nom_ville,
              ordre: ville.ordre,
            })
          }
        }

        if (form.a_banquet) {
          await supabase.from('banquets').insert({
            evenement_id: nouvel.id,
            nom: form.nom_banquet,
            prix: parseFloat(form.prix_banquet as string),
            statut: 'actif',
          })
        }
      }
    }

    setChargement(false)
    onSauvegarder()
  }

  const inputClass = "w-full border rounded-lg px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-yellow-400"
  const labelClass = "block text-sm font-medium mb-1"

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">

        <div className="flex items-center justify-between p-6 border-b" style={{ borderColor: '#E0E0E0' }}>
          <h2 className="text-lg font-bold" style={{ color: '#1A2535' }}>
            {evenement ? "Modifier l'événement" : 'Nouvel événement'}
          </h2>
          <button onClick={onFermer} className="text-gray-400 hover:text-gray-600 text-2xl">×</button>
        </div>

        <div className="p-6 space-y-5">

          <div>
            <label className={labelClass} style={{ color: '#1A2535' }}>Nom de l'événement *</label>
            <input className={inputClass} style={{ borderColor: '#E0E0E0' }} value={form.nom} onChange={e => update('nom', e.target.value)} />
          </div>

          <div>
            <label className={labelClass} style={{ color: '#1A2535' }}>Description</label>
            <textarea className={inputClass} style={{ borderColor: '#E0E0E0' }} rows={3} value={form.description} onChange={e => update('description', e.target.value)} />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelClass} style={{ color: '#1A2535' }}>Date de début *</label>
              <input type="datetime-local" className={inputClass} style={{ borderColor: '#E0E0E0' }} value={form.date_debut} onChange={e => update('date_debut', e.target.value)} />
            </div>
            <div>
              <label className={labelClass} style={{ color: '#1A2535' }}>Date de fin *</label>
              <input type="datetime-local" className={inputClass} style={{ borderColor: '#E0E0E0' }} value={form.date_fin} onChange={e => update('date_fin', e.target.value)} />
            </div>
          </div>

          <div>
            <label className={labelClass} style={{ color: '#1A2535' }}>Lieu</label>
            <input className={inputClass} style={{ borderColor: '#E0E0E0' }} value={form.lieu} onChange={e => update('lieu', e.target.value)} />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelClass} style={{ color: '#1A2535' }}>Accès</label>
              <select className={inputClass} style={{ borderColor: '#E0E0E0' }} value={form.acces} onChange={e => update('acces', e.target.value)}>
                <option value="public">Public (tous PCI)</option>
                <option value="platine">Platine+ seulement</option>
              </select>
            </div>
            <div>
              <label className={labelClass} style={{ color: '#1A2535' }}>Compte Stripe</label>
              <select className={inputClass} style={{ borderColor: '#E0E0E0' }} value={form.stripe_account} onChange={e => update('stripe_account', e.target.value)}>
                <option value="principal">Principal (billets)</option>
                <option value="banquet">Banquet</option>
              </select>
            </div>
          </div>

          {/* Toggles */}
          <div className="flex gap-6">
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={form.a_billets} onChange={e => update('a_billets', e.target.checked)} />
              <span className="text-sm" style={{ color: '#1A2535' }}>Avec billets</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={form.a_banquet} onChange={e => update('a_banquet', e.target.checked)} />
              <span className="text-sm" style={{ color: '#1A2535' }}>Avec banquet</span>
            </label>
          </div>

          {/* Prix du banquet — visible seulement si a_banquet coché */}
          {form.a_banquet && (
            <div className="rounded-xl p-4 space-y-3" style={{ backgroundColor: '#F5F3EE', border: '1px solid #E0E0E0' }}>
              <p className="text-xs font-bold uppercase tracking-wide" style={{ color: '#C9A84C' }}>Configuration du banquet</p>
              <div>
                <label className={labelClass} style={{ color: '#1A2535' }}>Nom du banquet</label>
                <input className={inputClass} style={{ borderColor: '#E0E0E0', backgroundColor: 'white' }} value={form.nom_banquet} onChange={e => update('nom_banquet', e.target.value)} placeholder="Ex: Banquet du Congrès Été 2026" />
              </div>
              <div>
                <label className={labelClass} style={{ color: '#1A2535' }}>Prix du banquet ($) *</label>
                <input type="number" step="0.01" min="0" className={inputClass} style={{ borderColor: '#E0E0E0', backgroundColor: 'white' }} value={form.prix_banquet} onChange={e => update('prix_banquet', e.target.value)} placeholder="Ex: 75.00" />
                <p className="text-xs mt-1" style={{ color: '#666666' }}>TPS, TVQ et frais de traitement seront ajoutés automatiquement</p>
              </div>
            </div>
          )}

          {/* Villes */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className={labelClass} style={{ color: '#1A2535' }}>Villes</label>
              <button onClick={ajouterVille} className="text-sm" style={{ color: '#2E86C1' }}>+ Ajouter</button>
            </div>
            <div className="space-y-2">
              {villes.map((ville, i) => (
                <div key={i} className="flex gap-2">
                  <input className={inputClass} style={{ borderColor: '#E0E0E0' }} placeholder={`Ville ${i + 1}`} value={ville.nom_ville} onChange={e => updateVille(i, e.target.value)} />
                  {villes.length > 1 && (
                    <button onClick={() => supprimerVille(i)} className="text-red-400 hover:text-red-600 px-2">×</button>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Paliers de prix */}
          {form.a_billets && (
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className={labelClass} style={{ color: '#1A2535' }}>Paliers de prix (max. 4)</label>
                {paliers.length < 4 && (
                  <button onClick={ajouterPalier} className="text-sm" style={{ color: '#2E86C1' }}>+ Ajouter</button>
                )}
              </div>
              <div className="space-y-2">
                {paliers.map((palier, i) => (
                  <div key={i} className="flex gap-2 items-center">
                    <div className="w-8 text-sm text-center font-medium" style={{ color: '#666666' }}>#{i + 1}</div>
                    <input type="number" className={inputClass} style={{ borderColor: '#E0E0E0' }} placeholder="Prix ($)" value={palier.prix || ''} onChange={e => updatePalier(i, 'prix', parseFloat(e.target.value))} />
                    <input type="datetime-local" className={inputClass} style={{ borderColor: '#E0E0E0' }} value={palier.date_fin ? palier.date_fin.slice(0, 16) : ''} onChange={e => updatePalier(i, 'date_fin', e.target.value)} />
                    {paliers.length > 1 && (
                      <button onClick={() => supprimerPalier(i)} className="text-red-400 hover:text-red-600 px-2">×</button>
                    )}
                  </div>
                ))}
              </div>
              <p className="text-xs mt-1" style={{ color: '#666666' }}>Le prix change automatiquement à la date de fin de chaque palier.</p>
            </div>
          )}

          {erreur && <p className="text-sm text-center" style={{ color: '#E57373' }}>{erreur}</p>}

        </div>

        <div className="flex justify-between p-6 border-t" style={{ borderColor: '#E0E0E0' }}>
          <button onClick={onFermer} className="px-4 py-2 rounded-lg text-sm" style={{ color: '#666666', backgroundColor: '#F5F3EE' }}>Annuler</button>
          <button onClick={handleSauvegarder} disabled={chargement} className="px-6 py-2 rounded-lg text-sm font-medium text-white disabled:opacity-50" style={{ backgroundColor: '#C9A84C' }}>
            {chargement ? 'Sauvegarde...' : evenement ? 'Sauvegarder' : 'Créer'}
          </button>
        </div>

      </div>
    </div>
  )
}