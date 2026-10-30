import { Body, Container, Head, Html, Preview, Section, Img, Row, Column, Text, Hr, Button, Link } from '@react-email/components'
import * as React from 'react'

// Gabarit commun de tous les courriels du site : logos, couleurs de la marque, espacement aéré

export const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'https://famille-germain.vercel.app'

interface GabaritProps {
  apercu: string          // texte affiché dans la boîte de réception, sous le sujet
  titre?: string           // facultatif : un courriel peut afficher son propre titre
  banniere?: { src: string; alt: string }  // image pleine largeur sous l'en-tête (ex. affiche d'un événement)
  children: React.ReactNode
}

export default function Gabarit({ apercu, titre, banniere, children }: GabaritProps) {
  return (
    <Html lang="fr">
      <Head />
      <Preview>{apercu}</Preview>
      <Body style={styles.body}>
        <Container style={styles.container}>

          {/* En-tête : les deux logos sur fond marine */}
          <Section style={styles.entete}>
            <Row>
              <Column align="center">
                <Img src={`${APP_URL}/logo-germain.png`} alt="La Famille Germain" height={52} style={styles.logo} />
              </Column>
              <Column align="center">
                <Img src={`${APP_URL}/logo-yager.png`} alt="Yager Group" height={44} style={styles.logo} />
              </Column>
            </Row>
          </Section>
          <Section style={styles.filetOr} />
          {banniere && <Img src={banniere.src} alt={banniere.alt} width={600} style={styles.banniere} />}

          {/* Contenu */}
          <Section style={styles.contenu}>
            {titre && <Text style={styles.titre}>{titre}</Text>}
            {children}
          </Section>

          {/* Pied de page */}
          <Section style={styles.pied}>
            <Text style={styles.piedTexte}>
              <strong style={{ color: '#C9A84C' }}>Famille Germain – Yager Group</strong>
              <br />
              <Link href={APP_URL} style={styles.piedLien}>{APP_URL.replace(/^https?:\/\//, '')}</Link>
            </Text>
            <Text style={styles.piedPetit}>
              Ce courriel vous est envoyé automatiquement, merci de ne pas y répondre.
              <br />
              Pour toute question : page Contact du site.
              <br />
              ACCESLYBERTECH INC.
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  )
}

// ---------- Éléments réutilisables

export function Paragraphe({ children }: { children: React.ReactNode }) {
  return <Text style={styles.paragraphe}>{children}</Text>
}

export function Bouton({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Section style={{ textAlign: 'center', margin: '32px 0' }}>
      <Button href={href} style={styles.bouton}>{children}</Button>
    </Section>
  )
}

export function Encadre({ children }: { children: React.ReactNode }) {
  return <Section style={styles.encadre}>{children}</Section>
}

export function LigneEncadre({ libelle, valeur }: { libelle: string; valeur: React.ReactNode }) {
  return (
    <Text style={styles.ligneEncadre}>
      <span style={{ color: '#888888' }}>{libelle}</span>
      <br />
      <span style={{ color: '#1A2535', fontWeight: 'bold', fontSize: '16px' }}>{valeur}</span>
    </Text>
  )
}

export function Separateur() {
  return <Hr style={styles.separateur} />
}

export function Note({ children }: { children: React.ReactNode }) {
  return <Text style={styles.note}>{children}</Text>
}

const styles: Record<string, React.CSSProperties> = {
  body: { backgroundColor: '#F5F3EE', fontFamily: 'Arial, Helvetica, sans-serif', margin: 0, padding: '32px 0' },
  container: { maxWidth: '600px', margin: '0 auto', backgroundColor: '#FFFFFF', borderRadius: '12px', overflow: 'hidden', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' },
  entete: { backgroundColor: '#1A2535', padding: '28px 24px' },
  logo: { display: 'inline-block', margin: '0 auto' },
  banniere: { width: '100%', maxWidth: '600px', display: 'block', height: 'auto' },
  filetOr: { backgroundColor: '#C9A84C', height: '4px', lineHeight: '4px', fontSize: '4px' },
  contenu: { padding: '40px 40px 24px' },
  titre: { color: '#1A2535', fontSize: '26px', fontWeight: 'bold', lineHeight: '34px', margin: '0 0 24px' },
  paragraphe: { color: '#333333', fontSize: '16px', lineHeight: '26px', margin: '0 0 18px' },
  bouton: { backgroundColor: '#C9A84C', color: '#1A2535', fontSize: '16px', fontWeight: 'bold', textDecoration: 'none', padding: '16px 36px', borderRadius: '8px', display: 'inline-block' },
  encadre: { backgroundColor: '#F5F3EE', borderLeft: '4px solid #C9A84C', borderRadius: '8px', padding: '20px 24px', margin: '8px 0 24px' },
  ligneEncadre: { fontSize: '13px', lineHeight: '22px', margin: '0 0 12px' },
  separateur: { borderColor: '#E8E2D0', margin: '28px 0' },
  note: { color: '#888888', fontSize: '13px', lineHeight: '21px', margin: '0 0 12px' },
  pied: { backgroundColor: '#1A2535', padding: '24px 40px', textAlign: 'center' },
  piedTexte: { color: '#E0E0E0', fontSize: '14px', lineHeight: '22px', margin: '0 0 12px' },
  piedLien: { color: '#E0E0E0', textDecoration: 'underline' },
  piedPetit: { color: '#9AA3B2', fontSize: '12px', lineHeight: '19px', margin: 0 },
}
