// Règles d'accès centralisées
//
// admin       : accès complet à tout
// developpeur : accès complet aux pages Gestion PCI, Gestion événements,
//               Portiers, Documents, Carrousel, Marketing et Scanner.
//               Tableau de bord visible avec les chiffres masqués.
//               AUCUN accès à Gestion des billets, Rapport banquets,
//               Platines et plus, exports, remboursements, billets offerts.

export function estAdmin(role: string | null | undefined): boolean {
  return role === 'admin'
}

export function estDeveloppeur(role: string | null | undefined): boolean {
  return role === 'developpeur'
}

// Pages et routes partagées entre l'admin et le développeur
export function estAdminOuDeveloppeur(role: string | null | undefined): boolean {
  return role === 'admin' || role === 'developpeur'
}

// Scanner : portier, admin et développeur
export function peutScanner(role: string | null | undefined): boolean {
  return role === 'portier' || role === 'admin' || role === 'developpeur'
}
