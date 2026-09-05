import { Resend } from 'resend'
import BienvenuePCI from '@/emails/BienvenuePCI'
import ConfirmationBillet from '@/emails/ConfirmationBillet'
import NotificationAdmin from '@/emails/NotificationAdmin'
import ConfirmationRemboursement from '@/emails/ConfirmationRemboursement'
import PromoEvenement from '@/emails/PromoEvenement'

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

export async function envoyerPromoEvenement(params: {
  destinataires: { prenom: string; email: string }[]
  sujet: string
  nomEvenement: string
  description: string
  dateDebut: string
  dateFin: string
  lieu: string
  villes: string[]
  acces: 'public' | 'platine'
  aBillets: boolean
  aBanquet: boolean
  banquetNom: string | null
  banquetPrix: number | null
  paliers: { prix: number; date_fin: string; ordre: number }[]
  imageUrl?: string
  lienAchat: string
}) {
  const { destinataires, sujet, ...contenu } = params

  for (let i = 0; i < destinataires.length; i += 100) {
    const paquet = destinataires.slice(i, i + 100)
    await resend.batch.send(
      paquet.map(d => ({
        from: FROM,
        to: d.email,
        subject: sujet,
        react: PromoEvenement({ prenom: d.prenom, appUrl: APP_URL, ...contenu }),
      }))
    )
  }
}