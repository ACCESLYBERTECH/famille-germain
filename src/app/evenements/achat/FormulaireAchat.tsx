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
}

function FormulairePaiement({ evenement, compte, nomPci, estSansFrais, prix }: {
  evenement: Evenement
  compte: Compte
  nomPci: string
  estSansFrais: boolean
  prix: number
}) {
  const stripe = useStripe()
  const elements = useElements()
  const router = useRouter()
  const [chargement, setChargement] = useState(false)
  const [erreur, setErreur] = useState('')

  async function handlePayer() {
    if (!stripe || !elements) return
    setChargement(true)
    setErreur('')

    const { error } = await stripe.confirmPayment({
      elements,
      confirmParams: {
        return_url: `${window.location.origin}/evenements/confirmation?evenement_id=${evenement.id}&nom_pci=${encodeURIComponent(nomPci)}`,
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
      <button
        onClick={handlePayer}
        disabled={chargement || !stripe}
        className="w-full py-3 rounded-lg text-white font-medium text-sm disabled:opacity-50"
        style={{ backgroundColor: '#C9A84C' }}
      >
        {chargement ? 'Traitement...' : `Payer ${prix.toFixed(2)} $`}
      </button>
    </div>
  )
}

export default function FormulaireAchat({ evenement, compte, estSansFrais, prix, stripePublicKey }: Props) {
  const router = useRouter()
  const [nomPci, setNomPci] = useState(
    `${compte.prenom_1} ${compte.nom_1}`
  )
  const [clientSecret, setClientSecret] = useState('')
  const [chargement, setChargement] = useState(false)
  const [erreur, setErreur] = useState('')
  const [etape, setEtape] = useState<'selection' | 'paiement' | 'confirme'>('selection')

  const stripePromise = loadStripe(stripePublicKey)

  const nomsDisponibles = [
    `${compte.prenom_1} ${compte.nom_1}`,
    ...(compte.prenom_2 && compte.nom_2 ? [`${compte.prenom_2} ${compte.nom_2}`] : [])
  ]

  async function handleContinuer() {
    setChargement(true)
    setErreur('')

    const res = await fetch('/api/stripe/create-payment-intent', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        evenement_id: evenement.id,
        nom_pci: nomPci,
        est_sans_frais: estSansFrais,
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
          {new Date(evenement.date_debut).toLocaleDateString('fr-CA', {
            weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
          })}
        </p>
        {evenement.lieu && <p className="text-sm" style={{ color: '#666666' }}>{evenement.lieu}</p>}
      </div>

      {/* ÉTAPE 1 — Sélection du nom */}
      {etape === 'selection' && (
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2" style={{ color: '#1A2535' }}>
              Ce billet est pour :
            </label>
            <div className="space-y-2">
              {nomsDisponibles.map(nom => (
                <label key={nom} className="flex items-center gap-3 p-3 rounded-lg border cursor-pointer"
                  style={{ borderColor: nomPci === nom ? '#C9A84C' : '#E0E0E0',
                    backgroundColor: nomPci === nom ? '#FFF8E1' : 'white' }}>
                  <input
                    type="radio"
                    name="nom_pci"
                    value={nom}
                    checked={nomPci === nom}
                    onChange={() => setNomPci(nom)}
                  />
                  <span className="font-medium" style={{ color: '#1A2535' }}>{nom}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Prix */}
          <div className="border-t pt-4" style={{ borderColor: '#E0E0E0' }}>
            <div className="flex justify-between items-center">
              <span className="text-sm" style={{ color: '#666666' }}>Billet — {evenement.nom}</span>
              {estSansFrais ? (
                <span className="font-bold" style={{ color: '#4CAF7D' }}>Sans frais</span>
              ) : (
                <span className="font-bold" style={{ color: '#1A2535' }}>{prix.toFixed(2)} $</span>
              )}
            </div>
          </div>

          {erreur && <p className="text-sm text-center" style={{ color: '#E57373' }}>{erreur}</p>}

          <button
            onClick={handleContinuer}
            disabled={chargement}
            className="w-full py-3 rounded-lg text-white font-medium text-sm disabled:opacity-50"
            style={{ backgroundColor: '#C9A84C' }}
          >
            {chargement ? 'Chargement...' : estSansFrais ? 'Confirmer — Sans frais' : 'Continuer vers le paiement →'}
          </button>
        </div>
      )}

      {/* ÉTAPE 2 — Paiement Stripe */}
      {etape === 'paiement' && clientSecret && (
        <div className="space-y-4">
          <p className="text-sm font-medium mb-4" style={{ color: '#1A2535' }}>
            Billet pour : <strong>{nomPci}</strong>
          </p>
          <Elements stripe={stripePromise} options={{ clientSecret }}>
            <FormulairePaiement
              evenement={evenement}
              compte={compte}
              nomPci={nomPci}
              estSansFrais={estSansFrais}
              prix={prix}
            />
          </Elements>
        </div>
      )}

      {/* ÉTAPE 3 — Confirmation sans frais */}
      {etape === 'confirme' && (
        <div className="text-center space-y-4">
          <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto"
            style={{ backgroundColor: '#4CAF7D' }}>
            <span className="text-white text-3xl">✓</span>
          </div>
          <p className="font-bold text-lg" style={{ color: '#1A2535' }}>Billet confirmé !</p>
          <p className="text-sm" style={{ color: '#666666' }}>
            Votre billet sans frais pour <strong>{nomPci}</strong> a été créé avec succès.
          </p>
          <button
            onClick={() => router.push('/evenements/mes-billets')}
            className="w-full py-3 rounded-lg text-white font-medium text-sm"
            style={{ backgroundColor: '#C9A84C' }}
          >
            Voir mes billets
          </button>
        </div>
      )}

    </div>
  )
}