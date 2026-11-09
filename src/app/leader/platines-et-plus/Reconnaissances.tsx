'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  saisieOuverte, dateLimiteSaisie, dateLongue, trouverDoublon, cleNumero,
  type EvenementReconnaissances, type TypeReconnaissance, type EntreeVirtuel, type LigneSurPlace, type LeaderOrdonne,
} from '@/lib/reconnaissances'

export interface PersonneChoix {
  id: string
  prenom_1: string
  nom_1: string
  prenom_2: string | null
  nom_2: string | null
  numero_amway: string | null
  ville: string | null
  province: string | null
  pays: string | null
}

interface Props {
  evenements: EvenementReconnaissances[]
  types: TypeReconnaissance[]
  erreurTypes?: string | null
  ordreLeaders: LeaderOrdonne[]
  virtuel: EntreeVirtuel[]
  surPlace: LigneSurPlace[]
  personnes: PersonneChoix[]
  moiId: string
  nomLeader: (id: string | null) => string | null
}

const sansAccents = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
const nomComplet = (prenom: string | null, nom: string | null) => [prenom, nom].filter(Boolean).join(' ')

export default function Reconnaissances({ evenements, types, erreurTypes, ordreLeaders, virtuel, surPlace, personnes, moiId, nomLeader }: Props) {
  // Par défaut : le prochain événement encore ouvert, sinon le premier
  const [evId, setEvId] = useState(() => (evenements.find(e => saisieOuverte(e)) ?? evenements[0])?.id ?? '')
  const evenement = evenements.find(e => e.id === evId)

  if (evenements.length === 0) {
    return (
      <div className="p-8 text-center" style={{ color: '#666666' }}>
        <p className="text-3xl mb-2">🏆</p>
        <p>Aucune conférence avec reconnaissances pour l&apos;instant.</p>
        <p className="text-sm mt-1" style={{ color: '#999999' }}>L&apos;administration active les reconnaissances sur les congrès et les sessions de formation.</p>
      </div>
    )
  }

  return (
    <div className="p-4 space-y-5">
      <label className="block">
        <span className="text-xs font-bold uppercase tracking-wide" style={{ color: '#C9A84C' }}>Conférence</span>
        <select className="mt-1 w-full border rounded-lg px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-yellow-400 max-w-full" style={{ borderColor: '#E0E0E0' }} value={evId} onChange={e => setEvId(e.target.value)}>
          {evenements.map(ev => (
            <option key={ev.id} value={ev.id}>
              {ev.nom} — {new Date(ev.date_debut).toLocaleDateString('fr-CA', { day: 'numeric', month: 'long', year: 'numeric' })}{saisieOuverte(ev) ? '' : ' (verrouillée)'}
            </option>
          ))}
        </select>
      </label>

      {/* Diagnostic : la liste des reconnaissances n'a pas pu être lue */}
      {types.filter(t => t.actif).length === 0 && (
        <div className="rounded-xl px-4 py-3 text-sm" style={{ backgroundColor: '#FDECEA', color: '#C62828' }}>
          ⚠️ La liste des reconnaissances est vide ou n&apos;a pas pu être lue.{erreurTypes ? ` Détail : ${erreurTypes}` : ' (Aucune reconnaissance active reçue.)'}
        </div>
      )}

      {evenement && (
        <SectionEvenement
          key={evenement.id}
          evenement={evenement}
          types={types}
          virtuelInitial={virtuel.filter(v => v.evenement_id === evenement.id)}
          surPlace={surPlace.filter(l => l.evenement_id === evenement.id)}
          personnes={personnes}
          moiId={moiId}
          nomLeader={nomLeader}
          ordreLeaders={ordreLeaders}
        />
      )}
    </div>
  )
}

interface Fiche {
  id?: string
  compte_id: string | null
  nom: string
  nom_2: string
  numero_amway: string
  ville: string
  province: string
  pays: string
  type_ids: string[]
  autre: string
}

const FICHE_VIDE: Fiche = { compte_id: null, nom: '', nom_2: '', numero_amway: '', ville: '', province: '', pays: 'Canada', type_ids: [], autre: '' }

function SectionEvenement({ evenement, types, virtuelInitial, surPlace, personnes, moiId, nomLeader, ordreLeaders }: {
  evenement: EvenementReconnaissances
  types: TypeReconnaissance[]
  virtuelInitial: EntreeVirtuel[]
  surPlace: LigneSurPlace[]
  personnes: PersonneChoix[]
  moiId: string
  nomLeader: (id: string | null) => string | null
  ordreLeaders: LeaderOrdonne[]
}) {
  const router = useRouter()
  // Leaders en dessous dans l'ordre de l'arbre (CHAMARD, puis HEBERT de l'équipe de CHAMARD...)
  const rangLeader = (id: string) => { const i = ordreLeaders.findIndex(l => l.id === id); return i === -1 ? 9999 : i }
  const titreLeader = (id: string) => {
    const info = ordreLeaders.find(l => l.id === id)
    const nom = nomLeader(id) ?? 'un autre leader'
    return info && info.niveau > 1 ? `${nom} · équipe de ${nomLeader(info.parentId) ?? '?'}` : nom
  }
  const decalage = (id: string) => Math.max(0, (ordreLeaders.find(l => l.id === id)?.niveau ?? 1) - 1)
  const ouverte = saisieOuverte(evenement)
  const typesActifs = useMemo(() => types.filter(t => t.actif).sort((a, b) => a.ordre - b.ordre), [types])
  const nomType = (id: string) => types.find(t => t.id === id)?.nom ?? '?'
  const ordreType = (id: string) => types.find(t => t.id === id)?.ordre ?? 999

  // ---------------- Virtuel ----------------
  const [entrees, setEntrees] = useState<EntreeVirtuel[]>(virtuelInitial)
  const [fiche, setFiche] = useState<Fiche | null>(null)
  const [ficheErreur, setFicheErreur] = useState<string | null>(null)
  const [ficheChargement, setFicheChargement] = useState(false)
  const [ficheInfo, setFicheInfo] = useState<string | null>(null)

  const mesEntrees = entrees.filter(e => e.leader_id === moiId)
  const autresEntrees = entrees.filter(e => e.leader_id !== moiId)
  const autresParLeader = useMemo(() => {
    const m = new Map<string, EntreeVirtuel[]>()
    autresEntrees.forEach(e => { if (!m.has(e.leader_id)) m.set(e.leader_id, []); m.get(e.leader_id)!.push(e) })
    return Array.from(m.entries()).sort((a, b) => rangLeader(a[0]) - rangLeader(b[0]))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autresEntrees, ordreLeaders])

  const suggestions = useMemo(() => {
    if (!fiche || fiche.compte_id || fiche.nom.trim().length < 2) return []
    const q = sansAccents(fiche.nom.trim())
    return personnes.filter(p => sansAccents(`${p.prenom_1} ${p.nom_1} ${p.prenom_2 ?? ''} ${p.nom_2 ?? ''}`).includes(q)).slice(0, 6)
  }, [fiche, personnes])

  // Doublon : si la personne est déjà dans MES entrées, on ouvre sa fiche existante ;
  // si un leader en dessous l'a déjà inscrite, on bloque
  function verifierDoublon(personne: { compte_id: string | null; numero_amway: string | null }): boolean {
    if (!fiche) return false
    const doublon = trouverDoublon(entrees, personne, fiche.id)
    if (!doublon) return false
    if (doublon.leader_id === moiId) {
      modifier(doublon)
      setFicheInfo(`${doublon.nom} est déjà dans vos entrées : voici sa fiche. Ajoutez ou retirez des reconnaissances au besoin.`)
    } else {
      setFicheErreur(`${doublon.nom} est déjà inscrit(e) par ${nomLeader(doublon.leader_id) ?? 'un autre leader'} pour cette conférence.`)
    }
    return true
  }

  function choisirPersonne(p: PersonneChoix) {
    if (!fiche) return
    if (verifierDoublon({ compte_id: p.id, numero_amway: p.numero_amway })) return
    setFiche({
      ...fiche,
      compte_id: p.id,
      nom: nomComplet(p.prenom_1, p.nom_1),
      nom_2: nomComplet(p.prenom_2, p.nom_2),
      numero_amway: p.numero_amway ?? '',
      ville: p.ville ?? '',
      province: p.province ?? '',
      pays: p.pays || 'Canada',
    })
  }

  function modifier(e: EntreeVirtuel) {
    setFicheInfo(null)
    setFiche({
      id: e.id, compte_id: e.compte_id, nom: e.nom, nom_2: e.nom_2 ?? '',
      // Anciennes fiches sans numéro : on le reprend du PCI choisi dans la liste
      numero_amway: e.numero_amway ?? personnes.find(p => p.id === e.compte_id)?.numero_amway ?? '',
      ville: e.ville ?? '',
      province: e.province ?? '', pays: e.pays ?? '', type_ids: [...e.type_ids], autre: e.autre ?? '',
    })
    setFicheErreur(null)
  }

  async function sauverFiche() {
    if (!fiche) return
    setFicheChargement(true)
    setFicheErreur(null)
    const res = await fetch('/api/reconnaissances/virtuel', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...fiche, evenement_id: evenement.id }),
    })
    const data = await res.json().catch(() => ({}))
    setFicheChargement(false)
    if (!res.ok) {
      // Doublon trouvé par le serveur dans mes entrées : on ouvre la fiche existante
      const existante = data.doublonId ? entrees.find(e => e.id === data.doublonId) : undefined
      if (existante) {
        modifier(existante)
        setFicheInfo(`${existante.nom} était déjà dans vos entrées : voici sa fiche. Ajoutez les reconnaissances au besoin, puis sauvegardez.`)
        return
      }
      setFicheErreur(data.error ?? 'Erreur lors de la sauvegarde')
      return
    }
    setEntrees(prev => fiche.id ? prev.map(e => e.id === fiche.id ? data.entree : e) : [...prev, data.entree])
    setFiche(null)
    router.refresh()
  }

  async function retirer(e: EntreeVirtuel) {
    if (!confirm(`Retirer ${e.nom} des reconnaissances en virtuel?`)) return
    const res = await fetch(`/api/reconnaissances/virtuel?id=${e.id}`, { method: 'DELETE' })
    const data = await res.json().catch(() => ({}))
    if (!res.ok) { alert(data.error ?? 'Erreur'); return }
    setEntrees(prev => prev.filter(x => x.id !== e.id))
    router.refresh()
  }

  // ---------------- Sur place ----------------
  const villes = [...evenement.villes].sort((a, b) => a.ordre - b.ordre)
  const cleVille = (id: string | null) => id ?? 'unique'
  const listeVilles = villes.length > 0 ? villes.map(v => ({ cle: v.id, nom: v.nom_ville })) : [{ cle: 'unique', nom: 'Salle unique' }]
  const [villeActive, setVilleActive] = useState(listeVilles[0].cle)
  const [nombres, setNombres] = useState<Record<string, string>>(() => {
    const init: Record<string, string> = {}
    surPlace.filter(l => l.leader_id === moiId).forEach(l => { init[`${cleVille(l.ville_id)}|${l.type_id}`] = String(l.nombre) })
    return init
  })
  const [surPlaceModifie, setSurPlaceModifie] = useState(false)
  const [surPlaceMessage, setSurPlaceMessage] = useState<{ type: 'succes' | 'erreur'; texte: string } | null>(null)
  const [surPlaceChargement, setSurPlaceChargement] = useState(false)

  const totalVille = (cle: string) => typesActifs.reduce((s, t) => s + (parseInt(nombres[`${cle}|${t.id}`] ?? '') || 0), 0)

  async function sauverSurPlace() {
    setSurPlaceChargement(true)
    setSurPlaceMessage(null)
    const lignes = Object.entries(nombres)
      .map(([cle, n]) => { const [ville, type_id] = cle.split('|'); return { ville_id: ville === 'unique' ? null : ville, type_id, nombre: parseInt(n) || 0 } })
      .filter(l => l.nombre > 0)
    const res = await fetch('/api/reconnaissances/sur-place', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ evenement_id: evenement.id, lignes }),
    })
    const data = await res.json().catch(() => ({}))
    setSurPlaceChargement(false)
    if (!res.ok) { setSurPlaceMessage({ type: 'erreur', texte: data.error ?? 'Erreur lors de la sauvegarde' }); return }
    setSurPlaceModifie(false)
    setSurPlaceMessage({ type: 'succes', texte: `✓ Enregistré — ${data.total} personne${data.total > 1 ? 's' : ''} sur place au total` })
    router.refresh()
  }

  // Leaders en dessous : résumé en lecture seule
  const autresSurPlace = useMemo(() => {
    const m = new Map<string, LigneSurPlace[]>()
    surPlace.filter(l => l.leader_id !== moiId).forEach(l => { if (!m.has(l.leader_id)) m.set(l.leader_id, []); m.get(l.leader_id)!.push(l) })
    return Array.from(m.entries()).sort((a, b) => rangLeader(a[0]) - rangLeader(b[0]))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [surPlace, moiId, ordreLeaders])

  const carteEntree = (e: EntreeVirtuel, modifiable: boolean) => (
    <div key={e.id} className="p-3 border-b last:border-b-0 flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2" style={{ borderColor: '#EEEEEE' }}>
      <div className="min-w-0">
        <p className="font-semibold" style={{ color: '#1A2535' }}>
          {!modifiable && <span title="Entrée d'un autre leader">🔒 </span>}{e.nom}{e.nom_2 ? ` & ${e.nom_2}` : ''}
        </p>
        <p className="text-xs" style={{ color: '#666666' }}>{e.numero_amway ? `#${e.numero_amway} · ` : ''}{[e.ville, e.province, e.pays].filter(Boolean).join(', ')}</p>
        <div className="flex flex-wrap gap-1 mt-1.5">
          {[...e.type_ids].sort((a, b) => ordreType(a) - ordreType(b)).map(t => (
            <span key={t} className="text-xs px-2 py-0.5 rounded-full" style={{ backgroundColor: '#FBF6E8', color: '#8A6D1F' }}>{nomType(t)}</span>
          ))}
          {e.autre && <span className="text-xs px-2 py-0.5 rounded-full" style={{ backgroundColor: '#ECEFF1', color: '#455A64' }}>Autre : {e.autre}</span>}
        </div>
      </div>
      {modifiable && ouverte && (
        <div className="flex gap-2 flex-shrink-0">
          <button onClick={() => modifier(e)} className="px-3 py-1.5 rounded-lg text-xs font-medium" style={{ backgroundColor: '#E3F2FD', color: '#2E86C1' }}>Modifier</button>
          <button onClick={() => retirer(e)} className="px-3 py-1.5 rounded-lg text-xs font-medium" style={{ backgroundColor: '#FDECEA', color: '#E57373' }}>Retirer</button>
        </div>
      )}
    </div>
  )

  return (
    <div className="space-y-5">
      {/* État de la saisie */}
      <div className="rounded-xl px-4 py-3 text-sm" style={ouverte ? { backgroundColor: '#E8F5E9', color: '#2E7D32' } : { backgroundColor: '#ECEFF1', color: '#455A64' }}>
        {ouverte
          ? <>✏️ Vous pouvez entrer et corriger vos reconnaissances jusqu&apos;au <strong>{dateLongue(dateLimiteSaisie(evenement))}</strong> inclusivement.</>
          : <>🔒 La date limite est passée ({dateLongue(dateLimiteSaisie(evenement))}). Les reconnaissances de cette conférence sont verrouillées.</>}
      </div>

      {/* ---------------- VIRTUEL ---------------- */}
      <section className="rounded-2xl border" style={{ borderColor: '#E0E0E0' }}>
        <div className="p-4 border-b flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2" style={{ borderColor: '#E0E0E0' }}>
          <div>
            <h3 className="font-bold" style={{ color: '#1A2535' }}>💻 Reconnaissances en virtuel</h3>
            <p className="text-xs" style={{ color: '#666666' }}>Ces personnes seront nommées sur la scène, dans toutes les salles.</p>
          </div>
          {ouverte && !fiche && (
            <button onClick={() => { setFiche({ ...FICHE_VIDE }); setFicheErreur(null); setFicheInfo(null) }} className="px-4 py-2 rounded-lg text-sm font-medium text-white" style={{ backgroundColor: '#C9A84C' }}>
              + Ajouter une personne
            </button>
          )}
        </div>

        {fiche && (
          <div className="p-4 border-b space-y-3" style={{ borderColor: '#E0E0E0', backgroundColor: '#FFFDF7' }}>
            <p className="text-sm font-semibold" style={{ color: '#1A2535' }}>{fiche.id ? 'Modifier la personne' : 'Nouvelle personne'}</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <label className="block relative">
                <span className="text-xs font-medium text-gray-600">Prénom et nom *</span>
                <input className="mt-1 w-full border rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-yellow-400" style={{ borderColor: '#E0E0E0' }}
                  placeholder="Tapez pour chercher dans vos PCI..." value={fiche.nom}
                  onChange={e => { setFiche({ ...fiche, nom: e.target.value, compte_id: null, numero_amway: fiche.compte_id ? '' : fiche.numero_amway }); setFicheErreur(null) }} />
                {suggestions.length > 0 && (
                  <div className="absolute z-20 left-0 right-0 mt-1 bg-white border rounded-lg shadow-lg overflow-hidden" style={{ borderColor: '#E0E0E0' }}>
                    {suggestions.map(p => (
                      <button key={p.id} type="button" onClick={() => choisirPersonne(p)} className="block w-full text-left px-3 py-2 text-sm hover:bg-yellow-50">
                        <span className="font-medium">{nomComplet(p.prenom_1, p.nom_1)}</span>
                        {p.prenom_2 && <span style={{ color: '#666666' }}> & {nomComplet(p.prenom_2, p.nom_2)}</span>}
                        <span className="block text-xs" style={{ color: '#999999' }}>{p.numero_amway ? `#${p.numero_amway} · ` : ''}{[p.ville, p.province].filter(Boolean).join(', ')}</span>
                      </button>
                    ))}
                  </div>
                )}
                {fiche.compte_id && <span className="block text-xs mt-1" style={{ color: '#2E7D32' }}>✓ PCI choisi dans votre liste</span>}
              </label>
              <label className="block">
                <span className="text-xs font-medium text-gray-600">Co-PCI (prénom et nom)</span>
                <input className="mt-1 w-full border rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-yellow-400" style={{ borderColor: '#E0E0E0' }}
                  value={fiche.nom_2} onChange={e => setFiche({ ...fiche, nom_2: e.target.value })} />
              </label>
              <label className="block">
                <span className="text-xs font-medium text-gray-600">Numéro de PCI *</span>
                <input inputMode="numeric" disabled={!!fiche.compte_id && !!fiche.numero_amway}
                  className="mt-1 w-full border rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-yellow-400 disabled:bg-gray-50" style={{ borderColor: '#E0E0E0' }}
                  placeholder="Ex. 1234567" value={fiche.numero_amway}
                  onChange={e => { setFiche({ ...fiche, numero_amway: e.target.value }); setFicheErreur(null) }}
                  onBlur={() => { if (!fiche.compte_id && cleNumero(fiche.numero_amway)) verifierDoublon({ compte_id: null, numero_amway: fiche.numero_amway }) }} />
                <span className="block text-xs mt-1" style={{ color: '#999999' }}>Unique pour chaque PCI : c&apos;est lui qui évite les doublons.</span>
              </label>
              <label className="block">
                <span className="text-xs font-medium text-gray-600">Ville *</span>
                <input className="mt-1 w-full border rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-yellow-400" style={{ borderColor: '#E0E0E0' }}
                  value={fiche.ville} onChange={e => setFiche({ ...fiche, ville: e.target.value })} />
              </label>
              <div className="grid grid-cols-2 gap-3">
                <label className="block">
                  <span className="text-xs font-medium text-gray-600">Province</span>
                  <input className="mt-1 w-full border rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-yellow-400" style={{ borderColor: '#E0E0E0' }}
                    value={fiche.province} onChange={e => setFiche({ ...fiche, province: e.target.value })} />
                </label>
                <label className="block">
                  <span className="text-xs font-medium text-gray-600">Pays</span>
                  <input className="mt-1 w-full border rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-yellow-400" style={{ borderColor: '#E0E0E0' }}
                    value={fiche.pays} onChange={e => setFiche({ ...fiche, pays: e.target.value })} />
                </label>
              </div>
            </div>

            <div>
              <p className="text-xs font-medium text-gray-600 mb-1.5">Reconnaissances *</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-4 gap-y-1">
                {typesActifs.map(t => (
                  <label key={t.id} className="flex items-center gap-2 text-sm py-0.5 cursor-pointer">
                    <input type="checkbox" className="w-4 h-4 accent-yellow-600" checked={fiche.type_ids.includes(t.id)}
                      onChange={() => setFiche({ ...fiche, type_ids: fiche.type_ids.includes(t.id) ? fiche.type_ids.filter(x => x !== t.id) : [...fiche.type_ids, t.id] })} />
                    {t.nom}
                  </label>
                ))}
              </div>
              <input className="mt-2 w-full border rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-yellow-400" style={{ borderColor: '#E0E0E0' }}
                placeholder="Autre (optionnel) : écrivez la reconnaissance" value={fiche.autre} onChange={e => setFiche({ ...fiche, autre: e.target.value })} />
            </div>

            {ficheInfo && <p className="text-sm rounded-lg px-3 py-2" style={{ backgroundColor: '#E3F2FD', color: '#1565C0' }}>ℹ️ {ficheInfo}</p>}
            {ficheErreur && <p className="text-sm" style={{ color: '#C62828' }}>{ficheErreur}</p>}
            <div className="flex gap-2 flex-wrap">
              <button onClick={sauverFiche} disabled={ficheChargement} className="px-4 py-2 rounded-lg text-sm font-medium text-white disabled:opacity-50" style={{ backgroundColor: '#4CAF7D' }}>
                {ficheChargement ? 'Sauvegarde...' : 'Sauvegarder'}
              </button>
              <button onClick={() => setFiche(null)} className="px-4 py-2 rounded-lg text-sm font-medium" style={{ color: '#666666', backgroundColor: '#F5F3EE' }}>Annuler</button>
            </div>
          </div>
        )}

        {mesEntrees.length === 0 && autresEntrees.length === 0 && !fiche && (
          <p className="p-6 text-center text-sm" style={{ color: '#999999' }}>Aucune personne en virtuel pour cette conférence.</p>
        )}
        {mesEntrees.length > 0 && (
          <div>
            <p className="px-4 pt-3 text-xs font-bold uppercase tracking-wide" style={{ color: '#C9A84C' }}>Mes entrées ({mesEntrees.length})</p>
            <div className="px-1">{mesEntrees.map(e => carteEntree(e, true))}</div>
          </div>
        )}
        {autresParLeader.map(([leaderId, liste]) => (
          <div key={leaderId} style={{ marginLeft: `${decalage(leaderId) * 16}px` }}>
            <p className="px-4 pt-3 text-xs font-bold uppercase tracking-wide" style={{ color: '#999999' }}>🔒 Entrées de {titreLeader(leaderId)} ({liste.length})</p>
            <div className="px-1" style={{ opacity: 0.85 }}>{liste.map(e => carteEntree(e, false))}</div>
          </div>
        ))}
      </section>

      {/* ---------------- SUR PLACE ---------------- */}
      <section className="rounded-2xl border" style={{ borderColor: '#E0E0E0' }}>
        <div className="p-4 border-b" style={{ borderColor: '#E0E0E0' }}>
          <h3 className="font-bold" style={{ color: '#1A2535' }}>🏛️ Reconnaissances sur place</h3>
          <p className="text-xs" style={{ color: '#666666' }}>Seulement le nombre de personnes de votre équipe, pour chaque reconnaissance et chaque salle.</p>
        </div>

        {listeVilles.length > 1 && (
          <div className="px-4 pt-4 flex gap-2 flex-wrap">
            {listeVilles.map(v => (
              <button key={v.cle} onClick={() => setVilleActive(v.cle)} className="px-4 py-2 rounded-lg text-sm font-medium"
                style={villeActive === v.cle ? { backgroundColor: '#1A2535', color: 'white' } : { backgroundColor: '#F5F3EE', color: '#1A2535' }}>
                {v.nom} <span className="opacity-70">({totalVille(v.cle)})</span>
              </button>
            ))}
          </div>
        )}

        <div className="p-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6">
            {typesActifs.map(t => {
              const cle = `${villeActive}|${t.id}`
              return (
                <label key={cle} className="flex items-center justify-between gap-3 py-1.5 border-b" style={{ borderColor: '#F0F0F0' }}>
                  <span className="text-sm" style={{ color: '#1A2535' }}>{t.nom}</span>
                  <input type="number" inputMode="numeric" min={0} max={9999} disabled={!ouverte}
                    className="w-20 border rounded-lg px-2 py-1.5 text-sm text-right outline-none focus:ring-2 focus:ring-yellow-400 disabled:bg-gray-50" style={{ borderColor: '#E0E0E0' }}
                    placeholder="0" value={nombres[cle] ?? ''}
                    onChange={e => { setNombres({ ...nombres, [cle]: e.target.value.replace(/[^0-9]/g, '') }); setSurPlaceModifie(true); setSurPlaceMessage(null) }} />
                </label>
              )
            })}
          </div>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mt-4">
            <p className="text-sm" style={{ color: '#1A2535' }}>
              Total {listeVilles.length > 1 ? `à ${listeVilles.find(v => v.cle === villeActive)?.nom}` : ''} : <strong>{totalVille(villeActive)}</strong> personne{totalVille(villeActive) > 1 ? 's' : ''}
            </p>
            {ouverte && (
              <button onClick={sauverSurPlace} disabled={surPlaceChargement || !surPlaceModifie} className="px-4 py-2 rounded-lg text-sm font-medium text-white disabled:opacity-50" style={{ backgroundColor: '#4CAF7D' }}>
                {surPlaceChargement ? 'Sauvegarde...' : surPlaceModifie ? 'Sauvegarder sur place' : '✓ À jour'}
              </button>
            )}
          </div>
          {surPlaceMessage && (
            <p className="text-sm mt-2" style={{ color: surPlaceMessage.type === 'succes' ? '#2E7D32' : '#C62828' }}>{surPlaceMessage.texte}</p>
          )}
          {listeVilles.length > 1 && ouverte && <p className="text-xs mt-2" style={{ color: '#999999' }}>Le bouton enregistre toutes les salles d&apos;un coup.</p>}
        </div>

        {autresSurPlace.length > 0 && (
          <div className="px-4 pb-4">
            <p className="text-xs font-bold uppercase tracking-wide mb-2" style={{ color: '#999999' }}>🔒 Vos leaders en dessous</p>
            <div className="space-y-2">
              {autresSurPlace.map(([leaderId, lignes]) => (
                <div key={leaderId} className="rounded-lg p-3 text-sm" style={{ backgroundColor: '#F5F3EE', marginLeft: `${decalage(leaderId) * 16}px` }}>
                  <p className="font-medium" style={{ color: '#1A2535' }}>{titreLeader(leaderId)} — {lignes.reduce((s, l) => s + l.nombre, 0)} personne(s)</p>
                  {listeVilles.map(v => {
                    const dansVille = lignes.filter(l => cleVille(l.ville_id) === v.cle).sort((a, b) => ordreType(a.type_id) - ordreType(b.type_id))
                    if (dansVille.length === 0) return null
                    return (
                      <p key={v.cle} className="text-xs mt-1" style={{ color: '#666666' }}>
                        {listeVilles.length > 1 && <strong>{v.nom} : </strong>}
                        {dansVille.map(l => `${nomType(l.type_id)} ${l.nombre}`).join(' · ')}
                      </p>
                    )
                  })}
                </div>
              ))}
            </div>
          </div>
        )}
      </section>
    </div>
  )
}
