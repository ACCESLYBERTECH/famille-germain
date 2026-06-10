'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/utils/supabase/client'
import { useRouter } from 'next/navigation'

const ETAPES = ['Compte', 'Coordonnées', 'Amway', 'Confirmation']

interface Leader {
  id: string
  prenom_1: string
  nom_1: string
  prenom_2: string | null
  nom_2: string | null
}

const PROVINCES_CANADA = [
  'Alberta', 'Colombie-Britannique', 'Île-du-Prince-Édouard', 'Manitoba',
  'Nouveau-Brunswick', 'Nouvelle-Écosse', 'Ontario', 'Québec',
  'Saskatchewan', 'Terre-Neuve-et-Labrador',
]

const ETATS_USA = [
  'Alabama', 'Alaska', 'Arizona', 'Arkansas', 'California', 'Colorado',
  'Connecticut', 'Delaware', 'Florida', 'Georgia', 'Hawaii', 'Idaho',
  'Illinois', 'Indiana', 'Iowa', 'Kansas', 'Kentucky', 'Louisiana',
  'Maine', 'Maryland', 'Massachusetts', 'Michigan', 'Minnesota',
  'Mississippi', 'Missouri', 'Montana', 'Nebraska', 'Nevada',
  'New Hampshire', 'New Jersey', 'New Mexico', 'New York',
  'North Carolina', 'North Dakota', 'Ohio', 'Oklahoma', 'Oregon',
  'Pennsylvania', 'Rhode Island', 'South Carolina', 'South Dakota',
  'Tennessee', 'Texas', 'Utah', 'Vermont', 'Virginia', 'Washington',
  'West Virginia', 'Wisconsin', 'Wyoming',
]

export default function InscriptionPage() {
  const [etape, setEtape] = useState(1)
  const [chargement, setChargement] = useState(false)
  const [erreur, setErreur] = useState('')
  const [leaders, setLeaders] = useState<Leader[]>([])
  const [modalConditions, setModalConditions] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  const [form, setForm] = useState({
    prenom_1: '', nom_1: '', courriel: '', mot_de_passe: '', telephone: '',
    adresse: '', ville: '', code_postal: '', province: '', pays: 'Canada',
    numero_amway: '', date_inscription_amway: '', leader_id: '',
    prenom_2: '', nom_2: '',
    consentement_communications: false,
    consentement_conditions: false,
    consentement_exactitude: false,
  })

  useEffect(() => {
    fetch('/api/public/leaders')
      .then(r => r.json())
      .then(data => setLeaders(data ?? []))
  }, [])

  function updatePays(pays: string) {
    setForm(f => ({ ...f, pays, province: '' }))
  }

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
      if (!form.leader_id) {
        setErreur('Veuillez sélectionner votre leader.'); return false
      }
    }
    if (etape === 4) {
      if (!form.consentement_communications || !form.consentement_conditions || !form.consentement_exactitude) {
        setErreur('Veuillez accepter les trois consentements.'); return false
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

    await fetch('/api/emails/notification-admin', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: 'nouveau_pci',
        prenomPCI: form.prenom_1,
        nomPCI: form.nom_1,
      }),
    })

    router.push('/inscription/merci')
  }

  function handleSuivant() {
    if (!validerEtape()) return
    setEtape(e => e + 1)
  }

  function nomLeader(l: Leader) {
    if (l.prenom_2 && l.nom_2) return `${l.prenom_1} ${l.nom_1} & ${l.prenom_2} ${l.nom_2}`
    return `${l.prenom_1} ${l.nom_1}`
  }

  const leaderSelectionne = leaders.find(l => l.id === form.leader_id)

  const inputClass = "w-full border rounded-lg px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-yellow-400"
  const labelClass = "block text-sm font-medium mb-1"

  function renderProvinceField() {
    if (form.pays === 'Canada') {
      return (
        <select className={inputClass} style={{ borderColor: '#E0E0E0' }} value={form.province} onChange={e => update('province', e.target.value)}>
          <option value="">Sélectionner une province...</option>
          {PROVINCES_CANADA.map(p => <option key={p}>{p}</option>)}
        </select>
      )
    }
    if (form.pays === 'États-Unis') {
      return (
        <select className={inputClass} style={{ borderColor: '#E0E0E0' }} value={form.province} onChange={e => update('province', e.target.value)}>
          <option value="">Sélectionner un état...</option>
          {ETATS_USA.map(e => <option key={e}>{e}</option>)}
        </select>
      )
    }
    return (
      <input className={inputClass} style={{ borderColor: '#E0E0E0' }} placeholder="Province / Région / État" value={form.province} onChange={e => update('province', e.target.value)} />
    )
  }

  function labelProvince() {
    if (form.pays === 'États-Unis') return 'État *'
    if (form.pays === 'Canada') return 'Province *'
    return 'Province / Région *'
  }

  return (
    <div className="min-h-screen py-10 px-4" style={{ backgroundColor: '#F5F3EE' }}>
      <div className="max-w-lg mx-auto">

        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold" style={{ color: '#1A2535' }}>Créer un compte</h1>
          <p className="text-sm mt-1" style={{ color: '#666666' }}>Famille Germain – Yager Group</p>
        </div>

        <div className="flex items-center justify-between mb-8">
          {ETAPES.map((nom, i) => (
            <div key={i} className="flex items-center">
              <div className="flex flex-col items-center">
                <div className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold" style={{ backgroundColor: etape > i + 1 ? '#4CAF7D' : etape === i + 1 ? '#C9A84C' : '#E0E0E0', color: etape >= i + 1 ? 'white' : '#666666' }}>
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

        <div className="bg-white rounded-2xl shadow-lg p-6">

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
                <label className={labelClass} style={{ color: '#1A2535' }}>Pays</label>
                <select className={inputClass} style={{ borderColor: '#E0E0E0' }} value={form.pays} onChange={e => updatePays(e.target.value)}>
                  <option>Canada</option>
                  <option>États-Unis</option>
                  <option>France</option>
                  <option>Belgique</option>
                  <option>Suisse</option>
                  <option>Autre</option>
                </select>
              </div>
              <div>
                <label className={labelClass} style={{ color: '#1A2535' }}>{labelProvince()}</label>
                {renderProvinceField()}
              </div>
            </div>
          )}

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
                <label className={labelClass} style={{ color: '#1A2535' }}>Votre leader *</label>
                <select className={inputClass} style={{ borderColor: '#E0E0E0' }} value={form.leader_id} onChange={e => update('leader_id', e.target.value)}>
                  <option value="">Sélectionner votre leader...</option>
                  {leaders.map(l => (
                    <option key={l.id} value={l.id}>{nomLeader(l)}</option>
                  ))}
                </select>
              </div>
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

          {etape === 4 && (
            <div className="space-y-4">
              <h2 className="font-semibold text-lg mb-4" style={{ color: '#1A2535' }}>Confirmation</h2>
              <div className="rounded-lg p-4 text-sm space-y-2" style={{ backgroundColor: '#F5F3EE' }}>
                <p><strong>Nom :</strong> {form.prenom_1} {form.nom_1}</p>
                {form.prenom_2 && <p><strong>Co-PCI :</strong> {form.prenom_2} {form.nom_2}</p>}
                <p><strong>Courriel :</strong> {form.courriel}</p>
                <p><strong>Téléphone :</strong> {form.telephone}</p>
                <p><strong>Adresse :</strong> {form.adresse}</p>
                <p><strong>Ville :</strong> {form.ville}, {form.province}, {form.pays}</p>
                <p><strong>Code postal :</strong> {form.code_postal}</p>
                <p><strong>Numéro Amway :</strong> {form.numero_amway}</p>
                <p><strong>Date d'inscription Amway :</strong> {form.date_inscription_amway ? new Date(form.date_inscription_amway).toLocaleDateString('fr-CA') : ''}</p>
                {leaderSelectionne && <p><strong>Leader :</strong> {nomLeader(leaderSelectionne)}</p>}
              </div>

              <div className="space-y-3 pt-2">
                <label className="flex items-start gap-3 cursor-pointer">
                  <input type="checkbox" className="mt-1 flex-shrink-0" checked={form.consentement_communications} onChange={e => update('consentement_communications', e.target.checked)} />
                  <span className="text-sm" style={{ color: '#1A2535' }}>
                    J'accepte de recevoir des communications de Famille Germain – Yager Group.
                  </span>
                </label>

                <label className="flex items-start gap-3 cursor-pointer">
                  <input type="checkbox" className="mt-1 flex-shrink-0" checked={form.consentement_conditions} onChange={e => update('consentement_conditions', e.target.checked)} />
                  <span className="text-sm" style={{ color: '#1A2535' }}>
                    J'ai lu et j'accepte les{' '}
                    <button type="button" onClick={() => setModalConditions(true)} className="underline font-medium" style={{ color: '#C9A84C' }}>
                      conditions d'utilisation
                    </button>
                    {' '}de la plateforme.
                  </span>
                </label>

                <label className="flex items-start gap-3 cursor-pointer">
                  <input type="checkbox" className="mt-1 flex-shrink-0" checked={form.consentement_exactitude} onChange={e => update('consentement_exactitude', e.target.checked)} />
                  <span className="text-sm" style={{ color: '#1A2535' }}>
                    Je confirme que je suis un PCI affilié à Amway, que mon inscription Amway est complétée et que toutes les informations fournies sont exactes et véridiques.
                  </span>
                </label>
              </div>
            </div>
          )}

          {erreur && (
            <p className="text-sm mt-4 text-center" style={{ color: '#E57373' }}>{erreur}</p>
          )}

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

      {/* Modale conditions d'utilisation */}
      {modalConditions && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[85vh] flex flex-col">

            {/* En-tête fixe */}
            <div className="flex items-center justify-between px-6 py-4 border-b flex-shrink-0" style={{ borderColor: '#E0E0E0' }}>
              <h2 className="text-lg font-bold" style={{ color: '#1A2535' }}>Conditions d'utilisation</h2>
              <button onClick={() => setModalConditions(false)} className="text-gray-400 hover:text-gray-600 text-2xl leading-none">✕</button>
            </div>

            {/* Contenu défilable */}
            <div className="overflow-y-auto px-6 py-4 flex-1 text-sm leading-relaxed space-y-6" style={{ color: '#1A2535' }}>

              <p className="text-xs" style={{ color: '#999999' }}>Plateforme Famille Germain – Yager Group · Dernière mise à jour : juin 2026</p>

              <section>
                <h3 className="font-bold mb-2" style={{ color: '#C9A84C' }}>1. Admissibilité et affiliation Amway</h3>
                <p>En créant un compte sur la plateforme ACCESLYBERTECH, vous confirmez que vous êtes un Propriétaire de Commerce Indépendant (PCI) dûment affilié à Amway Canada Corporation ou à une filiale reconnue d'Amway dans votre pays de résidence.</p>
                <p className="mt-2">Vous confirmez également que votre inscription auprès d'Amway est complétée, active et en règle au moment de votre demande d'adhésion à cette plateforme. Toute modification à votre statut Amway doit être signalée à l'administrateur de la plateforme dans les meilleurs délais.</p>
              </section>

              <section>
                <h3 className="font-bold mb-2" style={{ color: '#C9A84C' }}>2. Exactitude des informations</h3>
                <p>Vous certifiez que toutes les informations fournies lors de votre inscription — incluant votre nom, prénom, adresse, numéro de PCI Amway, date d'inscription Amway, coordonnées et toute autre information demandée — sont exactes, complètes et véridiques au moment de leur soumission.</p>
                <p className="mt-2">Vous vous engagez à maintenir vos informations à jour et à notifier l'administrateur de tout changement significatif. La plateforme se réserve le droit de suspendre ou de révoquer tout compte dont les informations s'avèrent inexactes, incomplètes ou frauduleuses.</p>
              </section>

              <section>
                <h3 className="font-bold mb-2" style={{ color: '#C9A84C' }}>3. Accès et sécurité du compte</h3>
                <p>Votre compte est strictement personnel et non transférable. Vous êtes responsable de maintenir la confidentialité de vos identifiants de connexion. Toute activité effectuée depuis votre compte est réputée avoir été effectuée par vous.</p>
                <p className="mt-2">En cas de compromission de votre compte ou d'utilisation non autorisée, vous devez en informer immédiatement l'administrateur de la plateforme. ACCESLYBERTECH ne saurait être tenu responsable des dommages résultant d'un accès non autorisé dû à une négligence de votre part.</p>
              </section>

              <section>
                <h3 className="font-bold mb-2" style={{ color: '#C9A84C' }}>4. Utilisation de la plateforme</h3>
                <p>La plateforme ACCESLYBERTECH est réservée exclusivement aux PCIs membres du réseau Famille Germain – Yager Group. Elle est destinée à la gestion d'événements, à la communication interne et à la consultation de documents liés à vos activités Amway.</p>
                <p className="mt-2">Il vous est strictement interdit de :</p>
                <ul className="list-disc ml-5 mt-2 space-y-1">
                  <li>Partager votre accès avec des tiers non autorisés</li>
                  <li>Utiliser la plateforme à des fins commerciales autres que celles liées à vos activités Amway</li>
                  <li>Reproduire, distribuer ou exploiter le contenu de la plateforme sans autorisation écrite</li>
                  <li>Tenter d'accéder à des sections réservées à d'autres rôles ou utilisateurs</li>
                </ul>
              </section>

              <section>
                <h3 className="font-bold mb-2" style={{ color: '#C9A84C' }}>5. Billets et événements</h3>
                <p>L'achat de billets via la plateforme est soumis aux conditions tarifaires en vigueur au moment de la transaction. Les tarifs peuvent varier selon votre statut (sans frais, tarif régulier, paliers de prix) et selon la date d'achat.</p>
                <p className="mt-2">Les remboursements sont traités conformément à la politique de remboursement d'ACCESLYBERTECH. Un billet remboursé ne peut pas être réutilisé. Les billets sont nominatifs et non transférables.</p>
              </section>

              <section>
                <h3 className="font-bold mb-2" style={{ color: '#C9A84C' }}>6. Protection des renseignements personnels</h3>
                <p>Les informations personnelles collectées lors de votre inscription sont utilisées exclusivement pour la gestion de votre compte, la communication d'événements et les activités liées au réseau Famille Germain – Yager Group.</p>
                <p className="mt-2">Vos données ne seront pas vendues, louées ou partagées avec des tiers à des fins commerciales. Elles sont stockées de manière sécurisée conformément aux lois applicables en matière de protection des renseignements personnels au Canada (Loi 25) et dans votre juridiction de résidence.</p>
              </section>

              <section>
                <h3 className="font-bold mb-2" style={{ color: '#C9A84C' }}>7. Communications</h3>
                <p>En acceptant ces conditions, vous consentez à recevoir des communications électroniques de la part de la plateforme ACCESLYBERTECH, incluant des confirmations de billets, des annonces d'événements et des notifications administratives.</p>
                <p className="mt-2">Vous pouvez retirer votre consentement aux communications marketing en tout temps en contactant l'administrateur de la plateforme.</p>
              </section>

              <section>
                <h3 className="font-bold mb-2" style={{ color: '#C9A84C' }}>8. Modification et résiliation</h3>
                <p>ACCESLYBERTECH se réserve le droit de modifier ces conditions d'utilisation en tout temps. Les modifications seront communiquées via la plateforme. La poursuite de l'utilisation de la plateforme après notification vaut acceptation des nouvelles conditions.</p>
                <p className="mt-2">ACCESLYBERTECH se réserve le droit de suspendre ou de résilier tout compte qui contreviendrait aux présentes conditions, sans préavis et sans obligation de remboursement pour les services déjà rendus.</p>
              </section>

              <section>
                <h3 className="font-bold mb-2" style={{ color: '#C9A84C' }}>9. Droit applicable</h3>
                <p>Les présentes conditions d'utilisation sont régies par les lois de la province de Québec et les lois fédérales du Canada applicables. Tout litige sera soumis à la juridiction exclusive des tribunaux compétents du Québec.</p>
              </section>

              <p className="text-xs text-center pt-2" style={{ color: '#999999' }}>
                © 2026 ACCESLYBERTECH INC. — Tous droits réservés
              </p>
            </div>

            {/* Pied fixe */}
            <div className="px-6 py-4 border-t flex-shrink-0" style={{ borderColor: '#E0E0E0' }}>
              <button
                onClick={() => { setModalConditions(false); update('consentement_conditions', true) }}
                className="w-full py-2.5 rounded-lg text-sm font-medium text-white"
                style={{ backgroundColor: '#C9A84C' }}
              >
                J'ai lu et j'accepte les conditions d'utilisation ✓
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  )
}