import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import Navbar from '@/components/Navbar'

export default async function DocumentsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/connexion')

  const { data: compte } = await supabase
    .from('comptes')
    .select('*')
    .eq('id', user.id)
    .single()

  if (!compte || compte.statut !== 'actif') redirect('/')

  const { data: documents } = await supabase
    .from('documents')
    .select('*')
    .eq('actif', true)
    .order('section', { ascending: true })
    .order('ordre', { ascending: true })

  const docsPci = (documents ?? []).filter(d => d.section === 'pci')
  const docsPlatine = (documents ?? []).filter(d => d.section === 'platine')

  const icone = (type: string) => type === 'pdf' ? '📄' : type === 'youtube' ? '🎥' : '🔗'
  const labelBouton = (type: string) => type === 'pdf' ? 'Ouvrir le PDF' : type === 'youtube' ? 'Voir la vidéo' : 'Ouvrir le lien'

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#F5F3EE' }}>
      <Navbar prenom={compte.prenom_1} role={compte.role} />
      <div className="max-w-4xl mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold mb-6" style={{ color: '#1A2535' }}>Documents</h1>

        {/* Section PCI */}
        <div className="mb-8">
          <h2 className="text-lg font-semibold mb-4" style={{ color: '#1A2535' }}>Documents PCI</h2>
          {docsPci.length === 0 ? (
            <div className="bg-white rounded-2xl shadow p-8 text-center" style={{ color: '#666666' }}>
              Aucun document disponible pour le moment.
            </div>
          ) : (
            <div className="grid gap-3">
              {docsPci.map(doc => (
                <div key={doc.id} className="bg-white rounded-2xl shadow p-4 flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{icone(doc.type)}</span>
                    <p className="font-medium" style={{ color: '#1A2535' }}>{doc.titre}</p>
                  </div>
                  <a href={doc.url} target="_blank" rel="noopener noreferrer" className="px-4 py-2 rounded-lg text-white text-sm font-medium flex-shrink-0" style={{ backgroundColor: '#C9A84C' }}>
                    {labelBouton(doc.type)}
                  </a>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Section Platine */}
        {(compte.role === 'leader' || compte.role === 'admin') && (
          <div>
            <h2 className="text-lg font-semibold mb-4" style={{ color: '#1A2535' }}>Documents Platine+</h2>
            {docsPlatine.length === 0 ? (
              <div className="bg-white rounded-2xl shadow p-8 text-center" style={{ color: '#666666' }}>
                Aucun document disponible pour le moment.
              </div>
            ) : (
              <div className="grid gap-3">
                {docsPlatine.map(doc => (
                  <div key={doc.id} className="bg-white rounded-2xl shadow p-4 flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">{icone(doc.type)}</span>
                      <p className="font-medium" style={{ color: '#1A2535' }}>{doc.titre}</p>
                    </div>
                    <a href={doc.url} target="_blank" rel="noopener noreferrer" className="px-4 py-2 rounded-lg text-white text-sm font-medium flex-shrink-0" style={{ backgroundColor: '#2E86C1' }}>
                      {labelBouton(doc.type)}
                    </a>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

      </div>
    </div>
  )
}