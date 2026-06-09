'use client'

import { useEffect, useState, useRef } from 'react'
import { createClient } from '@/utils/supabase/client'

interface CarrouselImage {
  id: string
  url: string
  ordre: number
  lien: string | null
  cree_at: string
}

export default function AdminCarrousel() {
  const [images, setImages] = useState<CarrouselImage[]>([])
  const [uploading, setUploading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [editLien, setEditLien] = useState<{ id: string; lien: string } | null>(null)
  const dragItem = useRef<number | null>(null)
  const dragOver = useRef<number | null>(null)
  const supabase = createClient()

  useEffect(() => {
    chargerImages()
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

    if (file.size > 3 * 1024 * 1024) {
      setMessage({ type: 'error', text: 'Fichier trop volumineux (max 3MB)' })
      return
    }

    setUploading(true)
    setMessage(null)

    const ext = file.name.split('.').pop()
    const fileName = `${Date.now()}.${ext}`

    const { error: uploadError } = await supabase.storage
      .from('carrousel')
      .upload(fileName, file)

    if (uploadError) {
      setMessage({ type: 'error', text: 'Erreur lors du téléversement' })
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
      setMessage({ type: 'success', text: 'Image ajoutée avec succès!' })
      chargerImages()
    }

    setUploading(false)
    e.target.value = ''
  }

  async function supprimerImage(id: string, url: string) {
    if (!confirm('Supprimer cette image?')) return

    const fileName = url.split('/').pop()
    if (fileName) {
      await supabase.storage.from('carrousel').remove([fileName])
    }

    const { error } = await supabase.from('carrousel_images').delete().eq('id', id)
    if (!error) {
      setMessage({ type: 'success', text: 'Image supprimée' })
      chargerImages()
    }
  }

  async function sauvegarderLien(id: string, lien: string) {
    const { error } = await supabase
      .from('carrousel_images')
      .update({ lien: lien.trim() || null })
      .eq('id', id)

    if (!error) {
      setMessage({ type: 'success', text: 'Lien sauvegardé!' })
      setEditLien(null)
      chargerImages()
    }
  }

  function dragStart(index: number) {
    dragItem.current = index
  }

  function dragEnter(index: number) {
    dragOver.current = index
    const newImages = [...images]
    const dragged = newImages[dragItem.current!]
    newImages.splice(dragItem.current!, 1)
    newImages.splice(index, 0, dragged)
    dragItem.current = index
    setImages(newImages)
  }

  async function dragEnd() {
    dragItem.current = null
    dragOver.current = null
    await sauvegarderOrdre()
  }

  async function sauvegarderOrdre() {
    setSaving(true)
    const updates = images.map((img, index) =>
      supabase.from('carrousel_images').update({ ordre: index }).eq('id', img.id)
    )
    await Promise.all(updates)
    setSaving(false)
    setMessage({ type: 'success', text: 'Ordre sauvegardé!' })
  }

  return (
    <div className="p-8">
      <div className="max-w-4xl mx-auto">

        {/* En-tête */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-1" style={{ color: '#1A2535' }}>
            Carrousel d'images
          </h1>
          <p className="text-gray-500">Gérez les images affichées sur la page d'accueil des PCIs et leaders</p>
        </div>

        {/* Message */}
        {message && (
          <div className={`mb-6 p-4 rounded-lg text-sm font-medium ${
            message.type === 'success'
              ? 'bg-green-50 text-green-800 border border-green-200'
              : 'bg-red-50 text-red-800 border border-red-200'
          }`}>
            {message.text}
          </div>
        )}

        {/* Zone upload */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 mb-8">
          <h2 className="text-lg font-semibold mb-1" style={{ color: '#1A2535' }}>
            Ajouter une image
          </h2>
          <p className="text-sm text-gray-400 mb-4">
            Format recommandé : <strong>16:9</strong>, min 1200×675px, JPG, max 3MB
          </p>
          <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-xl cursor-pointer transition-colors hover:border-yellow-400 hover:bg-yellow-50" style={{ borderColor: '#C9A84C' }}>
            <div className="text-center">
              {uploading ? (
                <p className="text-sm text-gray-500">Téléversement en cours...</p>
              ) : (
                <>
                  <p className="text-sm font-medium" style={{ color: '#C9A84C' }}>Cliquer pour sélectionner une image</p>
                  <p className="text-xs text-gray-400 mt-1">JPG, PNG — max 3MB</p>
                </>
              )}
            </div>
            <input type="file" accept="image/*" className="hidden" onChange={uploadImage} disabled={uploading} />
          </label>
        </div>

        {/* Liste images */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-lg font-semibold" style={{ color: '#1A2535' }}>
                Images ({images.length})
              </h2>
              <p className="text-sm text-gray-400">Glissez-déposez pour changer l'ordre · Ajoutez un lien optionnel sur chaque image</p>
            </div>
            {saving && <span className="text-sm text-gray-400">Sauvegarde...</span>}
          </div>

          {images.length === 0 ? (
            <p className="text-center text-gray-400 py-12">Aucune image pour l'instant</p>
          ) : (
            <div className="space-y-4">
              {images.map((img, index) => (
                <div
                  key={img.id}
                  draggable
                  onDragStart={() => dragStart(index)}
                  onDragEnter={() => dragEnter(index)}
                  onDragEnd={dragEnd}
                  onDragOver={(e) => e.preventDefault()}
                  className="border border-gray-100 rounded-xl bg-gray-50 overflow-hidden"
                >
                  <div className="flex items-center gap-4 p-3">
                    <div className="text-gray-300 select-none text-lg cursor-grab">⠿</div>
                    <span className="text-sm font-bold w-6 text-center" style={{ color: '#C9A84C' }}>{index + 1}</span>
                    <img src={img.url} alt={`Image ${index + 1}`} className="w-24 h-14 object-cover rounded-lg flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-gray-400 truncate">{img.url}</p>
                      {img.lien ? (
                        <p className="text-xs mt-1 truncate font-medium" style={{ color: '#2E86C1' }}>
                          🔗 {img.lien}
                        </p>
                      ) : (
                        <p className="text-xs mt-1 text-gray-300">Aucun lien</p>
                      )}
                    </div>
                    <div className="flex gap-2 flex-shrink-0">
                      <button
                        onClick={() => setEditLien({ id: img.id, lien: img.lien ?? '' })}
                        className="text-xs font-medium px-3 py-1 rounded-lg hover:bg-blue-50 transition-colors"
                        style={{ color: '#2E86C1' }}
                      >
                        🔗 Lien
                      </button>
                      <button
                        onClick={() => supprimerImage(img.id, img.url)}
                        className="text-xs font-medium px-3 py-1 rounded-lg hover:bg-red-50 transition-colors"
                        style={{ color: '#E57373' }}
                      >
                        Supprimer
                      </button>
                    </div>
                  </div>

                  {editLien?.id === img.id && (
                    <div className="px-4 pb-4 pt-1 border-t border-gray-100">
                      <p className="text-xs font-medium mb-2" style={{ color: '#1A2535' }}>
                        Lien au clic — interne (ex: <code>/evenements</code>) ou externe (ex: <code>https://...</code>)
                      </p>
                      <div className="flex gap-2">
                        <input
                          className="flex-1 border rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-yellow-400"
                          style={{ borderColor: '#E0E0E0' }}
                          placeholder="Laisser vide pour aucun lien"
                          value={editLien.lien}
                          onChange={e => setEditLien({ id: img.id, lien: e.target.value })}
                          onKeyDown={e => e.key === 'Enter' && sauvegarderLien(img.id, editLien.lien)}
                        />
                        <button
                          onClick={() => sauvegarderLien(img.id, editLien.lien)}
                          className="px-4 py-2 rounded-lg text-sm font-medium text-white"
                          style={{ backgroundColor: '#4CAF7D' }}
                        >
                          Sauvegarder
                        </button>
                        <button
                          onClick={() => setEditLien(null)}
                          className="px-4 py-2 rounded-lg text-sm font-medium"
                          style={{ color: '#666666', backgroundColor: '#F5F3EE' }}
                        >
                          Annuler
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

      </div>
    </div>
  )
}