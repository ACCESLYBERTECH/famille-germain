import { Body, Container, Head, Heading, Html, Preview, Text, Hr, Section, Button } from '@react-email/components'
import * as React from 'react'

interface NotificationAdminProps {
  type: 'nouveau_pci' | 'nouveau_billet'
  prenomPCI: string
  nomPCI: string
  details?: string
  lienDashboard: string
}

export default function NotificationAdmin({ type = 'nouveau_pci', prenomPCI = 'Prénom', nomPCI = 'Nom', details = '', lienDashboard = 'http://localhost:3000' }: NotificationAdminProps) {
  const titre = type === 'nouveau_pci' ? 'Nouveau PCI à approuver' : 'Nouveau billet acheté'
  const message = type === 'nouveau_pci'
    ? `${prenomPCI} ${nomPCI} vient de s'inscrire et attend votre approbation.`
    : `${prenomPCI} ${nomPCI} vient d'acheter un billet.`

  return (
    <Html>
      <Head />
      <Preview>{titre} – Action requise</Preview>
      <Body style={main}>
        <Container style={container}>
          <Section style={header}>
            <Heading style={logo}>Famille Germain – Yager Group</Heading>
          </Section>
          <Section style={content}>
            <Heading style={h1}>{titre}</Heading>
            <Text style={text}>{message}</Text>
            {details && <Text style={text}>{details}</Text>}
            <Section style={{ textAlign: 'center' as const, margin: '32px 0' }}>
              <Button href={lienDashboard} style={button}>Voir le dashboard</Button>
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
const header = { backgroundColor: '#1A2535', padding: '24px 32px' }
const logo = { color: '#C9A84C', fontSize: '20px', margin: '0', fontWeight: 'bold' }
const content = { padding: '32px' }
const h1 = { color: '#1A2535', fontSize: '24px', marginBottom: '16px' }
const text = { color: '#333333', fontSize: '16px', lineHeight: '24px' }
const button = { backgroundColor: '#C9A84C', color: '#1A2535', padding: '12px 24px', borderRadius: '6px', fontWeight: 'bold', fontSize: '16px', textDecoration: 'none' }
const hr = { borderColor: '#C9A84C', margin: '24px 0' }
const footer = { color: '#888888', fontSize: '12px', textAlign: 'center' as const }