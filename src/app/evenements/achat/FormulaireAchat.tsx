'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { loadStripe } from '@stripe/stripe-js'
import { Elements, PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js'
import type { Compte, Evenement } from '@/lib/types'

interface Props {
  evenement: Evenement
  compte: Compte
  estSansFrais: boolean
  prix: number
  stripePublicKey: string
  nomsDejaPris: string[]
}

interface DetailPrix {
  sousTotal: number
  tps: number
  tvq: number
  fraisStripe: number
  prixTotal: number
}

const ALLERGIES_OPTIONS = [
  '🥜 Noix et arachides',
  '🌾 Gluten (céréales)',
  '🥛 Lactose (produits laitiers)',
  '🥚 Œufs',
  '🐟 Poisson',
  '🦐 Crustacés et fruits de mer',
  '🌿 Végétarien',
  '🌱 Végétalien (vegan)',
]

function SectionAllergiesPersonne({ nom, allergies, setAllergies, autreAllergie, setAutreAllergie }: {
  nom: string
  allergies: string[]
  setAllergies: (a: string[]) => void
  autreAllergie: string
  setAutreAllergie: (v: string) => void
}) {
  function toggleAllergie(allergie: string) {
    setAllergies(allergies.includes(allergie)
      ? allergies.filter(a => a !== allergie)
      : [...allergies, allergie]
    )
  }

  const prenom = nom.split(' ')[0]

  return (
    <div className="rounded-xl p-4 space-y-3" style={{ backgroundColor: '#F8F7F4', border: '1px solid #E0E0E0' }}>
      <p className="text-sm font-bold" style={{ color: '#1A2535' }}>🍽️ Allergies — <span style={{ color: '#C9A84C' }}>{prenom}</span></p>
      <p className="text-xs" style={{ color: '#666666' }}>Sélectionnez tout ce qui s'applique (optionnel)</p>
      <div className="grid grid-cols-1 gap-2">
        {ALLERGIES_OPTIONS.map(option => (
          <label key={option} className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={allergies.includes(option)} onChange={() => toggleAllergie(option)} className="rounded" />
            <span className="text-sm" style={{ color: '#1A2535' }}>{option}</span>
          </label>
        ))}
      </div>
      <div>
        <label className="block text-xs font-medium mb-1" style={{ color: '#666666' }}>✏️ Autre allergie ou précision</label>
        <input type="text" className="w-full border rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-yellow-400" style={{ borderColor: '#E0E0E0', backgroundColor: 'white' }} placeholder="Ex: intolérance au soya, diabétique..." value={autreAllergie} onChange={e => setAutreAllergie(e.target.value)} />
      </div>
    </div>
  )
}

function FormulairePaiement({ evenement, compte, nomsSelectionnes, estSansFrais, prix, detailPrix, modesParticipation }: {
  evenement: Evenement
  compte: Compte
  nomsSelectionnes: string[]
  estSansFrais: boolean
  prix: number
  detailPrix: DetailPrix
  modesParticipation: Record<string, string>
}) {
  const stripe = useStripe()
  const elements = useElements()
  const [chargement, setChargement] = useState(false)
  const [erreur, setErreur] = useState('')

  async function handlePayer() {
    if (!stripe || !elements) return
    setChargement(true)
    setErreur('')

    const nomPci = nomsSelectionnes.join(' & ')

    const { error } = await stripe.confirmPayment({
      elements,
      confirmParams: {
        return_url: `${window.location.origin}/evenements/confirmation?evenement_id=${evenement.id}&nom_pci=${encodeURIComponent(nomPci)}&noms=${encodeURIComponent(JSON.stringify(nomsSelectionnes))}&modes=${encodeURIComponent(JSON.stringify(modesParticipation))}`,
      },
    })

    if (error) {
      setErreur(error.message ?? 'Erreur de paiement.')
      setChargement(false)
    }
  }

  return (
    <div className="space-y-4">
      <PaymentElement />
      {erreur && <p className="text-sm text-center" style={{ color: '#E57373' }}>{erreur}</p>}
      <button onClick={handlePayer} disabled={chargement || !stripe} className="w-full py-3 rounded-lg text-white font-medium text-sm disabled:opacity-50" style={{ backgroundColor: '#C9A84C' }}>
        {chargement ? 'Traitement...' : `Payer ${detailPrix.prixTotal.toFixed(2)} $`}
      </button>
    </div>
  )
}

export default function FormulaireAchat({ evenement, compte, estSansFrais, prix, stripePublicKey, nomsDejaPris }: Props) {
  const router = useRouter()
  const [nomsSelectionnes, setNomsSelectionnes] = useState<string[]>([])
  const [modesParticipation, setModesParticipation] = useState<Record<string, string>>({})
  const [clientSecret, setClientSecret] = useState('')
  const [chargement, setChargement] = useState(false)
  const [erreur, setErreur] = useState('')
  const [etape, setEtape] = useState<'selection' | 'allergies' | 'paiement' | 'confirme'>('selection')
  const [detailPrix, setDetailPrix] = useState<DetailPrix>({ sousTotal: 0, tps: 0, tvq: 0, fraisStripe: 0, prixTotal: 0 })

  // Allergies par personne : { [nom]: { allergies: string[], autre: string } }
  const [allergiesParPersonne, setAllergiesParPersonne] = useState<Record<string, { allergies: string[], autre: string }>>({})

  const stripePromise = loadStripe(stripePublicKey)
  const aBanquet = (evenement as any).a_banquet

  const nomsDisponibles = [
    `${compte.prenom_1} ${compte.nom_1}`,
    ...(compte.prenom_2 && compte.nom_2 ? [`${compte.prenom_2} ${compte.nom_2}`] : [])
  ]

  function toggleNom(nom: string) {
    setNomsSelectionnes(prev => {
      const nouveau = prev.includes(nom) ? prev.filter(n => n !== nom) : [...prev, nom]
      if (!prev.includes(nom)) {
        setModesParticipation(m => ({ ...m, [nom]: 'sur_place' }))
        setAllergiesParPersonne(a => ({ ...a, [nom]: { allergies: [], autre: '' } }))
      }
      return nouveau
    })
  }

  function setMode(nom: string, mode: string) {
    setModesParticipation(m => ({ ...m, [nom]: mode }))
  }

  function setAllergiesPersonne(nom: string, allergies: string[]) {
    setAllergiesParPersonne(prev => ({ ...prev, [nom]: { ...prev[nom], allergies } }))
  }

  function setAutreAllergiePersonne(nom: string, autre: string) {
    setAllergiesParPersonne(prev => ({ ...prev, [nom]: { ...prev[nom], autre } }))
  }

  // Construire le JSON d'allergies par personne pour les metadata Stripe
  function allergiesJSON(): string | null {
    const result: Record<string, string[]> = {}
    for (const nom of nomsSelectionnes) {
      const data = allergiesParPersonne[nom]
      if (!data) continue
      const liste = [...data.allergies]
      if (data.autre.trim()) liste.push(`Autre: ${data.autre.trim()}`)
      if (liste.length > 0) result[nom] = liste
    }
    return Object.keys(result).length > 0 ? JSON.stringify(result) : null
  }

  async function handleContinuer() {
    if (nomsSelectionnes.length === 0) {
      setErreur('Veuillez sélectionner au moins un nom.'); return
    }
    setErreur('')

    if (!estSansFrais && aBanquet) {
      setEtape('allergies')
      return
    }

    await procederAchat()
  }

  async function procederAchat() {
    setChargement(true)
    setErreur('')

    const res = await fetch('/api/stripe/create-payment-intent', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        evenement_id: evenement.id,
        nom_pci: nomsSelectionnes.join(' & '),
        est_sans_frais: estSansFrais,
        quantite: nomsSelectionnes.length,
        allergies: allergiesJSON(),
        modes_participation: modesParticipation,
      }),
    })

    const data = await res.json()

    if (data.erreur) {
      setErreur(data.erreur)
      setChargement(false)
      return
    }

    if (data.sans_frais) {
      setEtape('confirme')
      setChargement(false)
      return
    }

    setDetailPrix({
      sousTotal: data.prix * nomsSelectionnes.length,
      tps: data.tps,
      tvq: data.tvq,
      fraisStripe: data.frais_stripe,
      prixTotal: data.prix_total,
    })

    setClientSecret(data.client_secret)
    setEtape('paiement')
    setChargement(false)
  }

  return (
    <div className="bg-white rounded-2xl shadow-lg p-6">

      {/* Résumé événement */}
      <div className="rounded-lg p-4 mb-6" style={{ backgroundColor: '#F5F3EE' }}>
        <p className="font-bold" style={{ color: '#1A2535' }}>{evenement.nom}</p>
        <p className="text-sm mt-1" style={{ color: '#666666' }}>
          {new Date(evenement.date_debut).toLocaleDateString('fr-CA', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
        </p>
        {evenement.lieu && <p className="text-sm" style={{ color: '#666666' }}>{evenement.lieu}</p>}
      </div>

      {/* ÉTAPE 1 — Sélection */}
      {etape === 'selection' && (
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2" style={{ color: '#1A2535' }}>Ce billet est pour :</label>
            <div className="space-y-3">
              {nomsDisponibles.map(nom => {
                const dejaPris = nomsDejaPris.includes(nom)
                const selectionne = nomsSelectionnes.includes(nom)
                const mode = modesParticipation[nom] ?? 'sur_place'
                return (
                  <div key={nom}>
                    <label className={`flex items-center gap-3 p-3 rounded-lg border ${dejaPris ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`} style={{ borderColor: selectionne ? '#C9A84C' : '#E0E0E0', backgroundColor: selectionne ? '#FFF8E1' : dejaPris ? '#F5F5F5' : 'white' }}>
                      <input type="checkbox" checked={selectionne} disabled={dejaPris} onChange={() => !dejaPris && toggleNom(nom)} />
                      <div className="flex-1">
                        <span className="font-medium" style={{ color: '#1A2535' }}>{nom}</span>
                        {dejaPris && <span className="ml-2 text-xs" style={{ color: '#E57373' }}>Billet déjà acheté</span>}
                      </div>
                    </label>

                    {/* Mode participation sous chaque nom coché */}
                    {selectionne && (
                      <div className="ml-3 mt-2 p-3 rounded-lg" style={{ backgroundColor: '#F8F7F4', border: '1px solid #E8E4DC' }}>
                        <p className="text-xs font-medium mb-2" style={{ color: '#1A2535' }}>Comment {nom.split(' ')[0]} compte-t-il assister?</p>
                        <div className="flex gap-3">
                          <label className="flex items-center gap-2 cursor-pointer flex-1 p-2 rounded-lg border transition-colors" style={{ borderColor: mode === 'sur_place' ? '#C9A84C' : '#E0E0E0', backgroundColor: mode === 'sur_place' ? '#FFF8E1' : 'white' }}>
                            <input type="radio" name={`mode-${nom}`} checked={mode === 'sur_place'} onChange={() => setMode(nom, 'sur_place')} />
                            <p className="text-xs font-medium" style={{ color: '#1A2535' }}>🏛️ Sur place</p>
                          </label>
                          <label className="flex items-center gap-2 cursor-pointer flex-1 p-2 rounded-lg border transition-colors" style={{ borderColor: mode === 'virtuel' ? '#2E86C1' : '#E0E0E0', backgroundColor: mode === 'virtuel' ? '#E3F2FD' : 'white' }}>
                            <input type="radio" name={`mode-${nom}`} checked={mode === 'virtuel'} onChange={() => setMode(nom, 'virtuel')} />
                            <p className="text-xs font-medium" style={{ color: '#1A2535' }}>💻 Virtuel</p>
                          </label>
                        </div>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>

          {/* Détail du prix */}
          <div className="border-t pt-4 space-y-2" style={{ borderColor: '#E0E0E0' }}>
            {estSansFrais ? (
              <div className="flex justify-between items-center">
                <span className="text-sm" style={{ color: '#666666' }}>Billet{nomsSelectionnes.length > 1 ? 's' : ''}</span>
                <span className="font-bold" style={{ color: '#4CAF7D' }}>Sans frais</span>
              </div>
            ) : nomsSelectionnes.length > 0 ? (
              <>
                <div className="flex justify-between text-sm" style={{ color: '#666666' }}>
                  <span>Sous-total ({nomsSelectionnes.length} billet{nomsSelectionnes.length > 1 ? 's' : ''} × {prix.toFixed(2)} $)</span>
                  <span>{(prix * nomsSelectionnes.length).toFixed(2)} $</span>
                </div>
                <div className="flex justify-between text-sm" style={{ color: '#666666' }}>
                  <span>TPS (5%)</span>
                  <span>{(prix * nomsSelectionnes.length * 0.05).toFixed(2)} $</span>
                </div>
                <div className="flex justify-between text-sm" style={{ color: '#666666' }}>
                  <span>TVQ (9.975%)</span>
                  <span>{(prix * nomsSelectionnes.length * 0.09975).toFixed(2)} $</span>
                </div>
                <div className="flex justify-between text-sm" style={{ color: '#666666' }}>
                  <span>Frais de traitement</span>
                  <span>calculés au prochain écran</span>
                </div>
                <div className="flex justify-between font-bold border-t pt-2" style={{ borderColor: '#E0E0E0', color: '#1A2535' }}>
                  <span>Total estimé</span>
                  <span>{(prix * nomsSelectionnes.length * 1.14975).toFixed(2)} $+</span>
                </div>
              </>
            ) : (
              <div className="flex justify-between text-sm" style={{ color: '#666666' }}>
                <span>Prix par billet</span>
                <span>{prix.toFixed(2)} $ + taxes</span>
              </div>
            )}
          </div>

          {erreur && <p className="text-sm text-center" style={{ color: '#E57373' }}>{erreur}</p>}

          <button onClick={handleContinuer} disabled={chargement || nomsSelectionnes.length === 0} className="w-full py-3 rounded-lg text-white font-medium text-sm disabled:opacity-50" style={{ backgroundColor: '#C9A84C' }}>
            {chargement ? 'Chargement...' : estSansFrais ? 'Confirmer — Sans frais' : 'Continuer →'}
          </button>
        </div>
      )}

      {/* ÉTAPE 1.5 — Allergies par personne (billet payant avec banquet) */}
      {etape === 'allergies' && (
        <div className="space-y-4">
          <div className="rounded-lg p-3" style={{ backgroundColor: '#FFF8E1', border: '1px solid #FFE082' }}>
            <p className="text-sm font-medium" style={{ color: '#1A2535' }}>🍽️ Le banquet est inclus avec votre billet</p>
            <p className="text-xs mt-1" style={{ color: '#666666' }}>Indiquez les allergies ou restrictions alimentaires pour chaque personne.</p>
          </div>

          {/* Un tableau par personne sélectionnée */}
          {nomsSelectionnes.map(nom => (
            <SectionAllergiesPersonne
              key={nom}
              nom={nom}
              allergies={allergiesParPersonne[nom]?.allergies ?? []}
              setAllergies={(a) => setAllergiesPersonne(nom, a)}
              autreAllergie={allergiesParPersonne[nom]?.autre ?? ''}
              setAutreAllergie={(v) => setAutreAllergiePersonne(nom, v)}
            />
          ))}

          {erreur && <p className="text-sm text-center" style={{ color: '#E57373' }}>{erreur}</p>}

          <button onClick={procederAchat} disabled={chargement} className="w-full py-3 rounded-lg text-white font-medium text-sm disabled:opacity-50" style={{ backgroundColor: '#C9A84C' }}>
            {chargement ? 'Chargement...' : 'Continuer vers le paiement →'}
          </button>

          <button onClick={() => setEtape('selection')} className="w-full py-2 rounded-lg text-sm font-medium" style={{ color: '#666666', backgroundColor: '#F5F3EE' }}>
            ← Retour
          </button>
        </div>
      )}

      {/* ÉTAPE 2 — Paiement Stripe */}
      {etape === 'paiement' && clientSecret && (
        <div className="space-y-4">
          <p className="text-sm font-medium" style={{ color: '#1A2535' }}>
            Billet{nomsSelectionnes.length > 1 ? 's' : ''} pour : <strong>{nomsSelectionnes.join(' & ')}</strong>
          </p>

          {/* Résumé modes participation */}
          <div className="rounded-lg p-3 text-xs space-y-1" style={{ backgroundColor: '#F8F7F4', border: '1px solid #E0E0E0' }}>
            {nomsSelectionnes.map(nom => (
              <p key={nom} style={{ color: '#666666' }}>
                {nom} : <strong style={{ color: '#1A2535' }}>{modesParticipation[nom] === 'virtuel' ? '💻 Virtuel' : '🏛️ Sur place'}</strong>
              </p>
            ))}
          </div>

          {/* Résumé allergies par personne */}
          {nomsSelectionnes.some(nom => {
            const d = allergiesParPersonne[nom]
            return d && (d.allergies.length > 0 || d.autre.trim())
          }) && (
            <div className="rounded-lg p-3 text-xs space-y-2" style={{ backgroundColor: '#FFF8E1', border: '1px solid #FFE082' }}>
              <p className="font-medium" style={{ color: '#1A2535' }}>🍽️ Allergies enregistrées :</p>
              {nomsSelectionnes.map(nom => {
                const d = allergiesParPersonne[nom]
                if (!d || (d.allergies.length === 0 && !d.autre.trim())) return null
                const liste = [...d.allergies, d.autre.trim() ? `Autre: ${d.autre.trim()}` : ''].filter(Boolean)
                return (
                  <p key={nom} style={{ color: '#666666' }}>
                    <strong>{nom.split(' ')[0]} :</strong> {liste.join(', ')}
                  </p>
                )
              })}
            </div>
          )}

          {/* Détail final du prix */}
          <div className="rounded-lg p-4 space-y-2 text-sm" style={{ backgroundColor: '#F5F3EE' }}>
            <div className="flex justify-between" style={{ color: '#666666' }}>
              <span>Sous-total ({nomsSelectionnes.length} billet{nomsSelectionnes.length > 1 ? 's' : ''})</span>
              <span>{detailPrix.sousTotal.toFixed(2)} $</span>
            </div>
            <div className="flex justify-between" style={{ color: '#666666' }}>
              <span>TPS (5%)</span>
              <span>{detailPrix.tps.toFixed(2)} $</span>
            </div>
            <div className="flex justify-between" style={{ color: '#666666' }}>
              <span>TVQ (9.975%)</span>
              <span>{detailPrix.tvq.toFixed(2)} $</span>
            </div>
            <div className="flex justify-between" style={{ color: '#666666' }}>
              <span>Frais de traitement</span>
              <span>{detailPrix.fraisStripe.toFixed(2)} $</span>
            </div>
            <div className="flex justify-between font-bold border-t pt-2" style={{ borderColor: '#C9A84C', color: '#1A2535' }}>
              <span>Total</span>
              <span>{detailPrix.prixTotal.toFixed(2)} $</span>
            </div>
          </div>

          <Elements stripe={stripePromise} options={{ clientSecret }}>
            <FormulairePaiement evenement={evenement} compte={compte} nomsSelectionnes={nomsSelectionnes} estSansFrais={estSansFrais} prix={prix} detailPrix={detailPrix} modesParticipation={modesParticipation} />
          </Elements>
        </div>
      )}

      {/* ÉTAPE 3 — Confirmation sans frais */}
      {etape === 'confirme' && (
        <div className="text-center space-y-4">
          <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto" style={{ backgroundColor: '#4CAF7D' }}>
            <span className="text-white text-3xl">✓</span>
          </div>
          <p className="font-bold text-lg" style={{ color: '#1A2535' }}>Billet{nomsSelectionnes.length > 1 ? 's' : ''} confirmé{nomsSelectionnes.length > 1 ? 's' : ''} !</p>
          <p className="text-sm" style={{ color: '#666666' }}>
            Votre billet sans frais pour <strong>{nomsSelectionnes.join(' & ')}</strong> a été créé avec succès.
          </p>
          <button onClick={() => router.push('/evenements/mes-billets')} className="w-full py-3 rounded-lg text-white font-medium text-sm" style={{ backgroundColor: '#C9A84C' }}>
            Voir mes billets
          </button>
        </div>
      )}
    </div>
  )
}