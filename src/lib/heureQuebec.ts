// Les dates des événements et des paliers sont entrées en heure du Québec
// et enregistrées telles quelles (ex. « 2027-01-03T00:01 » est gardé comme 00:01 UTC).
// Pour comparer avec « maintenant », il faut donc l'heure actuelle du Québec écrite de la même façon.
export function maintenantQuebec(): Date {
  const morceaux = Object.fromEntries(
    new Intl.DateTimeFormat('en-CA', {
      timeZone: 'America/Toronto',
      year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23',
    }).formatToParts(new Date()).map(p => [p.type, p.value])
  )
  return new Date(`${morceaux.year}-${morceaux.month}-${morceaux.day}T${morceaux.hour}:${morceaux.minute}:${morceaux.second}Z`)
}

// « 2026-11-24T00:01:00+00:00 » → « mardi 24 novembre 2026 à 0 h 01 » (sans décalage d'heure)
export function dateHeureQuebec(dateStr: string): string {
  const [datePart, timePart = ''] = dateStr.split('T')
  const [annee, mois, jour] = datePart.split('-').map(Number)
  const [heure = '0', minute = '00'] = timePart.split(':')
  const date = new Date(annee, mois - 1, jour).toLocaleDateString('fr-CA', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
  return `${date} à ${Number(heure)} h ${minute}`
}
