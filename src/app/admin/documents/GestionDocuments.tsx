'use client'

import { useState } from 'react'
import { createClient } from '@/utils/supabase/client'
import { useRouter } from 'next/navigation'

interface Document {
  id: string
  titre: string
  type: 'pdf' | 'lien' | 'youtube'
  url: string
  section: 'pci' | 'platine'
  ordre: number
  actif: boolean
}

interface Props {
  documents: Document[]
}

const documentVide = { titre: '', type: 'pdf' as 'pdf' | 'lien' | 'youtube', url: '', section: 'pci' as 'pci' | 'platine', ordre: 0, actif: true }

export default function GestionDocuments({ documents }: Props) {
  const [afficherFormulaire, setAfficherFormulaire] = useState(false)
  const [form, setForm] = useState(documentVide)
  const [docModifier, setDocModifier] = useState<Document | null>(null)
  const [chargement, setChargement] = useState(false)
  const [uploading, setUploading] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  function update(champ: string, valeur: string | boolean | number) {
    setForm(f => ({ ...f, [champ]: valeur }))
  }

  function ouvrirNouveauDoc() {
    setDocModifier(null)
    setForm(documentVide)
    setAfficherFormulaire(true)
  }

  function ouvrirModifier(doc: Document) {
    setDocModifier(doc)
    setForm({ titre: doc.titre, type: doc.type, url: doc.url, section: doc.section, ordre: doc.ordre, actif: doc.actif })
    setAfficherFormulaire(true)
  }

  async function handleUploadPDF(e: React.ChangeEvent<HTMLInputElement>) {
    const fichier = e.target.files?.[0]
    if (!fichier) return
    setUploading(true)
    const nomFichier = Date.now() + '-' + fichier.name.replace(/\s/g, '-')
    const { data } = await supabase.storage.from('documents').upload(nomFichier, fichier)
    if (data) {
      const { data: urlData } = supabase.storage.from('documents').getPublicUrl(nomFichier)
      update('url', urlData.publicUrl)
    }
    setUploading(false)
  }

  async function sauvegarder() {
    if (!form.titre || !form.url) return
    setChargement(true)

    if (docModifier) {
      await supabase.from('documents').update(form).eq('id', docModifier.id)
    } else {
      await supabase.from('documents').insert(form)
    }

    setChargement(false)
    setAfficherFormulaire(false)
    router.refresh()
  }

  async function toggleActif(doc: Document) {
    await supabase.from('documents').update({ actif: !doc.actif }).eq('id', doc.id)
    router.refresh()
  }

  async function supprimer(id: string) {
    if (!confirm('Supprimer ce document ?')) return
    await supabase.from('documents').delete().eq('id', id)
    router.refresh()
  }

  const docsPci = documents.filter(d => d.section === 'pci')
  const docsPlatine = documents.filter(d => d.section === 'platine')
  const icone = (type: string) => type === 'pdf' ? '📄' : type === 'youtube' ? '🎥' : '🔗'
  const inputClass = "w-full border rounded-lg px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-yellow-400"

  return (
    <div>
      <div className="flex justify-end mb-4">
        <button onClick={ouvrirNouveauDoc} className="px-5 py-2.5 rounded-lg text-white font-medium text-sm" style={{ backgroundColor: '#C9A84C' }}>
          + Nouveau document
        </button>
      </div>

      {/* Formulaire */}
      {afficherFormulaire && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold" style={{ color: '#1A2535' }}>
                {docModifier ? 'Modifier' : 'Nouveau document'}
              </h2>
              <button onClick={() => setAfficherFormulaire(false)} className="text-gray-400 text-2xl">×</button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1" style={{ color: '#1A2535' }}>Titre *</label>
                <input className={inputClass} style={{ borderColor: '#E0E0E0' }} value={form.titre} onChange={e => update('titre', e.target.value)} />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1" style={{ color: '#1A2535' }}>Type</label>
                  <select className={inputClass} style={{ borderColor: '#E0E0E0' }} value={form.type} onChange={e => update('type', e.target.value)}>
                    <option value="pdf">📄 PDF</option>
                    <option value="lien">🔗 Lien externe</option>
                    <option value="youtube">🎥 Vidéo YouTube</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1" style={{ color: '#1A2535' }}>Section</label>
                  <select className={inputClass} style={{ borderColor: '#E0E0E0' }} value={form.section} onChange={e => update('section', e.target.value)}>
                    <option value="pci">PCI (tous)</option>
                    <option value="platine">Platine+ seulement</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1" style={{ color: '#1A2535' }}>
                  {form.type === 'pdf' ? 'Fichier PDF ou URL' : 'URL *'}
                </label>
                {form.type === 'pdf' && (
                  <div className="mb-2">
                    <input
                      type="file"
                      accept=".pdf"
                      className="w-full text-sm border rounded-lg px-4 py-2.5 cursor-pointer"
                      style={{ borderColor: '#E0E0E0' }}
                      onChange={handleUploadPDF}
                    />
                    {uploading && <p className="text-xs mt-1" style={{ color: '#C9A84C' }}>Upload en cours...</p>}
                    {form.url && !uploading && <p className="text-xs mt-1" style={{ color: '#4CAF7D' }}>✓ Fichier uploadé</p>}
                    <p className="text-xs mt-1" style={{ color: '#666666' }}>Ou entrez une URL directement ci-dessous</p>
                  </div>
                )}
                <input className={inputClass} style={{ borderColor: '#E0E0E0' }} placeholder="https://..." value={form.url} onChange={e => update('url', e.target.value)} />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1" style={{ color: '#1A2535' }}>Ordre d'affichage</label>
                <input type="number" className={inputClass} style={{ borderColor: '#E0E0E0' }} value={form.ordre} onChange={e => update('ordre', parseInt(e.target.value))} />
              </div>
            </div>

            <div className="flex justify-between mt-6">
              <button onClick={() => setAfficherFormulaire(false)} className="px-4 py-2 rounded-lg text-sm" style={{ color: '#666666', backgroundColor: '#F5F3EE' }}>Annuler</button>
              <button onClick={sauvegarder} disabled={chargement || uploading} className="px-6 py-2 rounded-lg text-sm font-medium text-white disabled:opacity-50" style={{ backgroundColor: '#C9A84C' }}>
                {chargement ? 'Sauvegarde...' : docModifier ? 'Sauvegarder' : 'Créer'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Section PCI */}
      <div className="mb-6">
        <h2 className="font-semibold mb-3" style={{ color: '#1A2535' }}>Documents PCI ({docsPci.length})</h2>
        <div className="bg-white rounded-2xl shadow">
          {docsPci.length === 0 ? (
            <div className="p-6 text-center text-sm" style={{ color: '#666666' }}>Aucun document PCI</div>
          ) : docsPci.map(doc => (
            <div key={doc.id} className="p-4 border-b flex items-center justify-between gap-4" style={{ borderColor: '#E0E0E0' }}>
              <div className="flex items-center gap-3">
                <span className="text-xl">{icone(doc.type)}</span>
                <div>
                  <p className="font-medium text-sm" style={{ color: doc.actif ? '#1A2535' : '#999999' }}>{doc.titre}</p>
                  <p className="text-xs" style={{ color: '#999999' }}>{doc.url.slice(0, 50)}...</p>
                </div>
              </div>
              <div className="flex gap-2">
                <button onClick={() => ouvrirModifier(doc)} className="px-3 py-1.5 rounded-lg text-xs font-medium" style={{ backgroundColor: '#F5F3EE', color: '#1A2535' }}>Modifier</button>
                <button onClick={() => toggleActif(doc)} className="px-3 py-1.5 rounded-lg text-xs font-medium text-white" style={{ backgroundColor: doc.actif ? '#FF9800' : '#4CAF7D' }}>
                  {doc.actif ? 'Désactiver' : 'Activer'}
                </button>
                <button onClick={() => supprimer(doc.id)} className="px-3 py-1.5 rounded-lg text-xs font-medium text-white" style={{ backgroundColor: '#E57373' }}>Supprimer</button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Section Platine */}
      <div>
        <h2 className="font-semibold mb-3" style={{ color: '#1A2535' }}>Documents Platine+ ({docsPlatine.length})</h2>
        <div className="bg-white rounded-2xl shadow">
          {docsPlatine.length === 0 ? (
            <div className="p-6 text-center text-sm" style={{ color: '#666666' }}>Aucun document Platine+</div>
          ) : docsPlatine.map(doc => (
            <div key={doc.id} className="p-4 border-b flex items-center justify-between gap-4" style={{ borderColor: '#E0E0E0' }}>
              <div className="flex items-center gap-3">
                <span className="text-xl">{icone(doc.type)}</span>
                <div>
                  <p className="font-medium text-sm" style={{ color: doc.actif ? '#1A2535' : '#999999' }}>{doc.titre}</p>
                  <p className="text-xs" style={{ color: '#999999' }}>{doc.url.slice(0, 50)}...</p>
                </div>
              </div>
              <div className="flex gap-2">
                <button onClick={() => ouvrirModifier(doc)} className="px-3 py-1.5 rounded-lg text-xs font-medium" style={{ backgroundColor: '#F5F3EE', color: '#1A2535' }}>Modifier</button>
                <button onClick={() => toggleActif(doc)} className="px-3 py-1.5 rounded-lg text-xs font-medium text-white" style={{ backgroundColor: doc.actif ? '#FF9800' : '#4CAF7D' }}>
                  {doc.actif ? 'Désactiver' : 'Activer'}
                </button>
                <button onClick={() => supprimer(doc.id)} className="px-3 py-1.5 rounded-lg text-xs font-medium text-white" style={{ backgroundColor: '#E57373' }}>Supprimer</button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}