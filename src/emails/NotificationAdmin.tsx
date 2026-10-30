import * as React from 'react'
import Gabarit, { Paragraphe, Bouton, Encadre, LigneEncadre } from './Gabarit'

interface NotificationAdminProps {
  type: 'nouveau_pci' | 'nouveau_billet'
  prenomPCI: string
  nomPCI: string
  details?: string
  lienDashboard: string
}

export default function NotificationAdmin({ type = 'nouveau_pci', prenomPCI = 'Prénom', nomPCI = 'Nom', details = '', lienDashboard = '' }: NotificationAdminProps) {
  const nouveauPCI = type === 'nouveau_pci'
  return (
    <Gabarit
      apercu={nouveauPCI ? `${prenomPCI} ${nomPCI} attend votre approbation` : `${prenomPCI} ${nomPCI} vient d'acheter un billet`}
      titre={nouveauPCI ? 'Nouveau PCI à approuver' : 'Nouveau billet acheté'}
    >
      <Paragraphe>
        {nouveauPCI
          ? <><strong>{prenomPCI} {nomPCI}</strong> vient de s&apos;inscrire sur la plateforme et attend votre approbation.</>
          : <><strong>{prenomPCI} {nomPCI}</strong> vient d&apos;acheter un billet.</>}
      </Paragraphe>
      {details && (
        <Encadre>
          <LigneEncadre libelle="Détails" valeur={details} />
        </Encadre>
      )}
      <Bouton href={lienDashboard}>{nouveauPCI ? 'Approuver le PCI' : 'Voir les billets'}</Bouton>
    </Gabarit>
  )
}
