import * as React from 'react'
import Gabarit, { Paragraphe, Bouton, Note } from './Gabarit'

export default function ReinitialisationMotDePasse({ prenom = '', lien = '' }: { prenom?: string; lien: string }) {
  return (
    <Gabarit apercu="Choisissez un nouveau mot de passe pour votre compte" titre="Réinitialisation du mot de passe">
      <Paragraphe>Bonjour{prenom ? ` ${prenom}` : ''},</Paragraphe>
      <Paragraphe>Vous avez demandé à réinitialiser le mot de passe de votre compte sur la plateforme de la Famille Germain – Yager Group.</Paragraphe>
      <Paragraphe>Cliquez sur le bouton ci-dessous pour choisir un nouveau mot de passe :</Paragraphe>
      <Bouton href={lien}>Choisir un nouveau mot de passe</Bouton>
      <Note>⏱️ Pour votre sécurité, ce lien expire dans 1 heure et ne peut être utilisé qu&apos;une seule fois.</Note>
      <Note>Vous n&apos;avez pas fait cette demande? Ignorez simplement ce courriel : votre mot de passe actuel reste inchangé.</Note>
    </Gabarit>
  )
}
