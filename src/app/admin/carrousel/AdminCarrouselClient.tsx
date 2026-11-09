'use client'

import { useEffect, useState, useRef } from 'react'
import { createClient } from '@/utils/supabase/client'
import { PAGES_DU_SITE, lienEvenement, lireLien, etatAffichage, type TypeLien } from '@/lib/carrousel'

interface CarrouselImage {
  id: string
  url: string
  ordre: number
  lien: string | null
  texte_bouton: string | null
  date_debut: string | null
  date_fin: string | null
  visible: boolean | null
  cree_at: string
}

export interface EvenementChoix {
  id: string
  nom: string
  date_debut: string
}

interface Reglage {
  id: string
  type: TypeLien
  evenementId: string
  page: string
  externe: string
  texteBouton: string
  dateDebut: string
  dateFin: string
}

const TEXTE_PAR_DEFAUT: Record<TypeLien, string> = {
  aucun: '',
  evenement: 'Acheter mon billet',
  page: 'Voir',
  externe: 'En savoir plus',
}

const CHOIX_TYPES: { type: TypeLien; icone: string; titre: string; aide: string }[] = [
  { type: 'aucun', icone: '⛔', titre: 'Aucun lien', aide: "L'image n'est pas cliquable" },
  { type: 'evenement', icone: '🎫', titre: 'Un événement', aide: "Mène à la carte de l'événement, avec le bouton Acheter" },
  { type: 'page', icone: '📄', titre: 'Une page du site', aide: 'Documents, Audios, Contact...' },
  { type: 'externe', icone: '🌐', titre: 'Un site externe', aide: 'Facebook, Zoom... (nouvel onglet)' },
]

const dateLisible = (d: string) => new Date(`${d}T12:00:00`).toLocaleDateString('fr-CA', { day: 'numeric', month: 'long', year: 'numeric' })

export default function AdminCarrouselClient({ evenements }: { evenements: EvenementChoix[] }) {
  const [images, setImages] = useState<CarrouselImage[]>([])
  const [uploading, setUploading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [reglage, setReglage] = useState<Reglage | null>(null)
  const dragItem = useRef<number | null>(null)
  const supabase = createClient()

  useEffect(() => {
    chargerImages()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function chargerImages() {
    const { data, error } = await supabase
      .from('carrousel_images')
      .select('*')
      .order('ordre', { ascending: true })
    if (!error && data) setImages(data)
  }

  async function uploadImage(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      setMessage({ type: 'error', text: 'Format non accepté. Choisissez une image JPG, PNG ou WebP.' })
      e.target.value = ''
      return
    }
    if (file.size > 3 * 1024 * 1024) {
      setMessage({ type: 'error', text: `Image trop lourde (${(file.size / 1024 / 1024).toFixed(1)} Mo). Maximum : 3 Mo.` })
      e.target.value = ''
      return
    }

    setUploading(true)
    setMessage(null)

    const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg'
    const fileName = `${Date.now()}.${ext}`

    const { error: uploadError } = await supabase.storage.from('carrousel').upload(fileName, file, { contentType: file.type })

    if (uploadError) {
      setMessage({ type: 'error', text: `Erreur lors du téléversement : ${uploadError.message}` })
      setUploading(false)
      return
    }

    const { data: urlData } = supabase.storage.from('carrousel').getPublicUrl(fileName)
    const nouvelOrdre = images.length > 0 ? Math.max(...images.map(i => i.ordre)) + 1 : 0

    const { error: insertError } = await supabase
      .from('carrousel_images')
      .insert({ url: urlData.publicUrl, ordre: nouvelOrdre, lien: null })

    if (insertError) {
      setMessage({ type: 'error', text: "Erreur lors de l'enregistrement" })
    } else {
      setMessage({ type: 'success', text: 'Image ajoutée! Cliquez sur ⚙️ Réglages pour la rendre cliquable ou programmer ses dates.' })
      chargerImages()
    }

    setUploading(false)
    e.target.value = ''
  }

  async function supprimerImage(id: string, url: string) {
    if (!confirm('Supprimer définitivement cette image? (Pour la retirer seulement un temps, utilisez plutôt « Cacher ».)')) return

    const fileName = url.split('/').pop()
    if (fileName) await supabase.storage.from('carrousel').remove([fileName])

    const { error } = await supabase.from('carrousel_images').delete().eq('id', id)
    if (!error) {
      setMessage({ type: 'success', text: 'Image supprimée' })
      if (reglage?.id === id) setReglage(null)
      chargerImages()
    }
  }

  async function basculerVisible(img: CarrouselImage) {
    const nouveau = img.visible === false
    const { error } = await supabase.from('carrousel_images').update({ visible: nouveau }).eq('id', img.id)
    if (error) {
      setMessage({ type: 'error', text: 'Erreur lors de la sauvegarde' })
      return
    }
    setMessage({ type: 'success', text: nouveau ? 'Image de nouveau visible' : 'Image cachée (elle reste ici, prête à être remise)' })
    chargerImages()
  }

  function ouvrirReglages(img: CarrouselImage) {
    const { type, valeur } = lireLien(img.lien)
    setReglage({
      id: img.id,
      type,
      evenementId: type === 'evenement' ? valeur : (evenements[0]?.id ?? ''),
      page: type === 'page' ? valeur : PAGES_DU_SITE[0].href,
      externe: type === 'externe' ? valeur : '',
      texteBouton: img.texte_bouton ?? TEXTE_PAR_DEFAUT[type],
      dateDebut: img.date_debut ?? '',
      dateFin: img.date_fin ?? '',
    })
    setMessage(null)
  }

  function changerType(type: TypeLien) {
    if (!reglage) return
    // Le texte du bouton suit le type tant que l'admin ne l'a pas personnalisé
    const texteEstParDefaut = Object.values(TEXTE_PAR_DEFAUT).includes(reglage.texteBouton)
    setReglage({ ...reglage, type, texteBouton: texteEstParDefaut ? TEXTE_PAR_DEFAUT[type] : reglage.texteBouton })
  }

  async function sauvegarderReglages() {
    if (!reglage) return
    let lien: string | null = null
    if (reglage.type === 'evenement') {
      if (!reglage.evenementId) { setMessage({ type: 'error', text: 'Choisissez un événement.' }); return }
      lien = lienEvenement(reglage.evenementId)
    } else if (reglage.type === 'page') {
      lien = reglage.page
    } else if (reglage.type === 'externe') {
      let adresse = reglage.externe.trim()
      if (!adresse) { setMessage({ type: 'error', text: "Collez l'adresse du site externe." }); return }
      if (!/^https?:\/\//i.test(adresse)) adresse = `https://${adresse}`
      try { new URL(adresse) } catch { setMessage({ type: 'error', text: "L'adresse du site externe n'est pas valide." }); return }
      lien = adresse
    }
    if (reglage.dateDebut && reglage.dateFin && reglage.dateFin < reglage.dateDebut) {
      setMessage({ type: 'error', text: 'La date de fin doit être après la date de début.' })
      return
    }

    const { error } = await supabase
      .from('carrousel_images')
      .update({
        lien,
        texte_bouton: lien ? (reglage.texteBouton.trim() || null) : null,
        date_debut: reglage.dateDebut || null,
        date_fin: reglage.dateFin || null,
      })
      .eq('id', reglage.id)

    if (error) {
      setMessage({ type: 'error', text: `Erreur lors de la sauvegarde : ${error.message}` })
      return
    }
    setMessage({ type: 'success', text: 'Réglages sauvegardés!' })
    setReglage(null)
    chargerImages()
  }

  function resumeLien(img: CarrouselImage) {
    const { type, valeur } = lireLien(img.lien)
    if (type === 'aucun') return <span className="text-gray-400">⛔ Non cliquable</span>
    let texte = valeur
    if (type === 'evenement') {
      const ev = evenements.find(e => e.id === valeur)
      texte = ev ? `🎫 ${ev.nom}` : '🎫 Événement terminé ou désactivé (image non cliquable)'
    } else if (type === 'page') {
      texte = `📄 Page ${PAGES_DU_SITE.find(p => p.href === valeur)?.label ?? valeur}`
    } else {
      texte = `🌐 ${valeur}`
    }
    return (
      <span className="font-medium" style={{ color: '#2E86C1' }}>
        {texte}{img.texte_bouton ? <span className="text-gray-500 font-normal"> · bouton « {img.texte_bouton} »</span> : null}
      </span>
    )
  }

  function badgeEtat(img: CarrouselImage) {
    const etat = etatAffichage(img)
    const styles = {
      visible: { bg: '#E8F5E9', fg: '#2E7D32', txt: '● Visible' },
      cache: { bg: '#ECEFF1', fg: '#607D8B', txt: '○ Cachée' },
      programme: { bg: '#E3F2FD', fg: '#1565C0', txt: `⏳ À partir du ${img.date_debut ? dateLisible(img.date_debut) : ''}` },
      expire: { bg: '#FFF3E0', fg: '#E65100', txt: `⌛ Terminée le ${img.date_fin ? dateLisible(img.date_fin) : ''}` },
    }[etat]
    return <span className="text-xs font-medium px-2 py-0.5 rounded-full whitespace-nowrap" style={{ backgroundColor: styles.bg, color: styles.fg }}>{styles.txt}</span>
  }

  function dragStart(index: number) {
    dragItem.current = index
  }

  function dragEnter(index: number) {
    if (dragItem.current === null || dragItem.current === index) return
    const newImages = [...images]
    const dragged = newImages[dragItem.current]
    newImages.splice(dragItem.current, 1)
    newImages.splice(index, 0, dragged)
    dragItem.current = index
    setImages(newImages)
  }

  async function dragEnd() {
    dragItem.current = null
    await sauvegarderOrdre(images)
  }

  // Flèches ↑ ↓ : pratiques sur cellulaire, où le glisser-déposer ne fonctionne pas
  async function deplacer(index: number, direction: -1 | 1) {
    const cible = index + direction
    if (cible < 0 || cible >= images.length) return
    const newImages = [...images]
    ;[newImages[index], newImages[cible]] = [newImages[cible], newImages[index]]
    setImages(newImages)
    await sauvegarderOrdre(newImages)
  }

  async function sauvegarderOrdre(liste: CarrouselImage[]) {
    setSaving(true)
    await Promise.all(liste.map((img, index) =>
      supabase.from('carrousel_images').update({ ordre: index }).eq('id', img.id)
    ))
    setSaving(false)
    setMessage({ type: 'success', text: 'Ordre sauvegardé!' })
  }

  return (
    <div className="px-4 py-6 sm:p-8">
      <div className="max-w-4xl mx-auto">
        <div className="mb-6 sm:mb-8">
          <h1 className="text-2xl sm:text-3xl font-bold mb-1" style={{ color: '#1A2535' }}>Carrousel d&apos;images</h1>
          <p className="text-gray-500 text-sm sm:text-base">Les images affichées sur la page d&apos;accueil des PCI et des leaders</p>
        </div>

        {message && (
          <div className={`mb-6 p-4 rounded-lg text-sm font-medium ${message.type === 'success' ? 'bg-green-50 text-green-800 border border-green-200' : 'bg-red-50 text-red-800 border border-red-200'}`}>
            {message.text}
          </div>
        )}

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 sm:p-6 mb-6 sm:mb-8">
          <h2 className="text-lg font-semibold mb-1" style={{ color: '#1A2535' }}>Ajouter une image</h2>
          <p className="text-sm text-gray-400 mb-4">Format recommandé : <strong>16:9</strong>, au moins 1200 × 675 px</p>
          <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-xl cursor-pointer transition-colors hover:border-yellow-400 hover:bg-yellow-50" style={{ borderColor: '#C9A84C' }}>
            <div className="text-center">
              {uploading ? (
                <p className="text-sm text-gray-500">Téléversement en cours...</p>
              ) : (
                <>
                  <p className="text-sm font-medium" style={{ color: '#C9A84C' }}>🖼️ Choisir une image</p>
                  <p className="text-xs text-gray-400 mt-1">JPG, PNG ou WebP · 3 Mo maximum</p>
                </>
              )}
            </div>
            <input type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={uploadImage} disabled={uploading} />
          </label>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 sm:p-6">
          <div className="flex items-center justify-between gap-3 mb-4">
            <div>
              <h2 className="text-lg font-semibold" style={{ color: '#1A2535' }}>Images ({images.length})</h2>
              <p className="text-sm text-gray-400">Glissez-déposez (ou flèches ↑ ↓) pour changer l&apos;ordre</p>
            </div>
            {saving && <span className="text-sm text-gray-400">Sauvegarde...</span>}
          </div>

          {images.length === 0 ? (
            <p className="text-center text-gray-400 py-12">Aucune image pour l&apos;instant</p>
          ) : (
            <div className="space-y-4">
              {images.map((img, index) => {
                const cachee = img.visible === false
                return (
                  <div
                    key={img.id}
                    draggable
                    onDragStart={() => dragStart(index)}
                    onDragEnter={() => dragEnter(index)}
                    onDragEnd={dragEnd}
                    onDragOver={(e) => e.preventDefault()}
                    className="border border-gray-100 rounded-xl bg-gray-50 overflow-hidden"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4 p-3">
                      <div className="flex items-center gap-3 sm:gap-4">
                        <div className="hidden sm:block text-gray-300 select-none text-lg cursor-grab">⠿</div>
                        <div className="flex flex-col items-center">
                          <button onClick={() => deplacer(index, -1)} disabled={index === 0} className="text-xs text-gray-400 hover:text-gray-700 disabled:opacity-20 leading-none px-1" aria-label="Monter">▲</button>
                          <span className="text-sm font-bold w-6 text-center" style={{ color: '#C9A84C' }}>{index + 1}</span>
                          <button onClick={() => deplacer(index, 1)} disabled={index === images.length - 1} className="text-xs text-gray-400 hover:text-gray-700 disabled:opacity-20 leading-none px-1" aria-label="Descendre">▼</button>
                        </div>
                        <img src={img.url} alt={`Image ${index + 1}`} className="w-28 h-16 object-cover rounded-lg flex-shrink-0" style={{ opacity: cachee ? 0.4 : 1 }} />
                        <div className="sm:hidden">{badgeEtat(img)}</div>
                      </div>
                      <div className="flex-1 min-w-0 text-xs space-y-1">
                        <div className="hidden sm:block">{badgeEtat(img)}</div>
                        <p className="break-words">{resumeLien(img)}</p>
                        {(img.date_debut || img.date_fin) && (
                          <p className="text-gray-500">
                            📅 {img.date_debut ? `Du ${dateLisible(img.date_debut)}` : 'Dès maintenant'}
                            {img.date_fin ? ` au ${dateLisible(img.date_fin)}` : ', sans date de fin'}
                          </p>
                        )}
                      </div>
                      <div className="flex gap-2 flex-wrap sm:flex-shrink-0">
                        <button onClick={() => reglage?.id === img.id ? setReglage(null) : ouvrirReglages(img)} className="text-xs font-medium px-3 py-1.5 rounded-lg transition-colors bg-white border hover:bg-blue-50" style={{ color: '#2E86C1', borderColor: '#D6E6F2' }}>
                          ⚙️ Réglages
                        </button>
                        <button onClick={() => basculerVisible(img)} className="text-xs font-medium px-3 py-1.5 rounded-lg transition-colors bg-white border hover:bg-gray-100" style={{ color: '#607D8B', borderColor: '#E0E0E0' }}>
                          {cachee ? '👁 Remettre' : '🙈 Cacher'}
                        </button>
                        <button onClick={() => supprimerImage(img.id, img.url)} className="text-xs font-medium px-3 py-1.5 rounded-lg hover:bg-red-50 transition-colors" style={{ color: '#E57373' }}>
                          Supprimer
                        </button>
                      </div>
                    </div>

                    {reglage?.id === img.id && (
                      <div className="px-3 sm:px-4 pb-4 pt-3 border-t border-gray-100 bg-white space-y-4">
                        {/* 1. Où mène l'image */}
                        <div>
                          <p className="text-sm font-semibold mb-2" style={{ color: '#1A2535' }}>Quand on clique sur l&apos;image...</p>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            {CHOIX_TYPES.map(c => (
                              <button key={c.type} type="button" onClick={() => changerType(c.type)}
                                className="text-left p-3 rounded-xl border-2 transition-colors"
                                style={{ borderColor: reglage.type === c.type ? '#C9A84C' : '#EEEEEE', backgroundColor: reglage.type === c.type ? '#FBF6E8' : 'white' }}>
                                <p className="text-sm font-medium" style={{ color: '#1A2535' }}>{c.icone} {c.titre}</p>
                                <p className="text-xs text-gray-500 mt-0.5">{c.aide}</p>
                              </button>
                            ))}
                          </div>
                        </div>

                        {reglage.type === 'evenement' && (
                          evenements.length === 0 ? (
                            <p className="text-sm" style={{ color: '#E65100' }}>Aucun événement actif pour l&apos;instant.</p>
                          ) : (
                            <label className="block">
                              <span className="text-xs font-medium text-gray-600">Événement</span>
                              <select className="mt-1 w-full border rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-yellow-400 max-w-full" style={{ borderColor: '#E0E0E0' }}
                                value={reglage.evenementId} onChange={e => setReglage({ ...reglage, evenementId: e.target.value })}>
                                {evenements.map(ev => (
                                  <option key={ev.id} value={ev.id}>{ev.nom} — {new Date(ev.date_debut).toLocaleDateString('fr-CA', { day: 'numeric', month: 'long', year: 'numeric' })}</option>
                                ))}
                              </select>
                              <span className="block text-xs text-gray-400 mt-1">Quand l&apos;événement sera terminé ou désactivé, l&apos;image redeviendra non cliquable toute seule.</span>
                            </label>
                          )
                        )}

                        {reglage.type === 'page' && (
                          <label className="block">
                            <span className="text-xs font-medium text-gray-600">Page</span>
                            <select className="mt-1 w-full border rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-yellow-400" style={{ borderColor: '#E0E0E0' }}
                              value={reglage.page} onChange={e => setReglage({ ...reglage, page: e.target.value })}>
                              {PAGES_DU_SITE.map(p => <option key={p.href} value={p.href}>{p.label}</option>)}
                            </select>
                          </label>
                        )}

                        {reglage.type === 'externe' && (
                          <label className="block">
                            <span className="text-xs font-medium text-gray-600">Adresse du site</span>
                            <input className="mt-1 w-full border rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-yellow-400" style={{ borderColor: '#E0E0E0' }}
                              placeholder="https://www.facebook.com/..." value={reglage.externe} onChange={e => setReglage({ ...reglage, externe: e.target.value })} />
                          </label>
                        )}

                        {reglage.type !== 'aucun' && (
                          <label className="block">
                            <span className="text-xs font-medium text-gray-600">Texte du bouton sur l&apos;image</span>
                            <input className="mt-1 w-full border rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-yellow-400" style={{ borderColor: '#E0E0E0' }}
                              maxLength={40} placeholder="Ex. Acheter mon billet" value={reglage.texteBouton} onChange={e => setReglage({ ...reglage, texteBouton: e.target.value })} />
                            <span className="block text-xs text-gray-400 mt-1">Laissez vide pour seulement un petit « 🔗 » discret.</span>
                          </label>
                        )}

                        {/* 2. Dates d'affichage */}
                        <div>
                          <p className="text-sm font-semibold mb-2" style={{ color: '#1A2535' }}>Afficher l&apos;image <span className="font-normal text-gray-400">(optionnel)</span></p>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            <label className="block">
                              <span className="text-xs font-medium text-gray-600">À partir du</span>
                              <input type="date" className="mt-1 w-full border rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-yellow-400" style={{ borderColor: '#E0E0E0' }}
                                value={reglage.dateDebut} onChange={e => setReglage({ ...reglage, dateDebut: e.target.value })} />
                            </label>
                            <label className="block">
                              <span className="text-xs font-medium text-gray-600">Jusqu&apos;au (inclus)</span>
                              <input type="date" className="mt-1 w-full border rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-yellow-400" style={{ borderColor: '#E0E0E0' }}
                                value={reglage.dateFin} onChange={e => setReglage({ ...reglage, dateFin: e.target.value })} />
                            </label>
                          </div>
                          <p className="text-xs text-gray-400 mt-1">Laissez vide pour l&apos;afficher tout de suite et sans fin. L&apos;image apparaît et disparaît toute seule aux dates choisies.</p>
                        </div>

                        <div className="flex gap-2 flex-wrap">
                          <button onClick={sauvegarderReglages} className="px-4 py-2 rounded-lg text-sm font-medium text-white" style={{ backgroundColor: '#4CAF7D' }}>
                            Sauvegarder
                          </button>
                          <button onClick={() => setReglage(null)} className="px-4 py-2 rounded-lg text-sm font-medium" style={{ color: '#666666', backgroundColor: '#F5F3EE' }}>
                            Annuler
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
