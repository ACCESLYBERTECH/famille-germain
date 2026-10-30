import * as React from 'react'
import Gabarit, { Paragraphe, Bouton, Encadre, LigneEncadre, Note, APP_URL } from './Gabarit'

interface ConfirmationBilletProps {
  prenom: string
  nom: string
  evenement: string
  ville: string
  date: string
  prix: string
  codeQR: string
}

export default function ConfirmationBillet({ prenom = 'Prénom', nom = 'Nom', evenement = 'Événement', ville = 'Ville', date = 'Date', prix = '0.00' }: ConfirmationBilletProps) {
  return (
    <Gabarit apercu={`Votre billet pour ${evenement} est confirmé`} titre="Votre billet est confirmé ✓">
      <Paragraphe>Bonjour {prenom} {nom},</Paragraphe>
      <Paragraphe>Merci! Votre billet pour l&apos;événement suivant est confirmé.</Paragraphe>
      <Encadre>
        <LigneEncadre libelle="Événement" valeur={evenement} />
        {ville && <LigneEncadre libelle="Lieu" valeur={ville} />}
        {date && <LigneEncadre libelle="Date" valeur={date} />}
        <LigneEncadre libelle="Prix" valeur={prix === '0.00' ? 'Sans frais' : `${prix} $`} />
      </Encadre>
      <Paragraphe>
        Votre <strong>code QR</strong> vous attend dans la section <strong>Mes billets</strong>. Présentez-le à l&apos;entrée le jour de l&apos;événement.
      </Paragraphe>
      <Bouton href={`${APP_URL}/evenements/mes-billets`}>Voir mes billets</Bouton>
      <Note>La facture de votre billet est aussi disponible dans « Mes billets ».</Note>
    </Gabarit>
  )
}
