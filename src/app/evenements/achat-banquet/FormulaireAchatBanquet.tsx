'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { loadStripe } from '@stripe/stripe-js'
import { Elements, PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js'

interface Banquet {
  id: string
  nom: string
  prix: number
  evenement: {
    nom: string
    date_debut: string
    lieu: string | null
  }
}

interface Billet {
  id: string
  nom_pci: string
}

interface Compte {
  id: string
  prenom_1: string
  nom_1: string
  courriel: string
}

interface DetailPrix {
  sousTotal: number
  tps: number
  tvq: number
  fraisStripe: number
  prixTotal: number
}

interface Props {
  banquet: Banquet
  billet: Billet
  compte: Compte
  stripePublicKey: string
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

function SectionAllergies({ allergies, setAllergies, autreAllergie, setAutreAllergie }: {
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

  return (
    <div className="rounded-xl p-4 space-y-3" style={{ backgroundColor: '#F8F7F4', border: '1px solid #E0E0E0' }}>
      <p className="text-sm font-bold" style={{ color: '#1A2535' }}>🍽️ Allergies et restrictions alimentaires</p>
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

function FormulairePaiementBanquet({ detailPrix, banquet, billet }: {
  detailPrix: DetailPrix
  banquet: Banquet
  billet: Billet
}) {
  const stripe = useStripe()
  const elements = useElements()
  const [chargement, setChargement] = useState(false)
  const [erreur, setErreur] = useState('')

  async function handlePayer() {
    if (!stripe || !elements) return
    setChargement(true)
    setErreur('')

    const { error } = await stripe.confirmPayment({
      elements,
      confirmParams: {
        return_url: `${window.location.origin}/evenements/confirmation-banquet?banquet_id=${banquet.id}&billet_id=${billet.id}`,
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

export default function FormulaireAchatBanquet({ banquet, billet, compte, stripePublicKey }: Props) {
  const router = useRouter()
  const [clientSecret, setClientSecret] = useState('')
  const [chargement, setChargement] = useState(false)
  const [erreur, setErreur] = useState('')
  const [etape, setEtape] = useState<'allergies' | 'paiement'>('allergies')
  const [detailPrix, setDetailPrix] = useState<DetailPrix>({ sousTotal: 0, tps: 0, tvq: 0, fraisStripe: 0, prixTotal: 0 })
  const [allergies, setAllergies] = useState<string[]>([])
  const [autreAllergie, setAutreAllergie] = useState('')

  const stripePromise = loadStripe(stripePublicKey)

  const sousTotal = banquet.prix
  const tpsEstimee = Math.round(sousTotal * 0.05 * 100) / 100
  const tvqEstimee = Math.round(sousTotal * 0.09975 * 100) / 100

  function allergiesJSON(): string | null {
    const liste = [...allergies]
    if (autreAllergie.trim()) liste.push(`Autre: ${autreAllergie.trim()}`)
    return liste.length > 0 ? JSON.stringify(liste) : null
  }

  async function handleContinuer() {
    setChargement(true)
    setErreur('')

    const res = await fetch('/api/stripe/create-payment-intent-banquet', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        banquet_id: banquet.id,
        billet_id: billet.id,
        allergies: allergiesJSON(),
      }),
    })

    const data = await res.json()

    if (data.erreur) {
      setErreur(data.erreur)
      setChargement(false)
      return
    }

    setDetailPrix({
      sousTotal: data.sous_total,
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

      {/* Résumé */}
      <div className="rounded-lg p-4 mb-6" style={{ backgroundColor: '#F5F3EE' }}>
        <p className="font-bold" style={{ color: '#1A2535' }}>{banquet.nom}</p>
        <p className="text-sm mt-1" style={{ color: '#666666' }}>{banquet.evenement.nom}</p>
        <p className="text-sm mt-1" style={{ color: '#666666' }}>
          {new Date(banquet.evenement.date_debut).toLocaleDateString('fr-CA', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
        </p>
        {banquet.evenement.lieu && <p className="text-sm" style={{ color: '#666666' }}>📍 {banquet.evenement.lieu}</p>}
        <p className="text-sm mt-2 font-medium" style={{ color: '#1A2535' }}>Billet pour : <strong>{billet.nom_pci}</strong></p>
      </div>

      {/* ÉTAPE 1 — Allergies */}
      {etape === 'allergies' && (
        <div className="space-y-4">

          {/* Avertissement non remboursable */}
          <div className="rounded-lg p-3 flex items-start gap-2" style={{ backgroundColor: '#FFF3E0', border: '1px solid #FFCC80' }}>
            <span>⚠️</span>
            <p className="text-xs" style={{ color: '#E65100' }}>
              <strong>Non remboursable</strong> — L'achat du banquet est final et ne peut pas être remboursé.
            </p>
          </div>

          {/* Section allergies */}
          <SectionAllergies
            allergies={allergies}
            setAllergies={setAllergies}
            autreAllergie={autreAllergie}
            setAutreAllergie={setAutreAllergie}
          />

          {/* Détail estimé */}
          <div className="space-y-2 border-t pt-4" style={{ borderColor: '#F0F0F0' }}>
            <div className="flex justify-between text-sm" style={{ color: '#666666' }}>
              <span>Sous-total</span>
              <span>{sousTotal.toFixed(2)} $</span>
            </div>
            <div className="flex justify-between text-sm" style={{ color: '#666666' }}>
              <span>TPS (5%)</span>
              <span>{tpsEstimee.toFixed(2)} $</span>
            </div>
            <div className="flex justify-between text-sm" style={{ color: '#666666' }}>
              <span>TVQ (9.975%)</span>
              <span>{tvqEstimee.toFixed(2)} $</span>
            </div>
            <div className="flex justify-between text-sm" style={{ color: '#666666' }}>
              <span>Frais de traitement</span>
              <span>calculés au prochain écran</span>
            </div>
            <div className="flex justify-between font-bold border-t pt-2" style={{ borderColor: '#E0E0E0', color: '#1A2535' }}>
              <span>Total estimé</span>
              <span>{(sousTotal * 1.14975).toFixed(2)} $+</span>
            </div>
          </div>

          {erreur && <p className="text-sm text-center" style={{ color: '#E57373' }}>{erreur}</p>}

          <button onClick={handleContinuer} disabled={chargement} className="w-full py-3 rounded-lg text-white font-medium text-sm disabled:opacity-50" style={{ backgroundColor: '#C9A84C' }}>
            {chargement ? 'Chargement...' : 'Continuer vers le paiement →'}
          </button>

          <button onClick={() => router.back()} className="w-full py-2 rounded-lg text-sm font-medium" style={{ color: '#666666', backgroundColor: '#F5F3EE' }}>
            ← Retour
          </button>
        </div>
      )}

      {/* ÉTAPE 2 — Paiement */}
      {etape === 'paiement' && clientSecret && (
        <div className="space-y-4">
          <p className="text-sm font-medium" style={{ color: '#1A2535' }}>
            Banquet pour : <strong>{billet.nom_pci}</strong>
          </p>

          {/* Afficher allergies si saisies */}
          {(allergies.length > 0 || autreAllergie) && (
            <div className="rounded-lg p-3 text-xs" style={{ backgroundColor: '#FFF8E1', border: '1px solid #FFE082' }}>
              <p className="font-medium mb-1" style={{ color: '#1A2535' }}>🍽️ Allergies enregistrées :</p>
              <p style={{ color: '#666666' }}>{[...allergies, autreAllergie ? `Autre: ${autreAllergie}` : ''].filter(Boolean).join(', ')}</p>
            </div>
          )}

          {/* Détail final */}
          <div className="rounded-lg p-4 space-y-2 text-sm" style={{ backgroundColor: '#F5F3EE' }}>
            <div className="flex justify-between" style={{ color: '#666666' }}>
              <span>Sous-total</span>
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
            <FormulairePaiementBanquet detailPrix={detailPrix} banquet={banquet} billet={billet} />
          </Elements>
        </div>
      )}
    </div>
  )
}