// Rapport PDF des ventes de billets d'un leader (Platines et plus)
// Le leader choisit ses filtres à l'écran ; le serveur revérifie que chaque billet fait partie de SON groupe.
import { renderToBuffer, Document, Page, Text, View, Image, StyleSheet, Font } from '@react-pdf/renderer'
import React from 'react'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { LOGO_YAGER_CLAIR, LOGO_YAGER_CLAIR_RATIO, LOGO_GERMAIN_CLAIR, LOGO_GERMAIN_CLAIR_RATIO } from '@/lib/logoFacture'
import { libelleFiltreGroupe } from '@/lib/groupes'

const supabaseAdmin = createAdminClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export interface DemandeRapport {
  billetIds: string[]                 // dans l'ordre affiché à l'écran
  evenement: string                   // nom de l'événement filtré ('' = tous)
  leaderFiltre: string                // id du leader filtré ('' = tous)
  groupe: string                      // valeur du filtre Groupe ('' = tous)
}

interface LigneRapport {
  nom: string
  numero: string
  groupe: string
  leader: string
  mode: string
  type: string
  banquet: string
  statut: string
  date: string
}

export interface RapportBilletsLeader {
  leader: string
  evenement: { titre: string; detail: string }
  filtreLeader: string | null
  groupe: string | null
  lignes: LigneRapport[]
  resume: { total: number; surPlace: number; virtuel: number; sansFrais: number; payes: number; utilises: number }
  genereLe: string
}

const nettoyer = (t: string) => (t ?? '').replace(/[^\u0000-ɏ–—’«» ]/g, '').trim()
const nomComplet = (c: any) => c ? `${c.prenom_1 ?? ''} ${c.nom_1 ?? ''}`.trim() : ''

export async function chargerRapportBilletsLeader(userId: string, estAdmin: boolean, demande: DemandeRapport):
  Promise<RapportBilletsLeader | { erreur: string; statut: number }> {
  const ids = Array.isArray(demande.billetIds) ? demande.billetIds.filter(i => typeof i === 'string').slice(0, 3000) : []
  if (ids.length === 0) return { erreur: 'Aucun billet dans le rapport (vérifiez vos filtres).', statut: 400 }

  const { data: moi } = await supabaseAdmin.from('comptes').select('prenom_1, nom_1').eq('id', userId).single()

  // Son groupe : lui-même + tous les membres sous lui
  const { data: groupeIds } = await supabaseAdmin.rpc('get_groupe_ids', { leader_uuid: userId })
  const idsGroupe = new Set<string>([userId, ...(groupeIds ?? []).map((r: { compte_id: string }) => r.compte_id)])

  // Lecture par paquets (beaucoup de billets possibles)
  const billets: any[] = []
  for (let i = 0; i < ids.length; i += 300) {
    const { data } = await supabaseAdmin
      .from('billets')
      .select('id, compte_id, nom_pci, statut, prix_paye, est_sans_frais, offert_par_admin, mode_participation, created_at, evenements(nom, date_debut, lieu, a_banquet), comptes!billets_compte_id_fkey(numero_amway, groupe, leader_id)')
      .in('id', ids.slice(i, i + 300))
    billets.push(...(data ?? []))
  }
  // Sécurité : seulement les billets de SON groupe (l'admin voit tout)
  const permis = billets.filter(b => estAdmin || idsGroupe.has(b.compte_id))
  if (permis.length === 0) return { erreur: 'Aucun billet de votre groupe dans ce rapport.', statut: 403 }
  const parId = new Map(permis.map(b => [b.id, b]))
  const ordonnes = ids.map(i => parId.get(i)).filter(Boolean) as any[]

  // Noms des leaders des PCI
  const idsLeaders = Array.from(new Set(ordonnes.map(b => b.comptes?.leader_id).concat(demande.leaderFiltre || []).filter(Boolean)))
  const { data: leaders } = idsLeaders.length > 0
    ? await supabaseAdmin.from('comptes').select('id, prenom_1, nom_1').in('id', idsLeaders)
    : { data: [] as any[] }
  const nomLeader = (id: string | null) => nomComplet((leaders ?? []).find((l: any) => l.id === id))

  // Banquets achetés
  const { data: banquets } = await supabaseAdmin
    .from('billets_banquets').select('billet_id').in('billet_id', ordonnes.map(b => b.id)).neq('statut', 'rembourse')
  const avecBanquet = new Set((banquets ?? []).map((b: any) => b.billet_id))

  const statutTexte = (s: string) => s === 'vendu' ? 'Vendu' : s === 'utilise' ? 'Utilisé' : s === 'rembourse' ? 'Remboursé' : s
  const lignes: LigneRapport[] = ordonnes.map(b => ({
    nom: nettoyer(b.nom_pci),
    numero: b.comptes?.numero_amway ?? '',
    groupe: nettoyer(b.comptes?.groupe ?? ''),
    leader: nettoyer(nomLeader(b.comptes?.leader_id)),
    mode: b.mode_participation === 'virtuel' ? 'Virtuel' : 'Sur place',
    type: b.est_sans_frais ? 'Sans frais' : Number(b.prix_paye) === 0 ? 'Billet offert' : `Payé ${Number(b.prix_paye).toFixed(2).replace('.', ',')} $`,
    banquet: b.evenements?.a_banquet && b.est_sans_frais ? (avecBanquet.has(b.id) ? 'Avec banquet' : 'Sans banquet') : '—',
    statut: statutTexte(b.statut),
    date: new Date(b.created_at).toLocaleDateString('en-CA', { timeZone: 'America/Toronto' }),
  }))

  // Événement : celui du filtre (avec date et lieu), sinon « Tous les événements »
  let evenement = { titre: 'Tous les événements', detail: '' }
  if (demande.evenement) {
    const ev = ordonnes.find(b => b.evenements?.nom === demande.evenement)?.evenements
    evenement = {
      titre: nettoyer(demande.evenement),
      detail: ev ? [new Date(ev.date_debut).toLocaleDateString('fr-CA', { timeZone: 'America/Toronto', weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }), nettoyer(ev.lieu ?? '')].filter(Boolean).join('  ·  ') : '',
    }
  }

  const actifs = ordonnes.filter(b => b.statut !== 'rembourse')
  return {
    leader: nettoyer(nomComplet(moi)),
    evenement,
    filtreLeader: demande.leaderFiltre && (estAdmin || idsGroupe.has(demande.leaderFiltre)) ? nettoyer(nomLeader(demande.leaderFiltre)) : null,
    groupe: demande.groupe ? nettoyer(libelleFiltreGroupe(demande.groupe)) : null,
    lignes,
    resume: {
      total: actifs.length,
      surPlace: actifs.filter(b => b.mode_participation !== 'virtuel').length,
      virtuel: actifs.filter(b => b.mode_participation === 'virtuel').length,
      sansFrais: actifs.filter(b => b.est_sans_frais).length,
      payes: actifs.filter(b => !b.est_sans_frais && Number(b.prix_paye) > 0).length,
      utilises: actifs.filter(b => b.statut === 'utilise').length,
    },
    genereLe: new Date().toLocaleString('fr-CA', { timeZone: 'America/Toronto', dateStyle: 'long', timeStyle: 'short' }),
  }
}

// Pas de coupure de mots avec trait d'union (« LA-TOUR »)
Font.registerHyphenationCallback(mot => [mot])

const marine = '#1A2535'
const or = '#C9A84C'
const COLS = [
  { cle: '#', largeur: 22 },
  { cle: 'Nom', largeur: 120 },
  { cle: 'N° PCI', largeur: 62 },
  { cle: 'Groupe', largeur: 134 },
  { cle: 'Leader', largeur: 95 },
  { cle: 'Mode', largeur: 50 },
  { cle: 'Type', largeur: 72 },
  { cle: 'Banquet', largeur: 66 },
  { cle: 'Statut', largeur: 52 },
  { cle: 'Acheté le', largeur: 55 },
]

const st = StyleSheet.create({
  page: { paddingTop: 0, paddingBottom: 42, paddingHorizontal: 0, fontFamily: 'Helvetica', fontSize: 8.5, color: marine },
  entete: { backgroundColor: marine, paddingVertical: 14, paddingHorizontal: 32, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  corps: { paddingHorizontal: 32 },
  etiquette: { color: '#999999', fontSize: 7, letterSpacing: 0.8, marginBottom: 2 },
  valeur: { fontSize: 12, fontFamily: 'Helvetica-Bold' },
  detail: { color: '#666666', fontSize: 8.5, marginTop: 1 },
  carte: { flex: 1, borderWidth: 1, borderColor: '#E0E0E0', borderRadius: 5, paddingVertical: 6, alignItems: 'center' },
  carteNombre: { fontSize: 15, fontFamily: 'Helvetica-Bold' },
  carteLibelle: { color: '#666666', fontSize: 8, marginTop: 1 },
  tete: { flexDirection: 'row', backgroundColor: marine, color: 'white', paddingVertical: 5, marginTop: 12 },
  rangee: { flexDirection: 'row', paddingVertical: 4, borderBottomWidth: 0.5, borderBottomColor: '#E6E6E6' },
  cellule: { paddingHorizontal: 4 },
  pied: { position: 'absolute', bottom: 18, left: 32, right: 32, flexDirection: 'row', justifyContent: 'space-between', color: '#999999', fontSize: 7.5, borderTopWidth: 0.5, borderTopColor: '#E0E0E0', paddingTop: 5 },
})

function RapportPDF({ r }: { r: RapportBilletsLeader }) {
  const e = React.createElement
  const valeurs = (l: LigneRapport, i: number) => [String(i + 1), l.nom, l.numero, l.groupe || '—', l.leader || '—', l.mode, l.type, l.banquet, l.statut, l.date]
  const blocInfo = (etiquette: string, valeur: string, detail?: string) => e(View, { style: { marginRight: 28 } },
    e(Text, { style: st.etiquette }, etiquette),
    e(Text, { style: st.valeur }, valeur),
    detail ? e(Text, { style: st.detail }, detail) : null,
  )
  const carte = (nombre: number, libelle: string, couleur = marine) => e(View, { style: st.carte },
    e(Text, { style: [st.carteNombre, { color: couleur }] }, String(nombre)),
    e(Text, { style: st.carteLibelle }, libelle),
  )

  return e(Document, null,
    e(Page, { size: 'LETTER', orientation: 'landscape', style: st.page },
      // En-tête : Yager Group en premier, puis Famille Germain
      e(View, { style: st.entete, fixed: true },
        e(View, { style: { flexDirection: 'row', alignItems: 'center' } },
          e(Image, { src: LOGO_YAGER_CLAIR, style: { height: 34, width: 34 * LOGO_YAGER_CLAIR_RATIO } }),
          e(View, { style: { width: 0.7, height: 34, backgroundColor: 'rgba(201,168,76,0.6)', marginHorizontal: 12 } }),
          e(View, { style: { alignItems: 'center' } },
            e(Image, { src: LOGO_GERMAIN_CLAIR, style: { height: 20, width: 20 * LOGO_GERMAIN_CLAIR_RATIO } }),
            e(Text, { style: { color: or, fontSize: 6.5, marginTop: 1.5 } }, 'Membre du Yager Group'),
          ),
        ),
        e(View, { style: { alignItems: 'flex-end' } },
          e(Text, { style: { color: 'white', fontSize: 15, fontFamily: 'Helvetica-Bold' } }, 'Rapport des ventes de billets'),
          e(Text, { style: { color: or, fontSize: 8, marginTop: 2 } }, `Généré le ${r.genereLe}`),
        ),
      ),
      e(View, { style: st.corps },
        // Contexte
        e(View, { style: { flexDirection: 'row', marginTop: 14, paddingBottom: 10, borderBottomWidth: 1, borderBottomColor: '#E0E0E0' } },
          blocInfo('LEADER', r.leader),
          blocInfo('ÉVÉNEMENT', r.evenement.titre, r.evenement.detail),
          r.filtreLeader ? blocInfo('ÉQUIPE DE', r.filtreLeader) : null,
          blocInfo('GROUPE', r.groupe ?? 'Tous les groupes', r.groupe && r.groupe !== 'Sans groupe' ? 'sous-groupes inclus' : undefined),
        ),
        // Résumé (billets remboursés exclus des totaux)
        e(View, { style: { flexDirection: 'row', marginTop: 10, gap: 6 } },
          carte(r.resume.total, 'Billets'),
          carte(r.resume.surPlace, 'Sur place', '#4CAF7D'),
          carte(r.resume.virtuel, 'Virtuel', '#2E86C1'),
          carte(r.resume.sansFrais, 'Sans frais', or),
          carte(r.resume.payes, 'Payés'),
          carte(r.resume.utilises, 'Utilisés (scannés)'),
        ),
        // Tableau
        e(View, { style: st.tete, fixed: true },
          ...COLS.map(c => e(Text, { key: c.cle, style: [st.cellule, { width: c.largeur, fontFamily: 'Helvetica-Bold', color: 'white' }] }, c.cle)),
        ),
        ...r.lignes.map((l, i) => e(View, { key: i, style: [st.rangee, i % 2 === 1 ? { backgroundColor: '#FAFAF7' } : {}], wrap: false },
          ...valeurs(l, i).map((v, j) => e(Text, { key: j, style: [st.cellule, { width: COLS[j].largeur }, j === 1 ? { fontFamily: 'Helvetica-Bold' } : {}, l.statut === 'Remboursé' ? { color: '#AAAAAA' } : {}] }, v)),
        )),
      ),
      e(View, { style: st.pied, fixed: true },
        e(Text, null, 'Yager Group – Famille Germain  ·  Rapport confidentiel — usage interne du groupe'),
        e(Text, { render: ({ pageNumber, totalPages }: { pageNumber: number; totalPages: number }) => `Page ${pageNumber} de ${totalPages}` }),
      ),
    ),
  )
}

export async function genererRapportBilletsLeaderPDF(r: RapportBilletsLeader): Promise<Buffer> {
  return renderToBuffer(React.createElement(RapportPDF, { r }) as any)
}

export function nomFichierRapport(r: RapportBilletsLeader) {
  const morceaux = ['rapport-billets', r.evenement.titre !== 'Tous les événements' ? r.evenement.titre : '', r.groupe ?? '']
    .filter(Boolean).join('-')
  return `${morceaux.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-zA-Z0-9]+/g, '-').replace(/-+$/, '').toLowerCase()}.pdf`
}
