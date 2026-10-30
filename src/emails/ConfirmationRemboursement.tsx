import * as React from 'react'
import Gabarit, { Paragraphe, Encadre, LigneEncadre, Note } from './Gabarit'

interface ConfirmationRemboursementProps {
  prenom: string
  nom: string
  evenement: string
  ville: string
  montant: string
}

export default function ConfirmationRemboursement({ prenom = 'Prénom', nom = 'Nom', evenement = 'Événement', ville = 'Ville', montant = '0.00' }: ConfirmationRemboursementProps) {
  return (
    <Gabarit apercu={`Votre remboursement pour ${evenement} a été traité`} titre="Remboursement traité">
      <Paragraphe>Bonjour {prenom} {nom},</Paragraphe>
      <Paragraphe>Votre remboursement pour l&apos;événement suivant a été traité avec succès.</Paragraphe>
      <Encadre>
        <LigneEncadre libelle="Événement" valeur={evenement} />
        {ville && <LigneEncadre libelle="Lieu" valeur={ville} />}
        <LigneEncadre libelle="Montant remboursé" valeur={`${montant} $`} />
      </Encadre>
      <Paragraphe>
        Le montant sera crédité sur votre mode de paiement d&apos;origine d&apos;ici <strong>5 à 10 jours ouvrables</strong>, selon votre institution financière.
      </Paragraphe>
      <Note>Les frais de ce remboursement sont entièrement assumés par ACCESLYBERTECH INC. Aucuns frais ne vous sont facturés.</Note>
    </Gabarit>
  )
}
