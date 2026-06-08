import { Body, Container, Head, Heading, Html, Preview, Text, Hr, Section, Img } from '@react-email/components'
import * as React from 'react'

interface ConfirmationBilletProps {
  prenom: string
  nom: string
  evenement: string
  ville: string
  date: string
  prix: string
  codeQR: string
}

export default function ConfirmationBillet({ prenom = 'Prénom', nom = 'Nom', evenement = 'Événement', ville = 'Ville', date = 'Date', prix = '0.00', codeQR = '' }: ConfirmationBilletProps) {
  return (
    <Html>
      <Head />
      <Preview>Votre billet pour {evenement} est confirmé!</Preview>
      <Body style={main}>
        <Container style={container}>
          <Section style={header}>
            <Heading style={logo}>Famille Germain – Yager Group</Heading>
          </Section>
          <Section style={content}>
            <Heading style={h1}>Billet confirmé!</Heading>
            <Text style={text}>Bonjour {prenom} {nom},</Text>
            <Text style={text}>Votre billet pour l'événement suivant est confirmé :</Text>
            <Section style={billetBox}>
              <Text style={billetTitre}>{evenement}</Text>
              <Text style={billetDetail}>📍 {ville}</Text>
              <Text style={billetDetail}>📅 {date}</Text>
              <Text style={billetDetail}>💰 {prix === '0.00' ? 'Sans frais' : `${prix} $`}</Text>
            </Section>
            <Text style={text}>Votre code QR est disponible dans votre espace <strong>Mes billets</strong> sur la plateforme.</Text>
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
const billetBox = { backgroundColor: '#F5F3EE', border: '2px solid #C9A84C', borderRadius: '8px', padding: '16px 24px', margin: '16px 0' }
const billetTitre = { color: '#1A2535', fontSize: '18px', fontWeight: 'bold', margin: '0 0 8px 0' }
const billetDetail = { color: '#333333', fontSize: '15px', margin: '4px 0' }
const hr = { borderColor: '#C9A84C', margin: '24px 0' }
const footer = { color: '#888888', fontSize: '12px', textAlign: 'center' as const }