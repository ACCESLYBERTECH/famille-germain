'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/utils/supabase/client'

interface Categorie { id: string; nom: string; ordre: number }
interface Audio {
  id: string
  categorie_id: string | null
  titre: string
  description: string | null
  chemin: string
  taille: number | null
  ordre: number
  actif: boolean
  url: string
}

const TAILLE_MAX = 50 * 1024 * 1024 // 50 Mo (limite du plan Supabase gratuit)
const EXTENSIONS = ['mp3', 'wav']

function tailleLisible(octets: number | null) {
  if (!octets) return ''
  return `${(octets / (1024 * 1024)).toFixed(1)} Mo`
}

export default function GestionAudios({ categories, audios }: { categories: Categorie[]; audios: Audio[] }) {
  const supabase = createClient()
  const router = useRouter()

  // Catégories
  const [nouvelleCategorie, setNouvelleCategorie] = useState('')
  const [categorieEdit, setCategorieEdit] = useState<{ id: string; nom: string } | null>(null)

  // Ajout d'un audio
  const [fichier, setFichier] = useState<File | null>(null)
  const [titre, setTitre] = useState('')
  const [description, setDescription] = useState('')
  const [categorieId, setCategorieId] = useState('')
  const [envoi, setEnvoi] = useState(false)
  const [erreur, setErreur] = useState('')
  const [succes, setSucces] = useState('')
  const [cleFichier, setCleFichier] = useState(0)

  // Modification d'un audio
  const [audioEdit, setAudioEdit] = useState<Audio | null>(null)
  const [occupe, setOccupe] = useState<string | null>(null)

  // ---------- Catégories
  async function ajouterCategorie() {
    const nom = nouvelleCategorie.trim()
    if (!nom) return
    const ordre = categories.length ? Math.max(...categories.map(c => c.ordre)) + 1 : 1
    const { error } = await supabase.from('audio_categories').insert({ nom, ordre })
    if (error) { alert('Erreur : ' + error.message); return }
    setNouvelleCategorie('')
    router.refresh()
  }

  async function renommerCategorie() {
    if (!categorieEdit || !categorieEdit.nom.trim()) return
    await supabase.from('audio_categories').update({ nom: categorieEdit.nom.trim() }).eq('id', categorieEdit.id)
    setCategorieEdit(null)
    router.refresh()
  }

  async function effacerCategorie(c: Categorie) {
    const nb = audios.filter(a => a.categorie_id === c.id).length
    if (!confirm(`Effacer la catégorie « ${c.nom} » ?${nb ? `\n\nSes ${nb} audio(s) seront conservés dans « Autres audios ».` : ''}`)) return
    await supabase.from('audio_categories').delete().eq('id', c.id)
    router.refresh()
  }

  async function deplacerCategorie(index: number, sens: -1 | 1) {
    const cible = index + sens
    if (cible < 0 || cible >= categories.length) return
    const liste = [...categories]
    ;[liste[index], liste[cible]] = [liste[cible], liste[index]]
    await Promise.all(liste.map((c, i) => supabase.from('audio_categories').update({ ordre: i + 1 }).eq('id', c.id)))
    router.refresh()
  }

  // ---------- Audios
  function choisirFichier(f: File | null) {
    setErreur('')
    setSucces('')
    if (!f) { setFichier(null); return }
    const ext = f.name.split('.').pop()?.toLowerCase() ?? ''
    if (!EXTENSIONS.includes(ext)) { setErreur('Format accepté : MP3 ou WAV.'); setFichier(null); return }
    if (f.size > TAILLE_MAX) { setErreur(`Fichier trop volumineux (${tailleLisible(f.size)}). Maximum : 50 Mo. Convertissez le WAV en MP3.`); setFichier(null); return }
    setFichier(f)
    if (!titre) setTitre(f.name.replace(/\.[^.]+$/, '').replace(/[-_]+/g, ' '))
  }

  async function ajouterAudio() {
    setErreur('')
    setSucces('')
    if (!fichier) { setErreur('Choisissez un fichier MP3 ou WAV.'); return }
    if (!titre.trim()) { setErreur('Entrez un titre.'); return }
    setEnvoi(true)

    const ext = fichier.name.split('.').pop()?.toLowerCase() ?? 'mp3'
    const chemin = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`
    const contentType = fichier.type || (ext === 'wav' ? 'audio/wav' : 'audio/mpeg')

    const { error: erreurEnvoi } = await supabase.storage.from('audios').upload(chemin, fichier, { contentType, upsert: false })
    if (erreurEnvoi) {
      setErreur('Erreur lors du téléversement : ' + erreurEnvoi.message)
      setEnvoi(false)
      return
    }

    const memeCategorie = audios.filter(a => (a.categorie_id ?? '') === categorieId)
    const ordre = memeCategorie.length ? Math.max(...memeCategorie.map(a => a.ordre)) + 1 : 1
    const { error: erreurBD } = await supabase.from('audios').insert({
      titre: titre.trim(),
      description: description.trim() || null,
      categorie_id: categorieId || null,
      chemin,
      taille: fichier.size,
      ordre,
      actif: true,
    })
    if (erreurBD) {
      await supabase.storage.from('audios').remove([chemin])
      setErreur('Erreur : ' + erreurBD.message)
      setEnvoi(false)
      return
    }

    setSucces(`✓ « ${titre.trim()} » ajouté.`)
    setFichier(null)
    setTitre('')
    setDescription('')
    setCleFichier(k => k + 1)
    setEnvoi(false)
    router.refresh()
  }

  async function sauvegarderAudio() {
    if (!audioEdit || !audioEdit.titre.trim()) return
    setOccupe(audioEdit.id)
    await supabase.from('audios').update({
      titre: audioEdit.titre.trim(),
      description: audioEdit.description?.trim() || null,
      categorie_id: audioEdit.categorie_id || null,
    }).eq('id', audioEdit.id)
    setOccupe(null)
    setAudioEdit(null)
    router.refresh()
  }

  async function basculerActif(a: Audio) {
    setOccupe(a.id)
    await supabase.from('audios').update({ actif: !a.actif }).eq('id', a.id)
    setOccupe(null)
    router.refresh()
  }

  async function effacerAudio(a: Audio) {
    if (!confirm(`Effacer définitivement « ${a.titre} » ?`)) return
    setOccupe(a.id)
    await supabase.storage.from('audios').remove([a.chemin])
    await supabase.from('audios').delete().eq('id', a.id)
    setOccupe(null)
    router.refresh()
  }

  async function deplacerAudio(liste: Audio[], index: number, sens: -1 | 1) {
    const cible = index + sens
    if (cible < 0 || cible >= liste.length) return
    const copie = [...liste]
    ;[copie[index], copie[cible]] = [copie[cible], copie[index]]
    await Promise.all(copie.map((a, i) => supabase.from('audios').update({ ordre: i + 1 }).eq('id', a.id)))
    router.refresh()
  }

  const sections = [
    ...categories.map(c => ({ id: c.id, nom: c.nom, audios: audios.filter(a => a.categorie_id === c.id) })),
    { id: '', nom: 'Autres audios (sans catégorie)', audios: audios.filter(a => !a.categorie_id || !categories.some(c => c.id === a.categorie_id)) },
  ]

  const inputClass = 'w-full border rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-yellow-400'
  const petitBouton = 'px-2.5 py-1 rounded-lg text-xs font-medium disabled:opacity-40'

  return (
    <div className="space-y-6">

      {/* Ajouter un audio */}
      <div className="bg-white rounded-2xl shadow p-5 space-y-3">
        <p className="text-xs font-bold uppercase tracking-wide" style={{ color: '#C9A84C' }}>Ajouter un audio</p>
        {/* Bouton bien visible pour choisir le fichier (le champ natif « Choose File » est caché) */}
        <label className="flex items-center gap-3 rounded-xl p-4 cursor-pointer transition-colors hover:opacity-90" style={{ border: '2px dashed ' + (fichier ? '#4CAF7D' : '#C9A84C'), backgroundColor: fichier ? '#E8F5E9' : '#FBF8F0' }}>
          <span className="px-4 py-2 rounded-lg text-sm font-medium flex-shrink-0" style={{ backgroundColor: '#C9A84C', color: '#1A2535' }}>📁 Choisir un fichier audio</span>
          <span className="text-sm" style={{ color: fichier ? '#1A2535' : '#999999' }}>
            {fichier ? `✓ ${fichier.name} · ${tailleLisible(fichier.size)}` : 'Aucun fichier choisi'}
          </span>
          <input key={cleFichier} type="file" accept=".mp3,.wav,audio/mpeg,audio/wav" className="sr-only" onChange={e => choisirFichier(e.target.files?.[0] ?? null)} />
        </label>
        <p className="text-xs" style={{ color: '#999999' }}>MP3 ou WAV, 50 Mo maximum. Le MP3 est recommandé (environ 10 fois plus léger qu&apos;un WAV).</p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <input className={inputClass} style={{ borderColor: '#E0E0E0' }} placeholder="Titre *" value={titre} onChange={e => setTitre(e.target.value)} />
          <select className={inputClass} style={{ borderColor: '#E0E0E0' }} value={categorieId} onChange={e => setCategorieId(e.target.value)}>
            <option value="">Sans catégorie</option>
            {categories.map(c => <option key={c.id} value={c.id}>{c.nom}</option>)}
          </select>
        </div>
        <textarea className={inputClass} style={{ borderColor: '#E0E0E0' }} rows={2} placeholder="Description courte (facultatif)" value={description} onChange={e => setDescription(e.target.value)} />
        <div className="flex items-center gap-3">
          <button onClick={ajouterAudio} disabled={envoi} className="px-5 py-2 rounded-lg text-sm font-medium text-white disabled:opacity-50" style={{ backgroundColor: '#4CAF7D' }}>
            {envoi ? 'Téléversement en cours...' : '+ Ajouter l\'audio'}
          </button>
        </div>
        {erreur && <p className="text-sm" style={{ color: '#E57373' }}>{erreur}</p>}
        {succes && <p className="text-sm" style={{ color: '#4CAF7D' }}>{succes}</p>}
      </div>

      {/* Catégories */}
      <div className="bg-white rounded-2xl shadow p-5 space-y-3">
        <p className="text-xs font-bold uppercase tracking-wide" style={{ color: '#C9A84C' }}>Catégories</p>
        {categories.length === 0 && <p className="text-sm" style={{ color: '#999999' }}>Aucune catégorie. Ex : Formation de base, Motivation...</p>}
        {categories.map((c, i) => (
          <div key={c.id} className="flex items-center gap-2">
            {categorieEdit?.id === c.id ? (
              <>
                <input className={inputClass} style={{ borderColor: '#E0E0E0' }} value={categorieEdit.nom} onChange={e => setCategorieEdit({ id: c.id, nom: e.target.value })} onKeyDown={e => e.key === 'Enter' && renommerCategorie()} autoFocus />
                <button onClick={renommerCategorie} className={petitBouton} style={{ backgroundColor: '#C9A84C', color: 'white' }}>Sauver</button>
                <button onClick={() => setCategorieEdit(null)} className={petitBouton} style={{ backgroundColor: '#F5F3EE', color: '#666666' }}>Annuler</button>
              </>
            ) : (
              <>
                <span className="flex-1 text-sm font-medium" style={{ color: '#1A2535' }}>{c.nom} <span className="text-xs font-normal" style={{ color: '#999999' }}>({audios.filter(a => a.categorie_id === c.id).length})</span></span>
                <button onClick={() => deplacerCategorie(i, -1)} disabled={i === 0} className={petitBouton} style={{ backgroundColor: '#F5F3EE' }}>↑</button>
                <button onClick={() => deplacerCategorie(i, 1)} disabled={i === categories.length - 1} className={petitBouton} style={{ backgroundColor: '#F5F3EE' }}>↓</button>
                <button onClick={() => setCategorieEdit({ id: c.id, nom: c.nom })} className={petitBouton} style={{ backgroundColor: '#F5F3EE', color: '#1A2535' }}>✏️ Renommer</button>
                <button onClick={() => effacerCategorie(c)} className={petitBouton} style={{ backgroundColor: '#FFEBEE', color: '#E57373' }}>🗑️</button>
              </>
            )}
          </div>
        ))}
        <div className="flex gap-2 pt-2 border-t" style={{ borderColor: '#E0E0E0' }}>
          <input className={inputClass} style={{ borderColor: '#E0E0E0' }} placeholder="Nouvelle catégorie" value={nouvelleCategorie} onChange={e => setNouvelleCategorie(e.target.value)} onKeyDown={e => e.key === 'Enter' && ajouterCategorie()} />
          <button onClick={ajouterCategorie} disabled={!nouvelleCategorie.trim()} className="px-4 py-2 rounded-lg text-sm font-medium text-white disabled:opacity-50 whitespace-nowrap" style={{ backgroundColor: '#C9A84C' }}>+ Ajouter</button>
        </div>
      </div>

      {/* Liste des audios par catégorie */}
      {sections.filter(s => s.audios.length > 0 || s.id).map(section => (
        <div key={section.id || 'autres'} className="bg-white rounded-2xl shadow overflow-hidden">
          <div className="px-5 py-3 flex justify-between items-center" style={{ backgroundColor: '#1A2535' }}>
            <p className="font-bold" style={{ color: '#C9A84C' }}>{section.nom}</p>
            <span className="text-xs" style={{ color: '#E0E0E0' }}>{section.audios.length} audio{section.audios.length !== 1 ? 's' : ''}</span>
          </div>
          {section.audios.length === 0 && <p className="px-5 py-4 text-sm" style={{ color: '#999999' }}>Aucun audio dans cette catégorie.</p>}
          {section.audios.map((a, i) => (
            <div key={a.id} className="px-5 py-4 border-b last:border-b-0 space-y-2" style={{ borderColor: '#E0E0E0', opacity: a.actif ? 1 : 0.6 }}>
              <div className="flex items-start justify-between gap-3 flex-wrap">
                <div>
                  <p className="font-semibold" style={{ color: '#1A2535' }}>
                    {a.titre}
                    {!a.actif && <span className="ml-2 px-2 py-0.5 rounded-full text-xs font-medium" style={{ backgroundColor: '#ECEFF1', color: '#757575' }}>⏸️ Désactivé</span>}
                  </p>
                  {a.description && <p className="text-sm" style={{ color: '#666666' }}>{a.description}</p>}
                  {a.taille ? <p className="text-xs" style={{ color: '#999999' }}>{tailleLisible(a.taille)}</p> : null}
                </div>
                <div className="flex gap-1.5 flex-wrap">
                  <button onClick={() => deplacerAudio(section.audios, i, -1)} disabled={i === 0 || occupe === a.id} className={petitBouton} style={{ backgroundColor: '#F5F3EE' }}>↑</button>
                  <button onClick={() => deplacerAudio(section.audios, i, 1)} disabled={i === section.audios.length - 1 || occupe === a.id} className={petitBouton} style={{ backgroundColor: '#F5F3EE' }}>↓</button>
                  <button onClick={() => setAudioEdit({ ...a })} disabled={occupe === a.id} className={petitBouton} style={{ backgroundColor: '#F5F3EE', color: '#1A2535' }}>✏️ Modifier</button>
                  <button onClick={() => basculerActif(a)} disabled={occupe === a.id} className={petitBouton} style={{ backgroundColor: a.actif ? '#FFF3E0' : '#E8F5E9', color: a.actif ? '#E57373' : '#4CAF7D' }}>{a.actif ? 'Désactiver' : 'Activer'}</button>
                  <button onClick={() => effacerAudio(a)} disabled={occupe === a.id} className={petitBouton} style={{ backgroundColor: '#FFEBEE', color: '#E57373' }}>🗑️ Effacer</button>
                </div>
              </div>
              {a.url && <audio controls controlsList="nodownload" preload="none" className="w-full" src={a.url} />}
            </div>
          ))}
        </div>
      ))}

      {/* Fenêtre de modification */}
      {audioEdit && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg p-6 space-y-3">
            <div className="flex justify-between items-center">
              <h2 className="text-lg font-bold" style={{ color: '#1A2535' }}>Modifier l&apos;audio</h2>
              <button onClick={() => setAudioEdit(null)} className="text-gray-400 hover:text-gray-600 text-xl">✕</button>
            </div>
            <input className={inputClass} style={{ borderColor: '#E0E0E0' }} placeholder="Titre *" value={audioEdit.titre} onChange={e => setAudioEdit({ ...audioEdit, titre: e.target.value })} />
            <textarea className={inputClass} style={{ borderColor: '#E0E0E0' }} rows={3} placeholder="Description" value={audioEdit.description ?? ''} onChange={e => setAudioEdit({ ...audioEdit, description: e.target.value })} />
            <select className={inputClass} style={{ borderColor: '#E0E0E0' }} value={audioEdit.categorie_id ?? ''} onChange={e => setAudioEdit({ ...audioEdit, categorie_id: e.target.value || null })}>
              <option value="">Sans catégorie</option>
              {categories.map(c => <option key={c.id} value={c.id}>{c.nom}</option>)}
            </select>
            <div className="flex justify-end gap-2 pt-2">
              <button onClick={() => setAudioEdit(null)} className="px-4 py-2 rounded-lg text-sm" style={{ backgroundColor: '#F5F3EE', color: '#666666' }}>Annuler</button>
              <button onClick={sauvegarderAudio} disabled={!audioEdit.titre.trim() || occupe === audioEdit.id} className="px-5 py-2 rounded-lg text-sm font-medium text-white disabled:opacity-50" style={{ backgroundColor: '#C9A84C' }}>Sauvegarder</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
