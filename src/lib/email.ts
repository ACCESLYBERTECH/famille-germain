import { Resend } from 'resend'
import BienvenuePCI from '@/emails/BienvenuePCI'
import ConfirmationBillet from '@/emails/ConfirmationBillet'
import NotificationAdmin from '@/emails/NotificationAdmin'
import ConfirmationRemboursement from '@/emails/ConfirmationRemboursement'

const resend = new Resend(process.env.RESEND_API_KEY)
const FROM = process.env.FROM_EMAIL!
const ADMIN = process.env.ADMIN_EMAIL!
const APP_URL = process.env.NEXT_PUBLIC_APP_URL!

export async function envoyerBienvenuePCI(prenom: string, nom: string, email: string) {
  await resend.emails.send({
    from: FROM,
    to: email,
    subject: 'Bienvenue dans la famille Germain – Yager Group!',
    react: BienvenuePCI({ prenom, nom }),
  })
}

export async function envoyerConfirmationBillet(params: {
  prenom: string
  nom: string
  email: string
  evenement: string
  ville: string
  date: string
  prix: string
}) {
  await resend.emails.send({
    from: FROM,
    to: params.email,
    subject: `Votre billet pour ${params.evenement} est confirmé!`,
    react: ConfirmationBillet({
      prenom: params.prenom,
      nom: params.nom,
      evenement: params.evenement,
      ville: params.ville,
      date: params.date,
      prix: params.prix,
      codeQR: '',
    }),
  })
}

export async function envoyerNotificationAdminNouveauPCI(prenomPCI: string, nomPCI: string) {
  await resend.emails.send({
    from: FROM,
    to: ADMIN,
    subject: `Nouveau PCI à approuver – ${prenomPCI} ${nomPCI}`,
    react: NotificationAdmin({
      type: 'nouveau_pci',
      prenomPCI,
      nomPCI,
      lienDashboard: `${APP_URL}/admin/pci`,
    }),
  })
}

export async function envoyerNotificationAdminNouveauBillet(prenomPCI: string, nomPCI: string, evenement: string, ville: string) {
  await resend.emails.send({
    from: FROM,
    to: ADMIN,
    subject: `Nouveau billet acheté – ${prenomPCI} ${nomPCI}`,
    react: NotificationAdmin({
      type: 'nouveau_billet',
      prenomPCI,
      nomPCI,
      details: `Événement : ${evenement} – ${ville}`,
      lienDashboard: `${APP_URL}/admin/evenements`,
    }),
  })
}

export async function envoyerConfirmationRemboursement(params: {
  prenom: string
  nom: string
  email: string
  evenement: string
  ville: string
  montant: string
}) {
  await resend.emails.send({
    from: FROM,
    to: params.email,
    subject: `Remboursement traité – ${params.evenement}`,
    react: ConfirmationRemboursement({
      prenom: params.prenom,
      nom: params.nom,
      evenement: params.evenement,
      ville: params.ville,
      montant: params.montant,
    }),
  })
}