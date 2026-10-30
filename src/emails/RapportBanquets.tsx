import * as React from 'react'
import Gabarit, { Paragraphe, Encadre, LigneEncadre, Note } from './Gabarit'

// Courriel qui accompagne le PDF du Rapport banquets
export default function RapportBanquets({ sousTitre = '' }: { sousTitre?: string }) {
  return (
    <Gabarit apercu="Rapport des banquets en pièce jointe (PDF)" titre="Rapport des banquets">
      <Paragraphe>Bonjour,</Paragraphe>
      <Paragraphe>Vous trouverez ci-joint le <strong>rapport des banquets</strong> en format PDF.</Paragraphe>
      {sousTitre && (
        <Encadre>
          <LigneEncadre libelle="Contenu du rapport" valeur={sousTitre} />
        </Encadre>
      )}
      <Note>🔒 Ce document est confidentiel. Merci de ne pas le partager.</Note>
    </Gabarit>
  )
}
