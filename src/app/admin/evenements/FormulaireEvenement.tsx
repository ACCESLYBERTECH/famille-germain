'use client'

import { useState } from 'react'
import { createClient } from '@/utils/supabase/client'
import type { Evenement, EvenementPalier, EvenementVille } from '@/lib/types'
import { braceletsEvenement, PALETTE_BRACELETS, LIBELLES_BRACELETS, couleurTexte, type TypeBracelet, type Bracelet } from '@/lib/bracelets'

interface Props {
  evenement: Evenement | null
  onFermer: () => void
  onSauvegarder: () => void
}

export default function FormulaireEvenement({ evenement, onFermer, onSauvegarder }: Props) {
  const supabase = createClient()
  const [chargement, setChargement] = useState(false)
  const [erreur, setErreur] = useState('')

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
    a_bracelets: (evenement as any)?.a_bracelets ?? true,
  })

  // Couleurs des bracelets (événement avec banquet)
  const [bracelets, setBracelets] = useState<Record<TypeBracelet, Bracelet>>(braceletsEvenement(evenement))
  const typesBracelets: TypeBracelet[] = ['regulier', 'sf_banquet', 'sf_sans_banquet']

  function updateBracelet(type: TypeBracelet, champ: keyof Bracelet, valeur: string) {
    setBracelets(b => ({ ...b, [type]: { ...b[type], [champ]: valeur } }))
  }

  function choisirPastille(type: TypeBracelet, pastille: Bracelet) {
    setBracelets(b => ({ ...b, [type]: { couleur: pastille.couleur, nom: pastille.nom } }))
  }

  function champsBracelets() {
    return {
      bracelet_regulier_couleur: bracelets.regulier.couleur,
      bracelet_regulier_nom: bracelets.regulier.nom.trim() || null,
      bracelet_sf_banquet_couleur: bracelets.sf_banquet.couleur,
      bracelet_sf_banquet_nom: bracelets.sf_banquet.nom.trim() || null,
      bracelet_sf_sans_banquet_couleur: bracelets.sf_sans_banquet.couleur,
      bracelet_sf_sans_banquet_nom: bracelets.sf_sans_banquet.nom.trim() || null,
    }
  }

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

  async function gererBanquet(action: string, evenementId: string) {
    await fetch('/api/admin/banquet', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action,
        evenement_id: evenementId,
        nom: form.nom_banquet,
        prix: form.prix_banquet,
        banquet_id: banquetExistant?.id,
      }),
    })
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
        a_bracelets: form.a_bracelets,
        ...champsBracelets(),
      }).eq('id', evenement.id)

      await supabase.from('evenement_paliers').delete().eq('evenement_id', evenement.id)

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

      // Villes : on garde les mêmes identifiants (les portiers et les billets scannés y sont liés).
      // Avant : on effaçait puis recréait toutes les villes. L'effacement était refusé
      // (ville liée à un portier ou à un billet scanné) et les villes se dupliquaient.
      const villesGardees = villes.filter(v => v.nom_ville?.trim())
      for (let i = 0; i < villesGardees.length; i++) {
        const ville = villesGardees[i]
        if (ville.id) {
          await supabase.from('evenement_villes').update({ nom_ville: ville.nom_ville!.trim(), ordre: i + 1 }).eq('id', ville.id)
        } else {
          await supabase.from('evenement_villes').insert({ evenement_id: evenement.id, nom_ville: ville.nom_ville!.trim(), ordre: i + 1 })
        }
      }

      // Villes retirées du formulaire
      const villesRetirees = (evenement.villes ?? []).filter(e => !villesGardees.some(v => v.id === e.id))
      const villesNonRetirees: string[] = []
      for (const ville of villesRetirees) {
        const { error } = await supabase.from('evenement_villes').delete().eq('id', ville.id)
        if (error) villesNonRetirees.push(ville.nom_ville)
      }
      if (villesNonRetirees.length > 0) {
        alert(`Ville(s) non retirée(s) : ${villesNonRetirees.join(', ')}.\nElles sont liées à un portier ou à des billets déjà scannés. Changez d'abord la ville du portier dans la page Portiers.`)
      }

      // Gérer le banquet via API
      if (form.a_banquet) {
        if (banquetExistant) {
          await gererBanquet('modifier', evenement.id)
        } else {
          await gererBanquet('creer', evenement.id)
        }
      } else {
        if (banquetExistant) {
          await gererBanquet('supprimer', evenement.id)
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
        a_bracelets: form.a_bracelets,
        ...champsBracelets(),
        statut: 'inactif',
      }).select().single()

      if (nouvel) {
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
          await gererBanquet('creer', nouvel.id)
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

              {/* Avec ou sans bracelets */}
              <label className="flex items-center gap-2 cursor-pointer pt-3 border-t" style={{ borderColor: '#E0E0E0' }}>
                <input type="checkbox" checked={form.a_bracelets} onChange={e => update('a_bracelets', e.target.checked)} />
                <span className="text-sm font-medium" style={{ color: '#1A2535' }}>🎗️ Avec bracelets</span>
                <span className="text-xs" style={{ color: '#666666' }}>(congrès de fin de semaine)</span>
              </label>

              {/* Couleurs des bracelets */}
              {form.a_bracelets && (
              <div className="space-y-4">
                <div>
                  <p className="text-xs font-bold uppercase tracking-wide" style={{ color: '#C9A84C' }}>🎗️ Couleurs des bracelets</p>
                  <p className="text-xs mt-1" style={{ color: '#666666' }}>Le scanner affiche la couleur et le nom du bracelet à remettre. Modifiable jusqu'au jour du congrès.</p>
                </div>
                {typesBracelets.map(type => (
                  <div key={type} className="rounded-lg p-3 space-y-2" style={{ backgroundColor: 'white', border: '1px solid #E0E0E0' }}>
                    <div className="flex items-center gap-3">
                      <div className="px-3 py-1.5 rounded-lg text-xs font-bold flex-shrink-0" style={{ backgroundColor: bracelets[type].couleur, color: couleurTexte(bracelets[type].couleur), border: '1px solid #CCCCCC' }}>
                        {bracelets[type].nom || 'Sans nom'}
                      </div>
                      <span className="text-sm font-medium" style={{ color: '#1A2535' }}>{LIBELLES_BRACELETS[type]}</span>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {PALETTE_BRACELETS.map(p => (
                        <button key={p.nom} type="button" title={p.nom} onClick={() => choisirPastille(type, p)} className="w-7 h-7 rounded-full" style={{ backgroundColor: p.couleur, border: bracelets[type].couleur.toUpperCase() === p.couleur.toUpperCase() ? '3px solid #1A2535' : '1px solid #CCCCCC' }} />
                      ))}
                      <label className="w-7 h-7 rounded-full flex items-center justify-center cursor-pointer text-xs" title="Autre couleur" style={{ border: '1px dashed #999999', color: '#666666' }}>
                        +
                        <input type="color" className="sr-only" value={bracelets[type].couleur} onChange={e => updateBracelet(type, 'couleur', e.target.value)} />
                      </label>
                    </div>
                    <div className="flex items-center gap-2">
                      <label className="text-xs flex-shrink-0" style={{ color: '#666666' }}>Nom affiché</label>
                      <input className="flex-1 min-w-0 border rounded-lg px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-yellow-400" style={{ borderColor: '#E0E0E0' }} value={bracelets[type].nom} onChange={e => updateBracelet(type, 'nom', e.target.value)} placeholder="Ex: Rouge" />
                    </div>
                  </div>
                ))}
              </div>
              )}
            </div>
          )}

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