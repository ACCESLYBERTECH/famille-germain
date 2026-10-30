import * as React from 'react'
import Gabarit, { Paragraphe, Bouton, Encadre, Note, APP_URL } from './Gabarit'

interface BienvenuePCIProps {
  prenom: string
  nom: string
}

export default function BienvenuePCI({ prenom = 'Prénom', nom = 'Nom' }: BienvenuePCIProps) {
  return (
    <Gabarit apercu="Votre compte est approuvé — bienvenue dans la Famille Germain!" titre={`Bienvenue, ${prenom}!`}>
      <Paragraphe>Bonjour {prenom} {nom},</Paragraphe>
      <Paragraphe>
        Bonne nouvelle : votre compte PCI vient d&apos;être <strong>approuvé</strong>. Vous faites maintenant partie de la plateforme de la Famille Germain – Yager Group.
      </Paragraphe>
      <Encadre>
        <Paragraphe><strong>Sur la plateforme, vous pouvez :</strong></Paragraphe>
        <Paragraphe>🎫 Acheter vos billets pour les formations et congrès<br />📱 Retrouver vos billets et codes QR dans « Mes billets »<br />📄 Consulter les documents réservés aux PCI</Paragraphe>
      </Encadre>
      <Bouton href={`${APP_URL}/connexion`}>Me connecter</Bouton>
      <Note>Connectez-vous avec le courriel et le mot de passe choisis lors de votre inscription.</Note>
    </Gabarit>
  )
}
