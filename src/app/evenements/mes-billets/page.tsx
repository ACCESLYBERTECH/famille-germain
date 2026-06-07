import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import Navbar from '@/components/Navbar'
import QRCodeComponent from '@/components/QRCode'

export default async function MesBilletsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/connexion')

  const { data: compte } = await supabase
    .from('comptes')
    .select('*')
    .eq('id', user.id)
    .single()

  const maintenant = new Date()

  const { data: billets } = await supabase
    .from('billets')
    .select('*, evenement:evenements(*)')
    .eq('compte_id', user.id)
    .neq('statut', 'rembourse')
    .order('created_at', { ascending: false })

  const billetsFiltres = (billets ?? []).filter(b => {
    if (!b.evenement) return false
    const dateFin = new Date(b.evenement.date_fin)
    dateFin.setDate(dateFin.getDate() + 30)
    return dateFin >= maintenant
  })

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#F5F3EE' }}>
      <Navbar prenom={compte?.prenom_1 ?? ''} role={compte?.role ?? ''} />
      <div className="max-w-3xl mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold mb-6" style={{ color: '#1A2535' }}>Mes billets</h1>

        {billetsFiltres.length === 0 ? (
          <div className="bg-white rounded-2xl shadow p-8 text-center" style={{ color: '#666666' }}>
            Aucun billet actif pour le moment.
          </div>
        ) : (
          <div className="grid gap-4">
            {billetsFiltres.map(billet => (
              <div key={billet.id} className="bg-white rounded-2xl shadow p-6">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <h2 className="text-lg font-bold mb-1" style={{ color: '#1A2535' }}>
                      {billet.evenement?.nom}
                    </h2>
                    <p className="text-sm mb-1" style={{ color: '#666666' }}>
                      {'📅 '}{billet.evenement && new Date(billet.evenement.date_debut).toLocaleDateString('fr-CA', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                    </p>
                    {billet.evenement?.lieu && (
                      <p className="text-sm mb-1" style={{ color: '#666666' }}>{'📍 '}{billet.evenement.lieu}</p>
                    )}
                    <p className="text-sm mb-2" style={{ color: '#666666' }}>
                      Billet pour : <strong>{billet.nom_pci}</strong>
                    </p>
                    <div className="flex gap-2 flex-wrap">
                      {billet.est_sans_frais ? (
                        <span className="px-2 py-0.5 rounded-full text-xs font-medium" style={{ backgroundColor: '#E8F5E9', color: '#4CAF7D' }}>Sans frais</span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-full text-xs font-medium" style={{ backgroundColor: '#F5F3EE', color: '#666666' }}>{billet.prix_paye.toFixed(2)} $</span>
                      )}
                      {billet.statut === 'utilise' && (
                        <span className="px-2 py-0.5 rounded-full text-xs font-medium" style={{ backgroundColor: '#E3F2FD', color: '#2E86C1' }}>Scanné ✓</span>
                      )}
                    </div>
                  </div>

                  <div className="flex-shrink-0 text-center">
                    <QRCodeComponent token={billet.qr_code_token} size={120} />
                    <p className="text-xs mt-1" style={{ color: '#999999' }}>
                      {billet.qr_code_token.slice(0, 8)}...
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}