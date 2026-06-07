'use client'

import { useState } from 'react'
import { createClient } from '@/utils/supabase/client'
import { useRouter } from 'next/navigation'

const ETAPES = ['Compte', 'Coordonnées', 'Amway', 'Confirmation']

export default function InscriptionPage() {
  const [etape, setEtape] = useState(1)
  const [chargement, setChargement] = useState(false)
  const [erreur, setErreur] = useState('')
  const router = useRouter()
  const supabase = createClient()

  const [form, setForm] = useState({
    // Étape 1
    prenom_1: '', nom_1: '', courriel: '', mot_de_passe: '', telephone: '',
    // Étape 2
    adresse: '', ville: '', code_postal: '', province: '', pays: 'Canada',
    // Étape 3
    numero_amway: '', date_inscription_amway: '', leader_id: '',
    prenom_2: '', nom_2: '',
    // Étape 4
    consentement_communications: false, consentement_conditions: false,
  })

  function update(champ: string, valeur: string | boolean) {
    setForm(f => ({ ...f, [champ]: valeur }))
  }

  function validerEtape(): boolean {
    setErreur('')
    if (etape === 1) {
      if (!form.prenom_1 || !form.nom_1 || !form.courriel || !form.mot_de_passe || !form.telephone) {
        setErreur('Veuillez remplir tous les champs.'); return false
      }
      if (form.mot_de_passe.length < 8) {
        setErreur('Le mot de passe doit contenir au moins 8 caractères.'); return false
      }
    }
    if (etape === 2) {
      if (!form.adresse || !form.ville || !form.code_postal || !form.province) {
        setErreur('Veuillez remplir tous les champs.'); return false
      }
    }
    if (etape === 3) {
      if (!form.numero_amway || !form.date_inscription_amway) {
        setErreur('Veuillez remplir tous les champs.'); return false
      }
    }
    if (etape === 4) {
      if (!form.consentement_communications || !form.consentement_conditions) {
        setErreur('Veuillez accepter les deux consentements.'); return false
      }
    }
    return true
  }

  async function handleSoumettre() {
    if (!validerEtape()) return
    setChargement(true)

    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: form.courriel,
      password: form.mot_de_passe,
    })

    if (authError || !authData.user) {
      setErreur(authError?.message ?? 'Erreur lors de la création du compte.')
      setChargement(false)
      return
    }

    const { error: compteError } = await supabase.from('comptes').insert({
      id: authData.user.id,
      courriel: form.courriel,
      prenom_1: form.prenom_1,
      nom_1: form.nom_1,
      prenom_2: form.prenom_2 || null,
      nom_2: form.nom_2 || null,
      telephone: form.telephone,
      adresse: form.adresse,
      ville: form.ville,
      code_postal: form.code_postal,
      province: form.province,
      pays: form.pays,
      numero_amway: form.numero_amway,
      date_inscription_amway: form.date_inscription_amway,
      leader_id: form.leader_id || null,
      consentement_communications: form.consentement_communications,
      statut: 'en_attente',
      role: 'pci',
    })

    if (compteError) {
      setErreur(compteError.message)
      setChargement(false)
      return
    }

    router.push('/inscription/merci')
  }

  function handleSuivant() {
    if (!validerEtape()) return
    setEtape(e => e + 1)
  }

  const inputClass = "w-full border rounded-lg px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-yellow-400"
  const labelClass = "block text-sm font-medium mb-1"

  return (
    <div className="min-h-screen py-10 px-4" style={{ backgroundColor: '#F5F3EE' }}>
      <div className="max-w-lg mx-auto">

        {/* Titre */}
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold" style={{ color: '#1A2535' }}>Créer un compte</h1>
          <p className="text-sm mt-1" style={{ color: '#666666' }}>Famille Germain – Yager Group</p>
        </div>

        {/* Indicateur d'étapes */}
        <div className="flex items-center justify-between mb-8">
          {ETAPES.map((nom, i) => (
            <div key={i} className="flex items-center">
              <div className="flex flex-col items-center">
                <div
                  className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold"
                  style={{
                    backgroundColor: etape > i + 1 ? '#4CAF7D' : etape === i + 1 ? '#C9A84C' : '#E0E0E0',
                    color: etape >= i + 1 ? 'white' : '#666666'
                  }}
                >
                  {etape > i + 1 ? '✓' : i + 1}
                </div>
                <span className="text-xs mt-1 hidden sm:block" style={{ color: etape === i + 1 ? '#C9A84C' : '#666666' }}>
                  {nom}
                </span>
              </div>
              {i < ETAPES.length - 1 && (
                <div className="w-12 sm:w-20 h-0.5 mx-1" style={{ backgroundColor: etape > i + 1 ? '#4CAF7D' : '#E0E0E0' }} />
              )}
            </div>
          ))}
        </div>

        {/* Carte formulaire */}
        <div className="bg-white rounded-2xl shadow-lg p-6">

          {/* ÉTAPE 1 — Compte */}
          {etape === 1 && (
            <div className="space-y-4">
              <h2 className="font-semibold text-lg mb-4" style={{ color: '#1A2535' }}>Informations du compte</h2>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={labelClass} style={{ color: '#1A2535' }}>Prénom *</label>
                  <input className={inputClass} style={{ borderColor: '#E0E0E0' }} value={form.prenom_1} onChange={e => update('prenom_1', e.target.value)} />
                </div>
                <div>
                  <label className={labelClass} style={{ color: '#1A2535' }}>Nom *</label>
                  <input className={inputClass} style={{ borderColor: '#E0E0E0' }} value={form.nom_1} onChange={e => update('nom_1', e.target.value)} />
                </div>
              </div>
              <div>
                <label className={labelClass} style={{ color: '#1A2535' }}>Courriel *</label>
                <input type="email" className={inputClass} style={{ borderColor: '#E0E0E0' }} value={form.courriel} onChange={e => update('courriel', e.target.value)} />
              </div>
              <div>
                <label className={labelClass} style={{ color: '#1A2535' }}>Mot de passe * (min. 8 caractères)</label>
                <input type="password" className={inputClass} style={{ borderColor: '#E0E0E0' }} value={form.mot_de_passe} onChange={e => update('mot_de_passe', e.target.value)} />
              </div>
              <div>
                <label className={labelClass} style={{ color: '#1A2535' }}>Téléphone *</label>
                <input type="tel" className={inputClass} style={{ borderColor: '#E0E0E0' }} value={form.telephone} onChange={e => update('telephone', e.target.value)} />
              </div>
            </div>
          )}

          {/* ÉTAPE 2 — Coordonnées */}
          {etape === 2 && (
            <div className="space-y-4">
              <h2 className="font-semibold text-lg mb-4" style={{ color: '#1A2535' }}>Coordonnées</h2>
              <div>
                <label className={labelClass} style={{ color: '#1A2535' }}>Adresse *</label>
                <input className={inputClass} style={{ borderColor: '#E0E0E0' }} value={form.adresse} onChange={e => update('adresse', e.target.value)} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={labelClass} style={{ color: '#1A2535' }}>Ville *</label>
                  <input className={inputClass} style={{ borderColor: '#E0E0E0' }} value={form.ville} onChange={e => update('ville', e.target.value)} />
                </div>
                <div>
                  <label className={labelClass} style={{ color: '#1A2535' }}>Code postal *</label>
                  <input className={inputClass} style={{ borderColor: '#E0E0E0' }} value={form.code_postal} onChange={e => update('code_postal', e.target.value)} />
                </div>
              </div>
              <div>
                <label className={labelClass} style={{ color: '#1A2535' }}>Province *</label>
                <select className={inputClass} style={{ borderColor: '#E0E0E0' }} value={form.province} onChange={e => update('province', e.target.value)}>
                  <option value="">Sélectionner...</option>
                  <option>Québec</option>
                  <option>Ontario</option>
                  <option>Colombie-Britannique</option>
                  <option>Alberta</option>
                  <option>Manitoba</option>
                  <option>Saskatchewan</option>
                  <option>Nouvelle-Écosse</option>
                  <option>Nouveau-Brunswick</option>
                  <option>Terre-Neuve-et-Labrador</option>
                  <option>Île-du-Prince-Édouard</option>
                </select>
              </div>
              <div>
                <label className={labelClass} style={{ color: '#1A2535' }}>Pays</label>
                <select className={inputClass} style={{ borderColor: '#E0E0E0' }} value={form.pays} onChange={e => update('pays', e.target.value)}>
                  <option>Canada</option>
                  <option>États-Unis</option>
                  <option>France</option>
                  <option>Belgique</option>
                  <option>Suisse</option>
                </select>
              </div>
            </div>
          )}

          {/* ÉTAPE 3 — Amway */}
          {etape === 3 && (
            <div className="space-y-4">
              <h2 className="font-semibold text-lg mb-4" style={{ color: '#1A2535' }}>Informations Amway</h2>
              <div>
                <label className={labelClass} style={{ color: '#1A2535' }}>Numéro PCI Amway *</label>
                <input className={inputClass} style={{ borderColor: '#E0E0E0' }} value={form.numero_amway} onChange={e => update('numero_amway', e.target.value)} />
              </div>
              <div>
                <label className={labelClass} style={{ color: '#1A2535' }}>Date d'inscription Amway *</label>
                <input type="date" className={inputClass} style={{ borderColor: '#E0E0E0' }} value={form.date_inscription_amway} onChange={e => update('date_inscription_amway', e.target.value)} />
              </div>
              <div>
                <label className={labelClass} style={{ color: '#1A2535' }}>Votre leader</label>
                <input className={inputClass} style={{ borderColor: '#E0E0E0' }} placeholder="Optionnel pour l'instant" value={form.leader_id} onChange={e => update('leader_id', e.target.value)} />
                <p className="text-xs mt-1" style={{ color: '#666666' }}>Un dropdown avec les leaders sera ajouté prochainement.</p>
              </div>

              {/* Co-PCI optionnel */}
              <div className="border-t pt-4 mt-4" style={{ borderColor: '#E0E0E0' }}>
                <p className="font-medium text-sm mb-3" style={{ color: '#1A2535' }}>Co-PCI (conjoint — optionnel)</p>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className={labelClass} style={{ color: '#666666' }}>Prénom</label>
                    <input className={inputClass} style={{ borderColor: '#E0E0E0' }} value={form.prenom_2} onChange={e => update('prenom_2', e.target.value)} />
                  </div>
                  <div>
                    <label className={labelClass} style={{ color: '#666666' }}>Nom</label>
                    <input className={inputClass} style={{ borderColor: '#E0E0E0' }} value={form.nom_2} onChange={e => update('nom_2', e.target.value)} />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ÉTAPE 4 — Confirmation */}
          {etape === 4 && (
            <div className="space-y-4">
              <h2 className="font-semibold text-lg mb-4" style={{ color: '#1A2535' }}>Confirmation</h2>
              <div className="rounded-lg p-4 text-sm space-y-2" style={{ backgroundColor: '#F5F3EE' }}>
                <p><strong>Nom :</strong> {form.prenom_1} {form.nom_1}</p>
                <p><strong>Courriel :</strong> {form.courriel}</p>
                <p><strong>Ville :</strong> {form.ville}, {form.province}</p>
                <p><strong>Numéro Amway :</strong> {form.numero_amway}</p>
                {form.prenom_2 && <p><strong>Co-PCI :</strong> {form.prenom_2} {form.nom_2}</p>}
              </div>

              <label className="flex items-start gap-3 cursor-pointer">
                <input type="checkbox" className="mt-1" checked={form.consentement_communications} onChange={e => update('consentement_communications', e.target.checked)} />
                <span className="text-sm" style={{ color: '#1A2535' }}>
                  J'accepte de recevoir des communications de Famille Germain – Yager Group.
                </span>
              </label>

              <label className="flex items-start gap-3 cursor-pointer">
                <input type="checkbox" className="mt-1" checked={form.consentement_conditions} onChange={e => update('consentement_conditions', e.target.checked)} />
                <span className="text-sm" style={{ color: '#1A2535' }}>
                  J'ai lu et j'accepte les conditions d'utilisation de la plateforme.
                </span>
              </label>
            </div>
          )}

          {/* Erreur */}
          {erreur && (
            <p className="text-sm mt-4 text-center" style={{ color: '#E57373' }}>{erreur}</p>
          )}

          {/* Boutons navigation */}
          <div className="flex justify-between mt-6">
            {etape > 1 ? (
              <button onClick={() => setEtape(e => e - 1)} className="px-4 py-2 rounded-lg text-sm font-medium" style={{ color: '#666666', backgroundColor: '#F5F3EE' }}>
                ← Retour
              </button>
            ) : (
              <a href="/connexion" className="px-4 py-2 rounded-lg text-sm font-medium" style={{ color: '#666666' }}>
                Déjà un compte ?
              </a>
            )}

            {etape < 4 ? (
              <button onClick={handleSuivant} className="px-6 py-2 rounded-lg text-sm font-medium text-white" style={{ backgroundColor: '#C9A84C' }}>
                Suivant →
              </button>
            ) : (
              <button onClick={handleSoumettre} disabled={chargement} className="px-6 py-2 rounded-lg text-sm font-medium text-white disabled:opacity-50" style={{ backgroundColor: '#4CAF7D' }}>
                {chargement ? 'Envoi...' : 'Créer mon compte'}
              </button>
            )}
          </div>

        </div>
      </div>
    </div>
  )
}