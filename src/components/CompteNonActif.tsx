import Navbar from '@/components/Navbar'

// Message affiché quand le compte n'est pas actif (en attente, inactif ou refusé)
export default function CompteNonActif({ prenom, role, statut }: { prenom: string; role: string; statut: string | null | undefined }) {
  let titre = "Compte en attente d'approbation"
  let message = 'Un administrateur va approuver votre compte sous peu. Vous recevrez un courriel de confirmation.'
  let montrerMesBillets = false

  if (statut === 'inactif') {
    titre = 'Votre compte est inactif'
    message = 'Pour le réactiver, communiquez avec votre leader ou avec l\'administrateur. Vos billets déjà achetés restent disponibles.'
    montrerMesBillets = true
  } else if (statut === 'refuse') {
    titre = "Demande d'inscription refusée"
    message = 'Votre demande n\'a pas été approuvée. Pour plus d\'information, communiquez avec l\'administrateur.'
  }

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#F5F3EE' }}>
      <Navbar prenom={prenom} role={role} />
      <div className="max-w-2xl mx-auto pt-20 px-4 text-center">
        <div className="bg-white rounded-2xl shadow p-8">
          <p className="text-lg font-medium mb-2" style={{ color: '#1A2535' }}>{titre}</p>
          <p className="text-sm" style={{ color: '#666666' }}>{message}</p>
          {montrerMesBillets && (
            <a href="/evenements/mes-billets" className="inline-block mt-6 px-6 py-2.5 rounded-lg font-medium text-sm" style={{ backgroundColor: '#C9A84C', color: '#1A2535' }}>🎫 Mes billets</a>
          )}
        </div>
      </div>
    </div>
  )
}
