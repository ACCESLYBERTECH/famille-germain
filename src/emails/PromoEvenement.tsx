import { Text, Section, Row, Column } from '@react-email/components'
import * as React from 'react'
import Gabarit, { Paragraphe, Bouton, Separateur, Note } from './Gabarit'

interface Palier {
  prix: number
  date_fin: string
  ordre: number
}

interface PromoEvenementProps {
  prenom: string
  nomEvenement: string
  description: string
  dateDebut: string
  dateFin: string
  lieu: string
  villes: string[]
  acces: 'public' | 'platine'
  aBillets: boolean
  aBanquet: boolean
  banquetNom?: string | null
  banquetPrix?: number | null
  paliers: Palier[]
  imageUrl?: string
  lienAchat: string
  appUrl: string
}

function formatDateLongue(dateStr: string): string {
  const [datePart] = dateStr.split('T')
  const [year, month, day] = datePart.split('-').map(Number)
  const d = new Date(year, month - 1, day)
  return d.toLocaleDateString('fr-CA', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })
}

function formatDateCourte(dateStr: string): string {
  const [datePart] = dateStr.split('T')
  const [year, month, day] = datePart.split('-').map(Number)
  const d = new Date(year, month - 1, day)
  return d.toLocaleDateString('fr-CA', { year: 'numeric', month: 'long', day: 'numeric' })
}

function formatHeure(dateStr: string): string {
  const timePart = dateStr.split('T')[1] ?? ''
  const [heure, minute] = timePart.replace('Z', '').split(':')
  return `${heure} h ${minute}`
}

function memeJour(date1: string, date2: string): boolean {
  return date1.split('T')[0] === date2.split('T')[0]
}

export default function PromoEvenement({
  prenom = 'Prénom',
  nomEvenement = "Nom de l'événement",
  description = '',
  dateDebut,
  dateFin,
  lieu = '',
  villes = [],
  acces = 'public',
  aBillets = true,
  aBanquet = false,
  banquetNom = null,
  banquetPrix = null,
  paliers = [],
  imageUrl,
  lienAchat = '#',
}: PromoEvenementProps) {
  const unSeulJour = memeJour(dateDebut, dateFin)
  const typeLabel = aBillets ? (unSeulJour ? 'SESSION' : 'CONGRÈS') : 'INFORMATIF'

  const paliersTries = [...paliers].sort((a, b) => a.ordre - b.ordre)
  const maintenant = new Date()
  const indexTrouve = paliersTries.findIndex(p => new Date(p.date_fin) > maintenant)
  const indexActuel = paliersTries.length === 0 ? -1 : (indexTrouve === -1 ? paliersTries.length - 1 : indexTrouve)

  const lieuTexte = villes.length > 1 ? villes.join(' · ') : (lieu || villes[0] || '')

  return (
    <Gabarit
      apercu={`${nomEvenement} — ${formatDateCourte(dateDebut)}`}
      banniere={imageUrl ? { src: imageUrl, alt: nomEvenement } : undefined}
    >
      {/* Badges */}
      <Text style={{ margin: '0 0 14px' }}>
        <span style={badge}>{typeLabel}</span>
        {acces === 'platine' && <span style={{ ...badge, ...badgeOr }}>★ PLATINE</span>}
        {aBanquet && <span style={{ ...badge, ...badgeOr }}>🍽️ BANQUET</span>}
      </Text>

      <Text style={titre}>{nomEvenement}</Text>

      <Paragraphe>Bonjour {prenom},</Paragraphe>
      {description && <Paragraphe>{description}</Paragraphe>}

      {/* Quand / Où */}
      <Section style={blocInfos}>
        <Row>
          <Column style={{ verticalAlign: 'top', paddingRight: '12px' }}>
            <Text style={etiquette}>📅 QUAND</Text>
            {unSeulJour ? (
              <Text style={valeur}>
                <span style={{ textTransform: 'capitalize' }}>{formatDateLongue(dateDebut)}</span><br />
                {formatHeure(dateDebut)} à {formatHeure(dateFin)} (HE)
              </Text>
            ) : (
              <Text style={valeur}>
                Du {formatDateCourte(dateDebut)}<br />
                au {formatDateCourte(dateFin)}
              </Text>
            )}
          </Column>
        </Row>
        {lieuTexte && (
          <Row>
            <Column style={{ verticalAlign: 'top', paddingTop: '14px' }}>
              <Text style={etiquette}>{villes.length > 1 ? '📍 OFFERT DANS PLUSIEURS VILLES' : '📍 LIEU'}</Text>
              <Text style={valeur}>{lieuTexte}</Text>
            </Column>
          </Row>
        )}
      </Section>

      {/* Tarifs */}
      {aBillets && paliersTries.length > 0 && (
        <>
          <Text style={{ ...etiquette, margin: '28px 0 10px' }}>💰 TARIFS</Text>
          {paliersTries.map((p, i) => {
            const actuel = i === indexActuel
            const passe = indexActuel !== -1 && i < indexActuel
            return (
              <Section key={i} style={actuel ? palierActuel : palier}>
                <Row>
                  <Column>
                    <Text style={actuel ? palierPrixActuel : { ...palierPrix, textDecoration: passe ? 'line-through' : 'none' }}>
                      {p.prix.toFixed(2)} $
                    </Text>
                  </Column>
                  <Column align="right">
                    <Text style={actuel ? palierDateActuel : palierDate}>
                      {actuel ? '🔥 Tarif actuel — ' : ''}jusqu&apos;au {formatDateCourte(p.date_fin)}
                    </Text>
                  </Column>
                </Row>
              </Section>
            )
          })}
          <Note>Taxes et frais de traitement en sus. Les PCI en période sans frais obtiennent leur billet sans frais.</Note>
        </>
      )}

      {/* Banquet */}
      {aBanquet && banquetNom && (
        <Section style={banquet}>
          <Text style={banquetTitre}>🍽️ {banquetNom}</Text>
          <Text style={banquetTexte}>
            {banquetPrix != null && banquetPrix > 0
              ? `Inclus avec le billet régulier. PCI sans frais : ${banquetPrix.toFixed(2)} $, à réserver après l'achat de votre billet.`
              : 'Offert avec votre billet.'}
          </Text>
        </Section>
      )}

      <Bouton href={lienAchat}>{aBillets ? 'Prendre mes billets' : 'Plus de détails'}</Bouton>

      <Separateur />
      <Note>
        Vous recevez ce courriel parce que vous avez accepté de recevoir les communications de la Famille Germain – Yager Group.
        Pour ne plus les recevoir, écrivez-nous par la page Contact du site.
      </Note>
    </Gabarit>
  )
}

const titre: React.CSSProperties = { color: '#1A2535', fontSize: '28px', fontWeight: 'bold', lineHeight: '36px', margin: '0 0 22px' }
const badge: React.CSSProperties = { display: 'inline-block', padding: '5px 12px', borderRadius: '999px', fontSize: '11px', fontWeight: 'bold', letterSpacing: '0.8px', backgroundColor: '#1A2535', color: '#C9A84C', marginRight: '6px' }
const badgeOr: React.CSSProperties = { backgroundColor: '#C9A84C', color: '#1A2535' }
const blocInfos: React.CSSProperties = { backgroundColor: '#F5F3EE', borderLeft: '4px solid #C9A84C', borderRadius: '8px', padding: '20px 24px', margin: '8px 0 0' }
const etiquette: React.CSSProperties = { color: '#C9A84C', fontSize: '12px', fontWeight: 'bold', letterSpacing: '0.8px', margin: '0 0 4px' }
const valeur: React.CSSProperties = { color: '#1A2535', fontSize: '17px', fontWeight: 'bold', lineHeight: '25px', margin: 0 }
const palier: React.CSSProperties = { backgroundColor: '#F5F3EE', borderRadius: '8px', padding: '12px 18px', marginBottom: '8px' }
const palierActuel: React.CSSProperties = { backgroundColor: '#C9A84C', borderRadius: '8px', padding: '14px 18px', marginBottom: '8px' }
const palierPrix: React.CSSProperties = { color: '#888888', fontSize: '16px', fontWeight: 'bold', margin: 0 }
const palierPrixActuel: React.CSSProperties = { color: '#1A2535', fontSize: '20px', fontWeight: 'bold', margin: 0 }
const palierDate: React.CSSProperties = { color: '#999999', fontSize: '13px', margin: 0 }
const palierDateActuel: React.CSSProperties = { color: '#1A2535', fontSize: '13px', fontWeight: 'bold', margin: 0 }
const banquet: React.CSSProperties = { backgroundColor: '#1A2535', borderRadius: '10px', padding: '18px 24px', margin: '24px 0 0' }
const banquetTitre: React.CSSProperties = { color: '#C9A84C', fontSize: '16px', fontWeight: 'bold', margin: '0 0 6px' }
const banquetTexte: React.CSSProperties = { color: '#E0E0E0', fontSize: '14px', lineHeight: '22px', margin: 0 }
