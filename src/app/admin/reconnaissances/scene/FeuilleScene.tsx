import { cleNumero } from '@/lib/reconnaissances'
import { lieuPersonne, nomsPersonne, type PersonneVirtuel, type RapportReconnaissances } from '@/lib/rapportReconnaissances'
import BoutonImprimer from './BoutonImprimer'

// Feuille de scène : une page par salle, en gros caractères, pour les présentateurs
export default function FeuilleScene({ rapport, salle }: { rapport: RapportReconnaissances; salle?: string }) {
  const { evenement, salles, types, surPlace, virtuel, autres } = rapport
  const sallesAImprimer = salle === 'toutes' || !salle ? salles : salles.filter(s => s.cle === salle)

  // Une personne n'est nommée qu'une fois par reconnaissance (même si deux leaders l'ont inscrite)
  const sansDoublons = (liste: PersonneVirtuel[]) => {
    const vus = new Set<string>()
    return liste.filter(p => {
      const cle = cleNumero(p.numero_amway) || p.id
      if (vus.has(cle)) return false
      vus.add(cle)
      return true
    })
  }

  const dateEvenement = new Date(evenement.date_debut).toLocaleDateString('fr-CA', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
  // Nombre de personnes différentes en virtuel (par numéro de PCI)
  const nbVirtuel = sansDoublons(virtuel).length
  const imprimeLe = new Date().toLocaleString('fr-CA', { timeZone: 'America/Toronto', dateStyle: 'long', timeStyle: 'short' })

  return (
    <div className="fond" style={{ backgroundColor: '#E5E5E5', minHeight: '100vh', fontFamily: 'Helvetica, Arial, sans-serif' }}>
      <style>{`
        @page { size: letter portrait; margin: 0.55in; }
        @media print {
          .barre-impression { display: none !important; }
          .feuille { box-shadow: none !important; margin: 0 !important; padding: 0 !important; width: auto !important; }
          body, .fond { background: white !important; }
        }
        .feuille { page-break-after: always; break-after: page; }
        .feuille:last-child { page-break-after: auto; break-after: auto; }
        .bloc { break-inside: avoid; page-break-inside: avoid; }
      `}</style>

      <div className="barre-impression" style={{ position: 'sticky', top: 0, zIndex: 10, backgroundColor: '#1A2535', color: 'white', padding: '12px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
        <span style={{ fontSize: 15 }}>🏆 Feuille{sallesAImprimer.length > 1 ? 's' : ''} de scène — {evenement.nom}</span>
        <BoutonImprimer />
      </div>

      {sallesAImprimer.map(s => {
        const totalSurPlace = types.reduce((n, t) => n + (surPlace[t.id]?.[s.cle] ?? 0), 0)
        return (
          <div key={s.cle} className="feuille" style={{ width: '8.5in', maxWidth: '100%', margin: '24px auto', backgroundColor: 'white', padding: '0.55in', boxSizing: 'border-box', color: '#111', boxShadow: '0 2px 10px rgba(0,0,0,0.15)' }}>
            {/* En-tête */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', gap: 16, borderBottom: '4px solid #C9A84C', paddingBottom: 10, marginBottom: 6 }}>
              <div>
                <div style={{ fontSize: 13, letterSpacing: '0.12em', color: '#888' }}>RECONNAISSANCES SUR SCÈNE</div>
                <div style={{ fontSize: 28, fontWeight: 'bold', lineHeight: 1.15 }}>{evenement.nom}</div>
                <div style={{ fontSize: 20, color: '#444', marginTop: 2 }}>Salle : <b>{s.nom}</b> · {dateEvenement}</div>
              </div>
              <div style={{ textAlign: 'right', fontSize: 15, color: '#555', whiteSpace: 'nowrap' }}>
                Sur place : <b style={{ fontSize: 24, color: '#111' }}>{totalSurPlace}</b><br />
                Virtuel : <b style={{ fontSize: 24, color: '#111' }}>{nbVirtuel}</b>
              </div>
            </div>

            {/* Une section par reconnaissance, dans l'ordre de la liste */}
            {types.map((t, i) => {
              const nombre = surPlace[t.id]?.[s.cle] ?? 0
              const noms = sansDoublons(virtuel.filter(p => p.type_ids.includes(t.id)))
              const rien = nombre === 0 && noms.length === 0
              return (
                <div key={t.id} className="bloc" style={{ marginTop: rien ? 12 : 20, opacity: rien ? 0.45 : 1 }}>
                  <div style={{ fontSize: rien ? 18 : 24, fontWeight: 'bold', borderBottom: '1px solid #DDD', paddingBottom: 3, display: 'flex', justifyContent: 'space-between', gap: 12 }}>
                    <span>{i + 1}. {t.nom}</span>
                    {rien && <span style={{ fontWeight: 'normal', fontStyle: 'italic', color: '#888' }}>AUCUN</span>}
                  </div>
                  {!rien && (
                    <>
                      <div style={{ fontSize: 21, margin: '8px 0 4px' }}>
                        🏛️ Sur place : {nombre > 0 ? <b>{nombre} personne{nombre > 1 ? 's' : ''}</b> : <b style={{ color: '#AAA' }}>AUCUN</b>}
                      </div>
                      <div style={{ fontSize: 21, margin: '6px 0 2px' }}>💻 En virtuel :{noms.length === 0 && <b style={{ color: '#AAA', fontStyle: 'italic' }}> AUCUN</b>}</div>
                      {noms.map(p => (
                        <div key={p.id} style={{ fontSize: 21, lineHeight: 1.5, marginLeft: 22 }}>
                          • {nomsPersonne(p)} <span style={{ color: '#666', fontSize: 16 }}>— {lieuPersonne(p)}</span>
                        </div>
                      ))}
                    </>
                  )}
                </div>
              )
            })}

            {/* Autres reconnaissances écrites à la main (virtuel) */}
            {autres.length > 0 && (
              <div className="bloc" style={{ marginTop: 20 }}>
                <div style={{ fontSize: 24, fontWeight: 'bold', borderBottom: '1px solid #DDD', paddingBottom: 3 }}>{types.length + 1}. Autres reconnaissances</div>
                {autres.map(p => (
                  <div key={p.id} style={{ fontSize: 21, lineHeight: 1.5, marginLeft: 22, marginTop: 4 }}>
                    • <b>{p.autre}</b> : {nomsPersonne(p)} <span style={{ color: '#666', fontSize: 16 }}>— {lieuPersonne(p)}</span>
                  </div>
                ))}
              </div>
            )}

            <div style={{ marginTop: 28, fontSize: 11, color: '#999', textAlign: 'center' }}>Imprimé le {imprimeLe} · Yager Group – Famille Germain</div>
          </div>
        )
      })}
    </div>
  )
}
