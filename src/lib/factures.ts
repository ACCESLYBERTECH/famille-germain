// Factures : règles partagées (sans le moteur PDF, pour pouvoir l'utiliser dans les pages)

// Les billets d'un même achat (même paiement Stripe) forment UNE facture.
// Le premier billet (le plus ancien) donne le numéro de facture : BIL-XXXXXXXX
export function regrouperAchats<T extends { id: string; stripe_payment_intent_id: string | null; created_at: string }>(billets: T[]): T[][] {
  const groupes = new Map<string, T[]>()
  for (const b of [...billets].sort((a, c) => a.created_at.localeCompare(c.created_at) || a.id.localeCompare(c.id))) {
    const cle = b.stripe_payment_intent_id ?? `seul-${b.id}`
    if (!groupes.has(cle)) groupes.set(cle, [])
    groupes.get(cle)!.push(b)
  }
  return Array.from(groupes.values())
}
