import { Body, Container, Head, Heading, Html, Preview, Text, Hr, Section, Button, Img, Row, Column } from '@react-email/components'
import * as React from 'react'

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
  return `${heure} h ${minute} (HE)`
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
  appUrl = '',
}: PromoEvenementProps) {
  const unSeulJour = memeJour(dateDebut, dateFin)
  const typeLabel = aBillets ? (unSeulJour ? 'SESSION' : 'CONGRÈS') : 'INFORMATIF'
  const typeCouleur = aBillets ? '#C9A84C' : '#4CAF7D'

  const paliersTries = [...paliers].sort((a, b) => a.ordre - b.ordre)
  const maintenant = new Date()
  const indexTrouve = paliersTries.findIndex(p => new Date(p.date_fin) > maintenant)
  const indexActuel = paliersTries.length === 0 ? -1 : (indexTrouve === -1 ? paliersTries.length - 1 : indexTrouve)

  return (
    <Html>
      <Head />
      <Preview>{nomEvenement} — {formatDateCourte(dateDebut)}</Preview>
      <Body style={main}>
        <Container style={container}>

          {/* En-tête avec les deux logos */}
          <Section style={header}>
            <Row>
              <Column align="left" style={{ width: '55%' }}>
                <Img src={`${appUrl}/logo-germain.png`} alt="La Famille Germain" height={44} />
              </Column>
              <Column align="right" style={{ width: '45%' }}>
                <Img src={`${appUrl}/logo-yager.png`} alt="Yager Group" height={38} />
              </Column>
            </Row>
          </Section>

          {imageUrl && <Img src={imageUrl} alt={nomEvenement} width={600} style={banner} />}

          <Section style={content}>

            {/* Badges */}
            <div style={{ marginBottom: '12px' }}>
              <span style={{ ...badge, backgroundColor: '#1A2535', color: typeCouleur }}>{typeLabel}</span>
              {acces === 'platine' && <span style={{ ...badge, backgroundColor: '#C9A84C', color: '#1A2535', marginLeft: '6px' }}>★ PLATINE</span>}
              {aBanquet && <span style={{ ...badge, backgroundColor: '#C9A84C', color: '#1A2535', marginLeft: '6px' }}>🍽️ BANQUET</span>}
            </div>

            <Heading style={h1}>{nomEvenement}</Heading>
            <Text style={text}>Bonjour {prenom},</Text>
            {description && <Text style={text}>{description}</Text>}

            <Hr style={hr} />

            {/* Date */}
            <Text style={detailLabel}>📅 QUAND</Text>
            {unSeulJour ? (
              <Text style={detailValue}>
                {formatDateLongue(dateDebut)}<br />
                {formatHeure(dateDebut)} → {formatHeure(dateFin)}
              </Text>
            ) : (
              <Text style={detailValue}>
                Du {formatDateCourte(dateDebut)}<br />
                au {formatDateCourte(dateFin)}
              </Text>
            )}

            {/* Lieu / villes multiples */}
            {(lieu || villes.length > 0) && (
              <>
                <Text style={detailLabel}>{villes.length > 1 ? '📍 OFFERT DANS PLUSIEURS VILLES' : '📍 LIEU'}</Text>
                <Text style={detailValue}>
                  {villes.length > 1 ? villes.join(' · ') : (lieu || villes[0] || '')}
                </Text>
              </>
            )}

            {/* Paliers de prix avec dates */}
            {aBillets && paliersTries.length > 0 && (
              <>
                <Text style={detailLabel}>💰 TARIFS</Text>
                {paliersTries.map((p, i) => (
                  <div key={i} style={i === indexActuel ? palierActuelBox : palierBox}>
                    <Text style={i === indexActuel ? palierPrixActuel : palierPrix}>
                      {p.prix.toFixed(2)} $ {i === indexActuel ? '🔥 tarif actuel' : ''}
                    </Text>
                    <Text style={i === indexActuel ? palierDateActuel : palierDate}>
                      jusqu'au {formatDateCourte(p.date_fin)}
                    </Text>
                  </div>
                ))}
              </>
            )}

            {/* Banquet */}
            {aBanquet && banquetNom && (
              <Section style={banquetBox}>
                <Text style={banquetTitre}>🍽️ {banquetNom}</Text>
                <Text style={banquetTexte}>
                  {banquetPrix != null && banquetPrix > 0
                    ? `${banquetPrix.toFixed(2)} $ — disponible à l'achat de votre billet`
                    : "Offert avec votre billet sans frais"}
                </Text>
              </Section>
            )}

            <Section style={{ textAlign: 'center' as const, margin: '32px 0 16px' }}>
              <Button href={lienAchat} style={bouton}>
                {aBillets ? 'PRENEZ VOS BILLETS' : 'PLUS DE DÉTAILS'}
              </Button>
            </Section>

            <Hr style={hr} />
            <Text style={footer}>Famille Germain – Yager Group | ACCESLYBERTECH INC.</Text>
          </Section>
        </Container>
      </Body>
    </Html>
  )
}

const main = { backgroundColor: '#F5F3EE', fontFamily: 'Arial, sans-serif' }
const container = { maxWidth: '600px', margin: '0 auto', backgroundColor: '#ffffff', borderRadius: '8px', overflow: 'hidden' }
const header = { backgroundColor: '#1A2535', padding: '20px 32px' }
const banner = { width: '100%', display: 'block' as const }
const content = { padding: '32px' }
const badge = { display: 'inline-block' as const, padding: '4px 10px', borderRadius: '999px', fontSize: '11px', fontWeight: 'bold' as const, letterSpacing: '0.5px' }
const h1 = { color: '#1A2535', fontSize: '26px', fontWeight: 'bold' as const, margin: '4px 0 12px' }
const text = { color: '#333333', fontSize: '16px', lineHeight: '24px' }
const detailLabel = { color: '#C9A84C', fontSize: '12px', fontWeight: 'bold' as const, letterSpacing: '0.5px', margin: '20px 0 4px' }
const detailValue = { color: '#1A2535', fontSize: '17px', fontWeight: '600' as const, margin: '0', lineHeight: '24px' }
const hr = { borderColor: '#EDEAE2', margin: '24px 0' }
const palierBox = { padding: '10px 14px', marginBottom: '6px', borderRadius: '8px', backgroundColor: '#F5F3EE' }
const palierActuelBox = { padding: '10px 14px', marginBottom: '6px', borderRadius: '8px', backgroundColor: '#C9A84C' }
const palierPrix = { color: '#666666', fontSize: '15px', fontWeight: '600' as const, margin: '0' }
const palierPrixActuel = { color: '#1A2535', fontSize: '16px', fontWeight: 'bold' as const, margin: '0' }
const palierDate = { color: '#999999', fontSize: '12px', margin: '0' }
const palierDateActuel = { color: '#1A2535', fontSize: '12px', margin: '0', opacity: 0.75 }
const banquetBox = { backgroundColor: '#1A2535', borderRadius: '10px', padding: '16px 20px', margin: '20px 0' }
const banquetTitre = { color: '#C9A84C', fontSize: '15px', fontWeight: 'bold' as const, margin: '0 0 4px' }
const banquetTexte = { color: '#E0E0E0', fontSize: '14px', margin: '0' }
const bouton = { backgroundColor: '#C9A84C', color: '#1A2535', fontSize: '16px', fontWeight: 'bold' as const, padding: '16px 40px', borderRadius: '8px', textDecoration: 'none', display: 'inline-block' as const, letterSpacing: '0.5px' }
const footer = { color: '#888888', fontSize: '12px', textAlign: 'center' as const }