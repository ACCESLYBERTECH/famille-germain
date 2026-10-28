// Formatage des allergies alimentaires
//
// Deux formats existent dans la base :
//  - Achat du banquet (sans frais) : ["Gluten", "Lactose"]
//  - Achat de billets payants      : { "Claude": ["Gluten"], "Véronique": ["Noix/arachides"] }
//    (le même objet est copié dans chaque billet de l'achat)
//
// nomPci : si fourni, on affiche seulement les allergies de cette personne
export function formaterAllergies(brut: string | null | undefined, nomPci?: string): string {
  if (!brut || !brut.trim()) return 'Aucune'

  let donnees: unknown
  try {
    donnees = JSON.parse(brut)
  } catch {
    return brut
  }

  if (Array.isArray(donnees)) {
    return donnees.length > 0 ? donnees.join(', ') : 'Aucune'
  }

  if (donnees && typeof donnees === 'object') {
    const parPersonne = donnees as Record<string, string[]>
    if (nomPci) {
      const liste = parPersonne[nomPci]
      return Array.isArray(liste) && liste.length > 0 ? liste.join(', ') : 'Aucune'
    }
    const morceaux = Object.entries(parPersonne)
      .filter(([, liste]) => Array.isArray(liste) && liste.length > 0)
      .map(([nom, liste]) => `${nom} : ${liste.join(', ')}`)
    return morceaux.length > 0 ? morceaux.join(' · ') : 'Aucune'
  }

  return 'Aucune'
}
