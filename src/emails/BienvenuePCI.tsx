import { Body, Container, Head, Heading, Html, Preview, Text, Hr, Section } from '@react-email/components'
import * as React from 'react'

interface BienvenuePCIProps {
  prenom: string
  nom: string
}

export default function BienvenuePCI({ prenom = 'Prénom', nom = 'Nom' }: BienvenuePCIProps) {
  return (
    <Html>
      <Head />
      <Preview>Bienvenue dans la famille Germain – Yager Group!</Preview>
      <Body style={main}>
        <Container style={container}>
          <Section style={header}>
            <Heading style={logo}>Famille Germain – Yager Group</Heading>
          </Section>
          <Section style={content}>
            <Heading style={h1}>Bienvenue, {prenom}!</Heading>
            <Text style={text}>Bonjour {prenom} {nom},</Text>
            <Text style={text}>Votre compte PCI a été approuvé. Vous pouvez maintenant vous connecter à la plateforme et accéder à tous vos avantages.</Text>
            <Text style={text}>Vous avez accès à :</Text>
            <Text style={text}>• Les événements et billets</Text>
            <Text style={text}>• Les documents exclusifs</Text>
            <Text style={text}>• Votre espace personnel</Text>
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
const hr = { borderColor: '#C9A84C', margin: '24px 0' }
const footer = { color: '#888888', fontSize: '12px', textAlign: 'center' as const }