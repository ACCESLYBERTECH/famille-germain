// Règles d'unicité des comptes : courriel et numéro Amway

// Courriel : sans espaces, en minuscules
export function normaliserCourriel(courriel: unknown): string {
  return String(courriel ?? '').trim().toLowerCase()
}

// Numéro Amway : sans espaces ni tirets, en majuscules
export function normaliserNumeroAmway(numero: unknown): string {
  return String(numero ?? '').replace(/[\s-]/g, '').toUpperCase()
}

export function courrielValide(courriel: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(courriel)
}

// Pour une recherche exacte avec ilike (le _ et le % sont des caractères spéciaux)
export function echapperIlike(texte: string): string {
  return texte.replace(/[\\%_]/g, '\\$&')
}

export const MESSAGE_COURRIEL_UTILISE = 'Ce courriel est déjà associé à un compte. Si vous avez oublié votre mot de passe, utilisez « Mot de passe oublié » à la page de connexion.'
export const MESSAGE_AMWAY_UTILISE = 'Ce numéro Amway est déjà inscrit sur la plateforme. Communiquez avec l\'administrateur par la page Contact.'

// Erreurs de Supabase traduites en français
export function messageErreurCompte(message: string | undefined | null): string {
  const m = (message ?? '').toLowerCase()
  if (m.includes('already') && (m.includes('registered') || m.includes('exists'))) return MESSAGE_COURRIEL_UTILISE
  if (m.includes('comptes_numero_amway')) return MESSAGE_AMWAY_UTILISE
  if (m.includes('comptes_courriel')) return MESSAGE_COURRIEL_UTILISE
  if (m.includes('password') && (m.includes('short') || m.includes('least'))) return 'Le mot de passe doit contenir au moins 8 caractères.'
  if (m.includes('invalid') && m.includes('email')) return 'Adresse courriel invalide.'
  return 'Une erreur est survenue lors de la création du compte. Veuillez réessayer ou communiquer avec l\'administrateur.'
}
