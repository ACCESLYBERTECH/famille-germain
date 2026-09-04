export default function MerciPage() {
  return (
    <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#F5F3EE' }}>
      <div className="bg-white rounded-2xl shadow-lg p-8 w-full max-w-md text-center">

        <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4" style={{ backgroundColor: '#4CAF7D' }}>
          <span className="text-white text-3xl">✓</span>
        </div>

        <h1 className="text-2xl font-bold mb-2" style={{ color: '#1A2535' }}>
          Demande envoyée !
        </h1>

        <p className="text-sm mb-6" style={{ color: '#666666' }}>
          Votre demande d'inscription a été reçue. Un administrateur va examiner votre dossier et vous enverrez un courriel de confirmation sous peu.
        </p>

        <a href="/connexion" className="inline-block px-6 py-3 rounded-lg text-white font-medium text-sm" style={{ backgroundColor: '#C9A84C' }}>
          Retour à la connexion
        </a>

      </div>
    </div>
  )
}