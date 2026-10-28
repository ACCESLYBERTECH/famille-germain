import Navbar from '@/components/Navbar'

// Page affichée au développeur quand il ouvre une page réservée à l'administrateur
// (aucune donnée de la page n'est chargée)
export default function NonAccessibleDeveloppeur({ prenom, titre }: { prenom: string; titre: string }) {
  return (
    <div className="min-h-screen" style={{ backgroundColor: '#F5F3EE' }}>
      <Navbar prenom={prenom} role="developpeur" />
      <div className="max-w-2xl mx-auto px-4 py-16">
        <div className="bg-white rounded-2xl shadow p-10 text-center">
          <p className="text-5xl mb-4">🔒</p>
          <h1 className="text-2xl font-bold mb-2" style={{ color: '#1A2535' }}>{titre}</h1>
          <p className="text-lg font-medium mb-4" style={{ color: '#E57373' }}>Non accessible au développeur</p>
          <p className="text-sm mb-8" style={{ color: '#666666' }}>
            Cette page contient des données confidentielles réservées à l&apos;administrateur.
          </p>
          <a href="/" className="inline-block px-6 py-2.5 rounded-lg font-medium text-sm" style={{ backgroundColor: '#C9A84C', color: '#1A2535' }}>Retour au tableau de bord</a>
        </div>
      </div>
    </div>
  )
}
