'use client'

import { useState, useMemo } from 'react'
import { createClient } from '@/utils/supabase/client'
import { useRouter } from 'next/navigation'
import type { Compte } from '@/lib/types'

interface Props {
  pciEnAttente: Compte[]
  pciActifs: Compte[]
  leaders: { id: string; prenom_1: string; nom_1: string }[]
}

const PROVINCES_CANADA = ['Québec', 'Ontario', 'Colombie-Britannique', 'Alberta', 'Manitoba', 'Saskatchewan', 'Nouvelle-Écosse', 'Nouveau-Brunswick', 'Terre-Neuve-et-Labrador', 'Île-du-Prince-Édouard']
const PAYS_OPTIONS = ['Canada', 'États-Unis', 'France', 'Belgique', 'Suisse']

const formVide = {
  prenom_1: '', nom_1: '', prenom_2: '', nom_2: '',
  courriel: '', telephone: '', adresse: '', ville: '',
  code_postal: '', province: '', pays: 'Canada',
  numero_amway: '', date_inscription_amway: '',
  role: 'pci', leader_id: '',
  periode_sf_debut: '', periode_sf_fin: '',
  groupe: '', mot_de_passe: '',
}

export default function GestionPCI({ pciEnAttente, pciActifs, leaders }: Props) {
  const [onglet, setOnglet] = useState<'attente' | 'actifs'>('attente')
  const [chargement, setChargement] = useState<string | null>(null)
  const [modalModif, setModalModif] = useState<Compte | null>(null)
  const [sauvegarde, setSauvegarde] = useState(false)
  const [form, setForm] = useState<any>({})
  const [uploadingPhoto, setUploadingPhoto] = useState(false)
  const [photoPreview, setPhotoPreview] = useState<string | null>(null)
  const [recherche, setRecherche] = useState('')
  const [filtreLeader, setFiltreLeader] = useState('')
  const [modalAjout, setModalAjout] = useState(false)
  const [formAjout, setFormAjout] = useState<any>(formVide)
  const [ajoutChargement, setAjoutChargement] = useState(false)
  const [ajoutErreur, setAjoutErreur] = useState('')
  const router = useRouter()
  const supabase = createClient()

  function update(champ: string, valeur: any) {
    setForm((f: any) => ({ ...f, [champ]: valeur }))
  }

  function updateAjout(champ: string, valeur: string) {
    setFormAjout((f: any) => ({ ...f, [champ]: valeur }))
  }

  function ouvrirModalAjout() {
    setFormAjout(formVide)
    setAjoutErreur('')
    setModalAjout(true)
  }

  async function creerPCI() {
    setAjoutErreur('')
    if (!formAjout.prenom_1 || !formAjout.nom_1 || !formAjout.courriel || !formAjout.mot_de_passe) {
      setAjoutErreur('Prénom, nom, courriel et mot de passe sont obligatoires.'); return
    }
    if (formAjout.mot_de_passe.length < 8) {
      setAjoutErreur('Le mot de passe doit contenir au moins 8 caractères.'); return
    }
    setAjoutChargement(true)

    const res = await fetch('/api/admin/creer-pci', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(formAjout),
    })

    const data = await res.json()
    if (!res.ok) {
      setAjoutErreur(data.error ?? 'Erreur lors de la création.')
      setAjoutChargement(false)
      return
    }

    setAjoutChargement(false)
    setModalAjout(false)
    router.refresh()
  }

  async function approuver(id: string) {
    setChargement(id)
    const pci = pciEnAttente.find(p => p.id === id)
    const debut = pci?.date_inscription_amway ? new Date(pci.date_inscription_amway) : new Date()
    const fin = new Date(debut)
    fin.setFullYear(fin.getFullYear() + 1)

    await supabase.from('comptes').update({
      statut: 'actif',
      periode_sf_debut: debut.toISOString(),
      periode_sf_fin: fin.toISOString(),
    }).eq('id', id)

    if (pci) {
      await fetch('/api/emails/bienvenue-pci', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prenom: pci.prenom_1, nom: pci.nom_1, email: pci.courriel }),
      })
    }

    setChargement(null)
    router.refresh()
  }

  async function refuser(id: string) {
    setChargement(id)
    await supabase.from('comptes').update({ statut: 'inactif' }).eq('id', id)
    setChargement(null)
    router.refresh()
  }

  function ouvrirModif(pci: Compte) {
    setModalModif(pci)
    setPhotoPreview((pci as any).photo_url ?? null)
    setForm({
      prenom_1: pci.prenom_1 ?? '',
      nom_1: pci.nom_1 ?? '',
      prenom_2: pci.prenom_2 ?? '',
      nom_2: pci.nom_2 ?? '',
      courriel: pci.courriel ?? '',
      telephone: pci.telephone ?? '',
      adresse: pci.adresse ?? '',
      ville: pci.ville ?? '',
      code_postal: pci.code_postal ?? '',
      province: pci.province ?? '',
      pays: pci.pays ?? 'Canada',
      numero_amway: pci.numero_amway ?? '',
      date_inscription_amway: pci.date_inscription_amway ?? '',
      role: pci.role ?? 'pci',
      leader_id: pci.leader_id ?? '',
      periode_sf_debut: pci.periode_sf_debut ? pci.periode_sf_debut.substring(0, 10) : '',
      periode_sf_fin: pci.periode_sf_fin ? pci.periode_sf_fin.substring(0, 10) : '',
      groupe: pci.groupe ?? '',
      photo_url: (pci as any).photo_url ?? '',
      visible_inscription: (pci as any).visible_inscription !== false,
    })
  }

  async function uploadPhotoLeader(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file || !modalModif) return
    if (file.size > 2 * 1024 * 1024) { alert('Fichier trop volumineux (max 2MB)'); return }
    setUploadingPhoto(true)
    const ext = file.name.split('.').pop()
    const fileName = `leader-${modalModif.id}.${ext}`
    const { error: uploadError } = await supabase.storage.from('leaders-photos').upload(fileName, file, { upsert: true })
    if (uploadError) { alert('Erreur lors du téléversement'); setUploadingPhoto(false); return }
    const { data: urlData } = supabase.storage.from('leaders-photos').getPublicUrl(fileName)
    const url = `${urlData.publicUrl}?t=${Date.now()}`
    update('photo_url', url)
    setPhotoPreview(url)
    setUploadingPhoto(false)
    e.target.value = ''
  }

  async function supprimerPhotoLeader() {
    if (!confirm('Supprimer la photo de ce leader?')) return
    update('photo_url', '')
    setPhotoPreview(null)
  }

  async function sauvegarderModif() {
    if (!modalModif) return
    setSauvegarde(true)
    await fetch('/api/admin/modifier-compte', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: modalModif.id, ...form,
        leader_id: form.leader_id || null,
        periode_sf_debut: form.periode_sf_debut || null,
        periode_sf_fin: form.periode_sf_fin || null,
        groupe: form.groupe || null,
        photo_url: form.photo_url || null,
        visible_inscription: form.visible_inscription,
      }),
    })
    setSauvegarde(false)
    setModalModif(null)
    router.refresh()
  }

  const pciActifsFiltres = useMemo(() => {
    return pciActifs.filter(pci => {
      const matchRecherche = recherche.length < 2 ? true :
        `${pci.prenom_1} ${pci.nom_1}`.toLowerCase().includes(recherche.toLowerCase()) ||
        (pci.prenom_2 && `${pci.prenom_2} ${pci.nom_2}`.toLowerCase().includes(recherche.toLowerCase())) ||
        pci.courriel.toLowerCase().includes(recherche.toLowerCase()) ||
        pci.numero_amway.toLowerCase().includes(recherche.toLowerCase())

      const matchLeader =
        filtreLeader === '' ? true :
        filtreLeader === 'aucun' ? !pci.leader_id :
        pci.leader_id === filtreLeader

      return matchRecherche && matchLeader
    })
  }, [pciActifs, recherche, filtreLeader])

  const ongletClass = (actif: boolean) =>
    `px-4 py-2 text-sm font-medium rounded-t-lg transition-colors ${actif ? 'text-white' : 'text-gray-500 hover:text-gray-700'}`

  const roleLabel = (role: string) => {
    if (role === 'leader') return { label: 'Leader', bg: '#E3F2FD', color: '#2E86C1' }
    if (role === 'admin') return { label: 'Admin', bg: '#FFF3E0', color: '#E57373' }
    if (role === 'portier') return { label: 'Portier', bg: '#F3E5F5', color: '#9C27B0' }
    return { label: 'Actif', bg: '#E8F5E9', color: '#4CAF7D' }
  }

  const inputClass = "w-full border rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-yellow-400"
  const labelClass = "block text-xs font-medium mb-1"
  const orphelins = pciActifs.filter(p => !p.leader_id).length

  return (
    <div>
      {/* Bouton ajouter + onglets */}
      <div className="flex items-center justify-between mb-0">
        <div className="flex gap-2">
          <button onClick={() => setOnglet('attente')} className={ongletClass(onglet === 'attente')} style={onglet === 'attente' ? { backgroundColor: '#C9A84C' } : { backgroundColor: '#E0E0E0' }}>
            En attente
            {pciEnAttente.length > 0 && (
              <span className="ml-2 px-1.5 py-0.5 rounded-full text-xs font-bold" style={{ backgroundColor: '#E57373', color: 'white' }}>{pciEnAttente.length}</span>
            )}
          </button>
          <button onClick={() => setOnglet('actifs')} className={ongletClass(onglet === 'actifs')} style={onglet === 'actifs' ? { backgroundColor: '#C9A84C' } : { backgroundColor: '#E0E0E0' }}>
            PCI actifs ({pciActifs.length})
          </button>
        </div>
        <button onClick={ouvrirModalAjout} className="px-4 py-2 rounded-lg text-sm font-medium text-white" style={{ backgroundColor: '#4CAF7D' }}>
          + Ajouter un PCI
        </button>
      </div>

      <div className="bg-white rounded-b-2xl rounded-tr-2xl shadow">

        {/* Barre de recherche */}
        {onglet === 'actifs' && (
          <div className="p-4 border-b space-y-3" style={{ borderColor: '#E0E0E0' }}>
            <input className="w-full border rounded-lg px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-yellow-400" style={{ borderColor: '#E0E0E0' }} placeholder="Rechercher par nom, courriel ou # Amway..." value={recherche} onChange={e => setRecherche(e.target.value)} />
            <div className="flex flex-wrap gap-2 items-center">
              <select className="border rounded-lg px-3 py-1.5 text-sm outline-none" style={{ borderColor: '#E0E0E0' }} value={filtreLeader} onChange={e => setFiltreLeader(e.target.value)}>
                <option value="">Tous les leaders</option>
                <option value="aucun">⚠️ Aucun leader assigné ({orphelins})</option>
                {leaders.map(l => <option key={l.id} value={l.id}>{l.prenom_1} {l.nom_1}</option>)}
              </select>
              {(recherche || filtreLeader) && (
                <button onClick={() => { setRecherche(''); setFiltreLeader('') }} className="px-3 py-1.5 rounded-lg text-xs font-medium" style={{ backgroundColor: '#F5F3EE', color: '#666666' }}>
                  ✕ Effacer les filtres
                </button>
              )}
              <span className="ml-auto text-xs" style={{ color: '#999999' }}>{pciActifsFiltres.length} résultat{pciActifsFiltres.length !== 1 ? 's' : ''}</span>
            </div>
            {orphelins > 0 && !filtreLeader && (
              <button onClick={() => setFiltreLeader('aucun')} className="flex items-center gap-2 text-xs font-medium px-3 py-1.5 rounded-lg" style={{ backgroundColor: '#FFF3E0', color: '#E57373', border: '1px solid #FFCC80' }}>
                ⚠️ {orphelins} PCI sans leader assigné — Cliquer pour voir
              </button>
            )}
          </div>
        )}

        {/* EN ATTENTE */}
        {onglet === 'attente' && (
          <div>
            {pciEnAttente.length === 0 ? (
              <div className="p-8 text-center" style={{ color: '#666666' }}>Aucune demande en attente ✓</div>
            ) : (
              pciEnAttente.map(pci => (
                <div key={pci.id} className="p-4 border-b flex items-start justify-between gap-4" style={{ borderColor: '#E0E0E0' }}>
                  <div className="flex-1">
                    <p className="font-semibold" style={{ color: '#1A2535' }}>
                      {pci.prenom_1} {pci.nom_1}
                      {pci.prenom_2 && <span className="text-sm font-normal ml-2" style={{ color: '#666666' }}>+ {pci.prenom_2} {pci.nom_2}</span>}
                    </p>
                    <p className="text-sm" style={{ color: '#666666' }}>{pci.courriel}</p>
                    <p className="text-sm" style={{ color: '#666666' }}>{pci.ville}, {pci.province} · #{pci.numero_amway}</p>
                    <p className="text-xs mt-1" style={{ color: '#999999' }}>Inscrit le {new Date(pci.created_at).toLocaleDateString('fr-CA')}</p>
                    {pci.date_inscription_amway && (
                      <p className="text-xs mt-0.5" style={{ color: '#999999' }}>Inscription Amway : {new Date(pci.date_inscription_amway).toLocaleDateString('fr-CA')}</p>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => approuver(pci.id)} disabled={chargement === pci.id} className="px-4 py-2 rounded-lg text-sm font-medium text-white disabled:opacity-50" style={{ backgroundColor: '#4CAF7D' }}>
                      {chargement === pci.id ? '...' : 'Approuver'}
                    </button>
                    <button onClick={() => refuser(pci.id)} disabled={chargement === pci.id} className="px-4 py-2 rounded-lg text-sm font-medium text-white disabled:opacity-50" style={{ backgroundColor: '#E57373' }}>
                      Refuser
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* ACTIFS */}
        {onglet === 'actifs' && (
          <div>
            {pciActifsFiltres.length === 0 ? (
              <div className="p-8 text-center" style={{ color: '#666666' }}>Aucun PCI trouvé</div>
            ) : (
              pciActifsFiltres.map(pci => {
                const { label, bg, color } = roleLabel(pci.role)
                const leaderDuPCI = leaders.find(l => l.id === pci.leader_id)
                const estInvisible = pci.role === 'leader' && (pci as any).visible_inscription === false
                return (
                  <div key={pci.id} className="p-4 border-b flex items-start justify-between gap-4" style={{ borderColor: '#E0E0E0' }}>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <p className="font-semibold" style={{ color: '#1A2535' }}>
                          {pci.prenom_1} {pci.nom_1}
                          {pci.prenom_2 && <span className="text-sm font-normal ml-2" style={{ color: '#666666' }}>+ {pci.prenom_2} {pci.nom_2}</span>}
                        </p>
                        <span className="px-2 py-0.5 rounded-full text-xs font-medium" style={{ backgroundColor: bg, color }}>{label}</span>
                        {!pci.leader_id && <span className="px-2 py-0.5 rounded-full text-xs font-medium" style={{ backgroundColor: '#FFF3E0', color: '#E57373' }}>⚠️ Sans leader</span>}
                        {estInvisible && <span className="px-2 py-0.5 rounded-full text-xs font-medium" style={{ backgroundColor: '#F3E5F5', color: '#9C27B0' }}>👁️ Invisible</span>}
                      </div>
                      <p className="text-sm" style={{ color: '#666666' }}>{pci.courriel}</p>
                      <p className="text-sm" style={{ color: '#666666' }}>{pci.ville}, {pci.province} · #{pci.numero_amway}</p>
                      {leaderDuPCI && <p className="text-xs mt-0.5" style={{ color: '#2E86C1' }}>Leader : {leaderDuPCI.prenom_1} {leaderDuPCI.nom_1}</p>}
                      {(pci as any).groupe && <p className="text-xs mt-0.5 font-medium" style={{ color: '#C9A84C' }}>Groupe : {(pci as any).groupe}</p>}
                      <p className="text-xs mt-1" style={{ color: '#4CAF7D' }}>
                        Sans frais jusqu'au {pci.periode_sf_fin ? new Date(pci.periode_sf_fin).toLocaleDateString('fr-CA') : 'N/A'}
                      </p>
                    </div>
                    <button onClick={() => ouvrirModif(pci)} className="px-3 py-1.5 rounded-lg text-xs font-medium" style={{ backgroundColor: '#F5F3EE', color: '#1A2535' }}>
                      ✏️ Modifier
                    </button>
                  </div>
                )
              })
            )}
          </div>
        )}
      </div>

      {/* Modal ajout PCI */}
      {modalAjout && (
        <div className="fixed inset-0 flex items-center justify-center z-50 p-4" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white px-6 pt-6 pb-4 border-b flex justify-between items-center" style={{ borderColor: '#E0E0E0' }}>
              <h2 className="text-lg font-bold" style={{ color: '#1A2535' }}>Ajouter un PCI</h2>
              <button onClick={() => setModalAjout(false)} className="text-gray-400 hover:text-gray-600 text-xl">✕</button>
            </div>

            <div className="px-6 py-4 space-y-4">

              <p className="text-xs font-bold uppercase tracking-wide" style={{ color: '#C9A84C' }}>Identité</p>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelClass} style={{ color: '#1A2535' }}>Prénom *</label>
                  <input className={inputClass} style={{ borderColor: '#E0E0E0' }} value={formAjout.prenom_1} onChange={e => updateAjout('prenom_1', e.target.value)} />
                </div>
                <div>
                  <label className={labelClass} style={{ color: '#1A2535' }}>Nom *</label>
                  <input className={inputClass} style={{ borderColor: '#E0E0E0' }} value={formAjout.nom_1} onChange={e => updateAjout('nom_1', e.target.value)} />
                </div>
                <div>
                  <label className={labelClass} style={{ color: '#666666' }}>Prénom co-PCI</label>
                  <input className={inputClass} style={{ borderColor: '#E0E0E0' }} value={formAjout.prenom_2} onChange={e => updateAjout('prenom_2', e.target.value)} />
                </div>
                <div>
                  <label className={labelClass} style={{ color: '#666666' }}>Nom co-PCI</label>
                  <input className={inputClass} style={{ borderColor: '#E0E0E0' }} value={formAjout.nom_2} onChange={e => updateAjout('nom_2', e.target.value)} />
                </div>
              </div>

              <p className="text-xs font-bold uppercase tracking-wide pt-2" style={{ color: '#C9A84C' }}>Contact</p>
              <div>
                <label className={labelClass} style={{ color: '#1A2535' }}>Courriel *</label>
                <input type="email" className={inputClass} style={{ borderColor: '#E0E0E0' }} value={formAjout.courriel} onChange={e => updateAjout('courriel', e.target.value)} />
              </div>
              <div>
                <label className={labelClass} style={{ color: '#1A2535' }}>Mot de passe temporaire *</label>
                <input type="text" className={inputClass} style={{ borderColor: '#E0E0E0' }} placeholder="Min. 8 caractères" value={formAjout.mot_de_passe} onChange={e => updateAjout('mot_de_passe', e.target.value)} />
                <p className="text-xs mt-1" style={{ color: '#999999' }}>Le PCI pourra le changer après sa première connexion</p>
              </div>
              <div>
                <label className={labelClass} style={{ color: '#1A2535' }}>Téléphone</label>
                <input className={inputClass} style={{ borderColor: '#E0E0E0' }} value={formAjout.telephone} onChange={e => updateAjout('telephone', e.target.value)} />
              </div>

              <p className="text-xs font-bold uppercase tracking-wide pt-2" style={{ color: '#C9A84C' }}>Adresse</p>
              <div>
                <label className={labelClass} style={{ color: '#1A2535' }}>Adresse</label>
                <input className={inputClass} style={{ borderColor: '#E0E0E0' }} value={formAjout.adresse} onChange={e => updateAjout('adresse', e.target.value)} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelClass} style={{ color: '#1A2535' }}>Ville</label>
                  <input className={inputClass} style={{ borderColor: '#E0E0E0' }} value={formAjout.ville} onChange={e => updateAjout('ville', e.target.value)} />
                </div>
                <div>
                  <label className={labelClass} style={{ color: '#1A2535' }}>Code postal</label>
                  <input className={inputClass} style={{ borderColor: '#E0E0E0' }} value={formAjout.code_postal} onChange={e => updateAjout('code_postal', e.target.value)} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelClass} style={{ color: '#1A2535' }}>Province</label>
                  <select className={inputClass} style={{ borderColor: '#E0E0E0' }} value={formAjout.province} onChange={e => updateAjout('province', e.target.value)}>
                    <option value="">Sélectionner...</option>
                    {PROVINCES_CANADA.map(p => <option key={p}>{p}</option>)}
                  </select>
                </div>
                <div>
                  <label className={labelClass} style={{ color: '#1A2535' }}>Pays</label>
                  <select className={inputClass} style={{ borderColor: '#E0E0E0' }} value={formAjout.pays} onChange={e => updateAjout('pays', e.target.value)}>
                    {PAYS_OPTIONS.map(p => <option key={p}>{p}</option>)}
                  </select>
                </div>
              </div>

              <p className="text-xs font-bold uppercase tracking-wide pt-2" style={{ color: '#C9A84C' }}>Amway</p>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelClass} style={{ color: '#1A2535' }}>Numéro Amway</label>
                  <input className={inputClass} style={{ borderColor: '#E0E0E0' }} value={formAjout.numero_amway} onChange={e => updateAjout('numero_amway', e.target.value)} />
                </div>
                <div>
                  <label className={labelClass} style={{ color: '#1A2535' }}>Date inscription</label>
                  <input type="date" className={inputClass} style={{ borderColor: '#E0E0E0' }} value={formAjout.date_inscription_amway} onChange={e => updateAjout('date_inscription_amway', e.target.value)} />
                </div>
              </div>

              <p className="text-xs font-bold uppercase tracking-wide pt-2" style={{ color: '#C9A84C' }}>Rôle et hiérarchie</p>
              <div>
                <label className={labelClass} style={{ color: '#1A2535' }}>Rôle</label>
                <select className={inputClass} style={{ borderColor: '#E0E0E0' }} value={formAjout.role} onChange={e => updateAjout('role', e.target.value)}>
                  <option value="pci">PCI</option>
                  <option value="leader">Leader</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
              <div>
                <label className={labelClass} style={{ color: '#1A2535' }}>Leader assigné</label>
                <select className={inputClass} style={{ borderColor: '#E0E0E0' }} value={formAjout.leader_id} onChange={e => updateAjout('leader_id', e.target.value)}>
                  <option value="">Aucun leader</option>
                  {leaders.map(l => <option key={l.id} value={l.id}>{l.prenom_1} {l.nom_1}</option>)}
                </select>
              </div>

              <p className="text-xs font-bold uppercase tracking-wide pt-2" style={{ color: '#C9A84C' }}>Groupe</p>
              <div>
                <label className={labelClass} style={{ color: '#1A2535' }}>Groupe (tag libre)</label>
                <input className={inputClass} style={{ borderColor: '#E0E0E0' }} placeholder="Ex: BRISSON, ÉQUIPE-NORD..." value={formAjout.groupe} onChange={e => updateAjout('groupe', e.target.value)} />
              </div>

              <p className="text-xs font-bold uppercase tracking-wide pt-2" style={{ color: '#C9A84C' }}>Période sans frais</p>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelClass} style={{ color: '#1A2535' }}>Début</label>
                  <input type="date" className={inputClass} style={{ borderColor: '#E0E0E0' }} value={formAjout.periode_sf_debut} onChange={e => updateAjout('periode_sf_debut', e.target.value)} />
                </div>
                <div>
                  <label className={labelClass} style={{ color: '#1A2535' }}>Fin</label>
                  <input type="date" className={inputClass} style={{ borderColor: '#E0E0E0' }} value={formAjout.periode_sf_fin} onChange={e => updateAjout('periode_sf_fin', e.target.value)} />
                </div>
              </div>

              {ajoutErreur && <p className="text-sm text-center" style={{ color: '#E57373' }}>{ajoutErreur}</p>}

            </div>

            <div className="sticky bottom-0 bg-white px-6 py-4 border-t flex justify-end gap-3" style={{ borderColor: '#E0E0E0' }}>
              <button onClick={() => setModalAjout(false)} className="px-4 py-2 rounded-lg text-sm font-medium" style={{ color: '#666666', backgroundColor: '#F5F3EE' }}>Annuler</button>
              <button onClick={creerPCI} disabled={ajoutChargement} className="px-4 py-2 rounded-lg text-sm font-medium text-white disabled:opacity-50" style={{ backgroundColor: '#4CAF7D' }}>
                {ajoutChargement ? 'Création...' : '+ Créer le PCI'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal modification complète */}
      {modalModif && (
        <div className="fixed inset-0 flex items-center justify-center z-50 p-4" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white px-6 pt-6 pb-4 border-b flex justify-between items-center" style={{ borderColor: '#E0E0E0' }}>
              <h2 className="text-lg font-bold" style={{ color: '#1A2535' }}>Modifier le compte</h2>
              <button onClick={() => setModalModif(null)} className="text-gray-400 hover:text-gray-600 text-xl">✕</button>
            </div>

            <div className="px-6 py-4 space-y-4">

              <p className="text-xs font-bold uppercase tracking-wide" style={{ color: '#C9A84C' }}>Identité</p>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelClass} style={{ color: '#1A2535' }}>Prénom</label>
                  <input className={inputClass} style={{ borderColor: '#E0E0E0' }} value={form.prenom_1} onChange={e => update('prenom_1', e.target.value)} />
                </div>
                <div>
                  <label className={labelClass} style={{ color: '#1A2535' }}>Nom</label>
                  <input className={inputClass} style={{ borderColor: '#E0E0E0' }} value={form.nom_1} onChange={e => update('nom_1', e.target.value)} />
                </div>
                <div>
                  <label className={labelClass} style={{ color: '#666666' }}>Prénom co-PCI</label>
                  <input className={inputClass} style={{ borderColor: '#E0E0E0' }} value={form.prenom_2} onChange={e => update('prenom_2', e.target.value)} />
                </div>
                <div>
                  <label className={labelClass} style={{ color: '#666666' }}>Nom co-PCI</label>
                  <input className={inputClass} style={{ borderColor: '#E0E0E0' }} value={form.nom_2} onChange={e => update('nom_2', e.target.value)} />
                </div>
              </div>

              <p className="text-xs font-bold uppercase tracking-wide pt-2" style={{ color: '#C9A84C' }}>Contact</p>
              <div>
                <label className={labelClass} style={{ color: '#1A2535' }}>Courriel</label>
                <input type="email" className={inputClass} style={{ borderColor: '#E0E0E0' }} value={form.courriel} onChange={e => update('courriel', e.target.value)} />
              </div>
              <div>
                <label className={labelClass} style={{ color: '#1A2535' }}>Téléphone</label>
                <input className={inputClass} style={{ borderColor: '#E0E0E0' }} value={form.telephone} onChange={e => update('telephone', e.target.value)} />
              </div>

              <p className="text-xs font-bold uppercase tracking-wide pt-2" style={{ color: '#C9A84C' }}>Adresse</p>
              <div>
                <label className={labelClass} style={{ color: '#1A2535' }}>Adresse</label>
                <input className={inputClass} style={{ borderColor: '#E0E0E0' }} value={form.adresse} onChange={e => update('adresse', e.target.value)} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelClass} style={{ color: '#1A2535' }}>Ville</label>
                  <input className={inputClass} style={{ borderColor: '#E0E0E0' }} value={form.ville} onChange={e => update('ville', e.target.value)} />
                </div>
                <div>
                  <label className={labelClass} style={{ color: '#1A2535' }}>Code postal</label>
                  <input className={inputClass} style={{ borderColor: '#E0E0E0' }} value={form.code_postal} onChange={e => update('code_postal', e.target.value)} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelClass} style={{ color: '#1A2535' }}>Province</label>
                  <select className={inputClass} style={{ borderColor: '#E0E0E0' }} value={form.province} onChange={e => update('province', e.target.value)}>
                    <option value="">Sélectionner...</option>
                    {PROVINCES_CANADA.map(p => <option key={p}>{p}</option>)}
                  </select>
                </div>
                <div>
                  <label className={labelClass} style={{ color: '#1A2535' }}>Pays</label>
                  <select className={inputClass} style={{ borderColor: '#E0E0E0' }} value={form.pays} onChange={e => update('pays', e.target.value)}>
                    {PAYS_OPTIONS.map(p => <option key={p}>{p}</option>)}
                  </select>
                </div>
              </div>

              <p className="text-xs font-bold uppercase tracking-wide pt-2" style={{ color: '#C9A84C' }}>Amway</p>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelClass} style={{ color: '#1A2535' }}>Numéro Amway</label>
                  <input className={inputClass} style={{ borderColor: '#E0E0E0' }} value={form.numero_amway} onChange={e => update('numero_amway', e.target.value)} />
                </div>
                <div>
                  <label className={labelClass} style={{ color: '#1A2535' }}>Date inscription</label>
                  <input type="date" className={inputClass} style={{ borderColor: '#E0E0E0' }} value={form.date_inscription_amway} onChange={e => update('date_inscription_amway', e.target.value)} />
                </div>
              </div>

              <p className="text-xs font-bold uppercase tracking-wide pt-2" style={{ color: '#C9A84C' }}>Rôle et hiérarchie</p>
              <div>
                <label className={labelClass} style={{ color: '#1A2535' }}>Rôle</label>
                <select className={inputClass} style={{ borderColor: '#E0E0E0' }} value={form.role} onChange={e => update('role', e.target.value)}>
                  <option value="pci">PCI</option>
                  <option value="leader">Leader</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
              <div>
                <label className={labelClass} style={{ color: '#1A2535' }}>Leader assigné</label>
                <select className={inputClass} style={{ borderColor: '#E0E0E0' }} value={form.leader_id} onChange={e => update('leader_id', e.target.value)}>
                  <option value="">Aucun leader</option>
                  {leaders.map(l => (
                    <option key={l.id} value={l.id}>{l.prenom_1} {l.nom_1}</option>
                  ))}
                </select>
              </div>

              {/* Visibilité — seulement si rôle = leader */}
              {form.role === 'leader' && (
                <>
                  <p className="text-xs font-bold uppercase tracking-wide pt-2" style={{ color: '#C9A84C' }}>Visibilité à l'inscription</p>
                  <div className="rounded-xl p-4 space-y-3" style={{ backgroundColor: '#F8F7F4', border: '1px solid #E0E0E0' }}>
                    <label className="flex items-start gap-3 cursor-pointer">
                      <input type="radio" name="visible_inscription" checked={form.visible_inscription !== false} onChange={() => update('visible_inscription', true)} className="mt-0.5" />
                      <div>
                        <p className="text-sm font-medium" style={{ color: '#1A2535' }}>Régulier</p>
                        <p className="text-xs" style={{ color: '#666666' }}>Apparaît dans le dropdown à l'inscription et dans le carrousel de la page d'accueil</p>
                      </div>
                    </label>
                    <label className="flex items-start gap-3 cursor-pointer">
                      <input type="radio" name="visible_inscription" checked={form.visible_inscription === false} onChange={() => update('visible_inscription', false)} className="mt-0.5" />
                      <div>
                        <p className="text-sm font-medium" style={{ color: '#9C27B0' }}>Invisible</p>
                        <p className="text-xs" style={{ color: '#666666' }}>Caché du dropdown à l'inscription et du carrousel — visible uniquement dans l'admin</p>
                      </div>
                    </label>
                  </div>
                </>
              )}

              {/* Photo leader */}
              {form.role === 'leader' && (
                <>
                  <p className="text-xs font-bold uppercase tracking-wide pt-2" style={{ color: '#C9A84C' }}>Photo du leader</p>
                  <p className="text-xs text-gray-400">Format carré recommandé, min 400×400px, JPG/PNG, max 2MB</p>
                  {photoPreview ? (
                    <div className="flex items-center gap-4">
                      <img src={photoPreview} alt="Photo leader" className="w-20 h-20 rounded-full object-cover border-2" style={{ borderColor: '#C9A84C' }} />
                      <div className="flex flex-col gap-2">
                        <label className="px-3 py-1.5 rounded-lg text-xs font-medium cursor-pointer text-white" style={{ backgroundColor: '#2E86C1' }}>
                          {uploadingPhoto ? 'Téléversement...' : 'Changer la photo'}
                          <input type="file" accept="image/*" className="hidden" onChange={uploadPhotoLeader} disabled={uploadingPhoto} />
                        </label>
                        <button onClick={supprimerPhotoLeader} className="px-3 py-1.5 rounded-lg text-xs font-medium" style={{ backgroundColor: '#FEE2E2', color: '#E57373' }}>Supprimer</button>
                      </div>
                    </div>
                  ) : (
                    <label className="flex flex-col items-center justify-center w-full h-24 border-2 border-dashed rounded-xl cursor-pointer hover:bg-yellow-50 transition-colors" style={{ borderColor: '#C9A84C' }}>
                      {uploadingPhoto ? (
                        <p className="text-sm text-gray-500">Téléversement...</p>
                      ) : (
                        <>
                          <p className="text-sm font-medium" style={{ color: '#C9A84C' }}>Cliquer pour ajouter une photo</p>
                          <p className="text-xs text-gray-400 mt-1">JPG, PNG — max 2MB</p>
                        </>
                      )}
                      <input type="file" accept="image/*" className="hidden" onChange={uploadPhotoLeader} disabled={uploadingPhoto} />
                    </label>
                  )}
                </>
              )}

              <p className="text-xs font-bold uppercase tracking-wide pt-2" style={{ color: '#C9A84C' }}>Groupe</p>
              <div>
                <label className={labelClass} style={{ color: '#1A2535' }}>Groupe (tag libre)</label>
                <input className={inputClass} style={{ borderColor: '#E0E0E0' }} placeholder="Ex: BRISSON, ÉQUIPE-NORD..." value={form.groupe} onChange={e => update('groupe', e.target.value)} />
              </div>

              <p className="text-xs font-bold uppercase tracking-wide pt-2" style={{ color: '#C9A84C' }}>Période sans frais</p>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelClass} style={{ color: '#1A2535' }}>Début</label>
                  <input type="date" className={inputClass} style={{ borderColor: '#E0E0E0' }} value={form.periode_sf_debut} onChange={e => update('periode_sf_debut', e.target.value)} />
                </div>
                <div>
                  <label className={labelClass} style={{ color: '#1A2535' }}>Fin</label>
                  <input type="date" className={inputClass} style={{ borderColor: '#E0E0E0' }} value={form.periode_sf_fin} onChange={e => update('periode_sf_fin', e.target.value)} />
                </div>
              </div>

            </div>

            <div className="sticky bottom-0 bg-white px-6 py-4 border-t flex justify-end gap-3" style={{ borderColor: '#E0E0E0' }}>
              <button onClick={() => setModalModif(null)} className="px-4 py-2 rounded-lg text-sm font-medium" style={{ color: '#666666', backgroundColor: '#F5F3EE' }}>Annuler</button>
              <button onClick={sauvegarderModif} disabled={sauvegarde} className="px-4 py-2 rounded-lg text-sm font-medium text-white disabled:opacity-50" style={{ backgroundColor: '#C9A84C' }}>
                {sauvegarde ? 'Sauvegarde...' : 'Sauvegarder'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}