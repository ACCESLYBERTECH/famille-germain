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
  typeAchat?: 'billet' | 'banquet'
  facturesJointes?: number
}

export default function ConfirmationBillet({ prenom = 'Prénom', nom = 'Nom', evenement = 'Événement', ville = 'Ville', date = 'Date', prix = '0.00', typeAchat = 'billet', facturesJointes = 0 }: ConfirmationBilletProps) {
  const banquet = typeAchat === 'banquet'
  return (
    <Gabarit
      apercu={banquet ? `Votre place au banquet est confirmée — ${evenement}` : `Votre billet pour ${evenement} est confirmé`}
      titre={banquet ? 'Votre banquet est confirmé ✓' : 'Votre billet est confirmé ✓'}
    >
      <Paragraphe>Bonjour {prenom} {nom},</Paragraphe>
      <Paragraphe>
        {banquet
          ? <>Merci! Votre place au banquet suivant est confirmée.</>
          : <>Merci! Votre billet pour l&apos;événement suivant est confirmé.</>}
      </Paragraphe>
      <Encadre>
        <LigneEncadre libelle={banquet ? 'Banquet' : 'Événement'} valeur={evenement} />
        {ville && <LigneEncadre libelle="Lieu" valeur={ville} />}
        {date && <LigneEncadre libelle="Date" valeur={date} />}
        <LigneEncadre libelle="Prix" valeur={prix === '0.00' ? 'Sans frais' : `${prix} $`} />
      </Encadre>
      <Paragraphe>
        Votre <strong>code QR</strong> vous attend dans la section <strong>Mes billets</strong>. Présentez-le à l&apos;entrée le jour de l&apos;événement.
      </Paragraphe>
      <Bouton href={`${APP_URL}/evenements/mes-billets`}>Voir mes billets</Bouton>
      <Note>
        {facturesJointes > 0
          ? <>{facturesJointes > 1 ? 'Vos factures sont jointes' : 'Votre facture est jointe'} à ce courriel (PDF). Vous les retrouverez aussi en tout temps dans « Mes factures ».</>
          : <>Vos factures sont disponibles en tout temps dans « Mes factures ».</>}
      </Note>
    </Gabarit>
  )
}
