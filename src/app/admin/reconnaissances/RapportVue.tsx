import { dateLimiteSaisie, saisieOuverte, dateLongue, cleNumero } from '@/lib/reconnaissances'
import { lieuPersonne, nomsPersonne, type RapportReconnaissances } from '@/lib/rapportReconnaissances'

const carte = 'bg-white rounded-2xl shadow-sm border border-gray-100'

export default function RapportVue({ rapport }: { rapport: RapportReconnaissances }) {
  const { evenement, salles, types, surPlace, surPlaceParLeader, virtuel, doublons, autres } = rapport
  const ouverte = saisieOuverte(evenement)
  // Personnes différentes en virtuel (un doublon ne compte qu'une fois)
  const nbVirtuel = new Set(virtuel.map(p => cleNumero(p.numero_amway) || p.id)).size
  const totalSalle = (cle: string) => types.reduce((s, t) => s + (surPlace[t.id]?.[cle] ?? 0), 0)
  const totalType = (id: string) => salles.reduce((s, v) => s + (surPlace[id]?.[v.cle] ?? 0), 0)
  const totalGeneral = salles.reduce((s, v) => s + totalSalle(v.cle), 0)
  const nomSalle = (cle: string) => salles.find(s => s.cle === cle)?.nom ?? cle
  const nomType = (id: string) => types.find(t => t.id === id)?.nom ?? '?'
  const ordreType = (id: string) => types.findIndex(t => t.id === id)

  // Détail par leader
  const leaders = Array.from(new Set(surPlaceParLeader.map(l => l.leader_id)))
    .map(id => ({ id, nom: surPlaceParLeader.find(l => l.leader_id === id)!.leader, lignes: surPlaceParLeader.filter(l => l.leader_id === id) }))
    .sort((a, b) => a.nom.localeCompare(b.nom, 'fr-CA'))

  return (
    <div className="space-y-6 mb-8">
      {/* Résumé */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className={`${carte} p-4 text-center`}>
          <p className="text-2xl font-bold" style={{ color: '#1A2535' }}>{totalGeneral}</p>
          <p className="text-xs text-gray-500">Sur place (toutes les salles)</p>
        </div>
        <div className={`${carte} p-4 text-center`}>
          <p className="text-2xl font-bold" style={{ color: '#2E86C1' }}>{nbVirtuel}</p>
          <p className="text-xs text-gray-500">Noms en virtuel</p>
        </div>
        <div className={`${carte} p-4 text-center`}>
          <p className="text-2xl font-bold" style={{ color: '#C9A84C' }}>{new Set([...surPlaceParLeader.map(l => l.leader_id), ...virtuel.map(v => v.leader_id)]).size}</p>
          <p className="text-xs text-gray-500">Leaders participants</p>
        </div>
        <div className={`${carte} p-4 text-center`}>
          <p className="text-sm font-bold" style={{ color: ouverte ? '#2E7D32' : '#607D8B' }}>{ouverte ? '✏️ Ouvert' : '🔒 Verrouillé'}</p>
          <p className="text-xs text-gray-500">{ouverte ? 'jusqu’au' : 'depuis le'} {dateLongue(dateLimiteSaisie(evenement))}</p>
        </div>
      </div>

      {/* Feuilles de scène */}
      <div className={`${carte} p-4 sm:p-6`}>
        <h2 className="text-lg font-semibold" style={{ color: '#1A2535' }}>🖨️ Feuilles de scène</h2>
        <p className="text-sm text-gray-500 mb-3">
          Une feuille par salle, en gros caractères, pour les présentateurs. S&apos;ouvre dans un nouvel onglet : bouton « Imprimer » (ou « Enregistrer en PDF »).
          {ouverte && <strong style={{ color: '#E65100' }}> Attention : les leaders peuvent encore modifier leurs entrées jusqu&apos;à la date limite.</strong>}
        </p>
        <div className="flex flex-wrap gap-2">
          {salles.map(s => (
            <a key={s.cle} href={`/admin/reconnaissances/scene?evenement=${evenement.id}&salle=${s.cle}`} target="_blank" rel="noopener noreferrer"
              className="px-4 py-2 rounded-lg text-sm font-medium text-white" style={{ backgroundColor: '#1A2535' }}>
              {s.nom} ({totalSalle(s.cle)} sur place)
            </a>
          ))}
          {salles.length > 1 && (
            <a href={`/admin/reconnaissances/scene?evenement=${evenement.id}&salle=toutes`} target="_blank" rel="noopener noreferrer"
              className="px-4 py-2 rounded-lg text-sm font-medium" style={{ backgroundColor: '#C9A84C', color: '#1A2535' }}>
              Toutes les salles
            </a>
          )}
        </div>
      </div>

      {/* Doublons entre organisations */}
      {doublons.length > 0 && (
        <div className="rounded-2xl p-4 sm:p-5" style={{ backgroundColor: '#FFF3E0', border: '1px solid #FFCC80' }}>
          <p className="font-semibold mb-2" style={{ color: '#E65100' }}>⚠️ {doublons.length} personne{doublons.length > 1 ? 's inscrites' : ' inscrite'} plus d&apos;une fois (même numéro de PCI)</p>
          {doublons.map(d => (
            <div key={d.numero} className="text-sm mb-1" style={{ color: '#5D4037' }}>
              <strong>#{d.numero}</strong> — {d.personnes.map(p => `${nomsPersonne(p)} (par ${p.leader})`).join(' · ')}
            </div>
          ))}
          <p className="text-xs mt-2" style={{ color: '#8D6E63' }}>Sur la feuille de scène, la personne n&apos;apparaît qu&apos;une fois par reconnaissance. Vérifiez avec les leaders concernés.</p>
        </div>
      )}

      {/* Sur place : total par ville et par reconnaissance */}
      <div className={`${carte} overflow-hidden`}>
        <div className="p-4 sm:p-6 pb-3">
          <h2 className="text-lg font-semibold" style={{ color: '#1A2535' }}>🏛️ Sur place — total par salle</h2>
          <p className="text-sm text-gray-500">Tous les leaders additionnés.</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr style={{ backgroundColor: '#F5F3EE' }}>
                <th className="text-left px-4 py-2 font-semibold" style={{ color: '#1A2535' }}>Reconnaissance</th>
                {salles.map(s => <th key={s.cle} className="text-right px-4 py-2 font-semibold whitespace-nowrap" style={{ color: '#1A2535' }}>{s.nom}</th>)}
                {salles.length > 1 && <th className="text-right px-4 py-2 font-semibold" style={{ color: '#1A2535' }}>Total</th>}
              </tr>
            </thead>
            <tbody>
              {types.map(t => (
                <tr key={t.id} className="border-t" style={{ borderColor: '#F0F0F0' }}>
                  <td className="px-4 py-2" style={{ color: t.actif ? '#1A2535' : '#999999' }}>{t.nom}{!t.actif && ' (désactivée)'}</td>
                  {salles.map(s => {
                    const n = surPlace[t.id]?.[s.cle] ?? 0
                    return <td key={s.cle} className="text-right px-4 py-2 tabular-nums" style={{ color: n ? '#1A2535' : '#CCCCCC', fontWeight: n ? 600 : 400 }}>{n || '—'}</td>
                  })}
                  {salles.length > 1 && <td className="text-right px-4 py-2 tabular-nums font-semibold">{totalType(t.id) || '—'}</td>}
                </tr>
              ))}
              <tr className="border-t-2" style={{ borderColor: '#C9A84C', backgroundColor: '#FBF6E8' }}>
                <td className="px-4 py-2 font-bold">Total</td>
                {salles.map(s => <td key={s.cle} className="text-right px-4 py-2 font-bold tabular-nums">{totalSalle(s.cle)}</td>)}
                {salles.length > 1 && <td className="text-right px-4 py-2 font-bold tabular-nums">{totalGeneral}</td>}
              </tr>
            </tbody>
          </table>
        </div>
        {leaders.length > 0 && (
          <details className="border-t" style={{ borderColor: '#F0F0F0' }}>
            <summary className="px-4 sm:px-6 py-3 text-sm font-medium cursor-pointer" style={{ color: '#2E86C1' }}>Détail par leader ({leaders.length})</summary>
            <div className="px-4 sm:px-6 pb-4 space-y-2">
              {leaders.map(l => (
                <div key={l.id} className="rounded-lg p-3 text-sm" style={{ backgroundColor: '#F5F3EE' }}>
                  <p className="font-medium" style={{ color: '#1A2535' }}>{l.nom} — {l.lignes.reduce((s, x) => s + x.nombre, 0)} personne(s)</p>
                  {salles.map(s => {
                    const lignes = l.lignes.filter(x => x.salle === s.cle).sort((a, b) => ordreType(a.type_id) - ordreType(b.type_id))
                    if (lignes.length === 0) return null
                    return <p key={s.cle} className="text-xs mt-1" style={{ color: '#666666' }}>{salles.length > 1 && <strong>{nomSalle(s.cle)} : </strong>}{lignes.map(x => `${nomType(x.type_id)} ${x.nombre}`).join(' · ')}</p>
                  })}
                </div>
              ))}
            </div>
          </details>
        )}
      </div>

      {/* Virtuel */}
      <div className={`${carte} p-4 sm:p-6`}>
        <h2 className="text-lg font-semibold" style={{ color: '#1A2535' }}>💻 Virtuel — {nbVirtuel} personne{nbVirtuel > 1 ? 's' : ''}</h2>
        <p className="text-sm text-gray-500 mb-4">Nommés sur la scène dans toutes les salles.</p>
        {virtuel.length === 0 ? (
          <p className="text-sm text-gray-400">Aucune personne en virtuel.</p>
        ) : (
          <div className="space-y-4">
            {types.map(t => {
              const liste = virtuel.filter(p => p.type_ids.includes(t.id))
              if (liste.length === 0) return null
              return (
                <div key={t.id}>
                  <p className="text-sm font-bold mb-1" style={{ color: '#C9A84C' }}>{t.nom} ({liste.length})</p>
                  {liste.map(p => (
                    <p key={p.id} className="text-sm py-1 border-b" style={{ borderColor: '#F5F5F5', color: '#1A2535' }}>
                      <strong>{nomsPersonne(p)}</strong>
                      <span style={{ color: '#666666' }}> — {lieuPersonne(p)}{p.numero_amway ? ` · #${p.numero_amway}` : ''} · {p.leader}</span>
                    </p>
                  ))}
                </div>
              )
            })}
            {autres.length > 0 && (
              <div>
                <p className="text-sm font-bold mb-1" style={{ color: '#C9A84C' }}>Autre ({autres.length})</p>
                {autres.map(p => (
                  <p key={p.id} className="text-sm py-1 border-b" style={{ borderColor: '#F5F5F5', color: '#1A2535' }}>
                    <strong>{nomsPersonne(p)}</strong> : {p.autre}
                    <span style={{ color: '#666666' }}> — {lieuPersonne(p)} · {p.leader}</span>
                  </p>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
