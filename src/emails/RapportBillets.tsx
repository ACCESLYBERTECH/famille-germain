import * as React from 'react'
import Gabarit, { Paragraphe, Encadre, LigneEncadre, Note } from './Gabarit'

// Courriel qui accompagne le PDF du rapport des ventes de billets envoyé par un leader
export default function RapportBillets({ leader = 'Votre leader', courrielLeader = '', evenement = '', groupe = '', nombreBillets = 0, message = '' }: {
  leader?: string; courrielLeader?: string; evenement?: string; groupe?: string; nombreBillets?: number; message?: string
}) {
  return (
    <Gabarit apercu={`${leader} vous envoie le rapport des ventes de billets`} titre="Rapport des ventes de billets">
      <Paragraphe>Bonjour,</Paragraphe>
      <Paragraphe><strong>{leader}</strong> vous envoie le rapport des ventes de billets, en format PDF, en pièce jointe.</Paragraphe>
      {message && <Paragraphe>« {message} »</Paragraphe>}
      <Encadre>
        <LigneEncadre libelle="Événement" valeur={evenement} />
        <LigneEncadre libelle="Groupe" valeur={groupe} />
        <LigneEncadre libelle="Billets" valeur={String(nombreBillets)} />
      </Encadre>
      {/* Signature du leader qui envoie le rapport */}
      <Paragraphe>
        <span style={{ color: '#999999', fontSize: '12px', letterSpacing: '0.05em' }}>VOTRE LEADER</span><br />
        <strong>{leader}</strong>
        {courrielLeader && <><br /><a href={`mailto:${courrielLeader}`} style={{ color: '#2E86C1' }}>{courrielLeader}</a></>}
      </Paragraphe>
      <Note>🔒 Ce document est confidentiel. Merci de ne pas le partager en dehors du groupe.</Note>
    </Gabarit>
  )
}
