import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'

const supabaseAdmin = createAdminClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

    const { data: compte } = await supabase.from('comptes').select('role').eq('id', user.id).single()
    if (compte?.role !== 'admin') return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

    const { searchParams } = new URL(request.url)
    const evenementId = searchParams.get('evenement_id') ?? ''
    const leaderId = searchParams.get('leader_id') ?? ''
    const filtreBanquet = searchParams.get('filtre_banquet') ?? 'tous'

    const { data: leaders } = await supabaseAdmin
      .from('comptes')
      .select('id, prenom_1, nom_1')
      .eq('role', 'leader')
      .eq('statut', 'actif')

    let billetsQuery = supabaseAdmin
      .from('billets')
      .select('*, evenements(id, nom, a_banquet), comptes!billets_compte_id_fkey(prenom_1, nom_1, courriel, leader_id)')
      .neq('statut', 'rembourse')

    if (evenementId) {
      billetsQuery = billetsQuery.eq('evenement_id', evenementId)
    } else {
      const { data: evIds } = await supabaseAdmin.from('evenements').select('id').eq('a_banquet', true)
      const ids = (evIds ?? []).map((e: any) => e.id)
      if (ids.length > 0) billetsQuery = billetsQuery.in('evenement_id', ids)
    }

    const { data: billets } = await billetsQuery.order('created_at', { ascending: false })

    const billetIds = (billets ?? []).map((b: any) => b.id)
    const { data: banquetsAchetes } = billetIds.length > 0
      ? await supabaseAdmin.from('billets_banquets').select('*').in('billet_id', billetIds).neq('statut', 'rembourse')
      : { data: [] }

    let billetsFiltres = billets ?? []
    if (leaderId) billetsFiltres = billetsFiltres.filter((b: any) => b.comptes?.leader_id === leaderId)

    const lignes = billetsFiltres.map((billet: any) => {
      const banquetAchete = billet.est_sans_frais
        ? (banquetsAchetes ?? []).find((b: any) => b.billet_id === billet.id)
        : null
      const aBanquet = !billet.est_sans_frais || !!banquetAchete
      const allergiesRaw = billet.est_sans_frais ? banquetAchete?.allergies : billet.allergies
      const allergies = allergiesRaw ? JSON.parse(allergiesRaw).join(', ') : 'Aucune'
      const leaderNom = leaders?.find((l: any) => l.id === billet.comptes?.leader_id)
      return { billet, aBanquet, allergies, leaderNom }
    }).filter((l: any) => {
      if (filtreBanquet === 'avec') return l.aBanquet
      if (filtreBanquet === 'sans') return !l.aBanquet
      return true
    })

    // Générer HTML pour le PDF (on utilise une page HTML imprimable)
    const dateGeneration = new Date().toLocaleDateString('fr-CA', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })
    const totalAvec = lignes.filter((l: any) => l.aBanquet).length
    const totalSans = lignes.filter((l: any) => !l.aBanquet).length

    const html = `<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="UTF-8">
<title>Rapport Banquets</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: Arial, sans-serif; font-size: 11px; color: #1A2535; padding: 20px; }
  .header { background-color: #1A2535; color: white; padding: 20px 24px; border-radius: 8px; margin-bottom: 20px; }
  .header h1 { font-size: 20px; font-weight: bold; margin-bottom: 4px; }
  .header p { font-size: 12px; opacity: 0.8; }
  .header .date { font-size: 10px; opacity: 0.6; margin-top: 8px; }
  .stats { display: flex; gap: 12px; margin-bottom: 20px; }
  .stat { flex: 1; background: #F5F3EE; border-radius: 8px; padding: 12px; text-align: center; }
  .stat .num { font-size: 24px; font-weight: bold; color: #1A2535; }
  .stat .label { font-size: 10px; color: #666; margin-top: 2px; }
  .stat.vert .num { color: #4CAF7D; }
  .stat.rouge .num { color: #E57373; }
  table { width: 100%; border-collapse: collapse; margin-top: 8px; }
  thead { background-color: #1A2535; color: white; }
  th { padding: 8px 10px; text-align: left; font-size: 10px; font-weight: bold; }
  td { padding: 7px 10px; border-bottom: 1px solid #E0E0E0; font-size: 10px; vertical-align: top; }
  tr:nth-child(even) { background-color: #FAFAFA; }
  .badge { display: inline-block; padding: 2px 6px; border-radius: 10px; font-size: 9px; font-weight: bold; }
  .badge-sf { background: #E8F5E9; color: #4CAF7D; }
  .badge-reg { background: #E3F2FD; color: #2E86C1; }
  .badge-avec { background: #E8F5E9; color: #4CAF7D; }
  .badge-sans { background: #FFF3E0; color: #E57373; }
  .badge-virt { background: #E3F2FD; color: #2E86C1; }
  .badge-place { background: #F5F3EE; color: #666; }
  .allergies { color: #E57373; font-style: italic; }
  .aucune { color: #999; }
  .gold { color: #C9A84C; }
  @media print {
    body { padding: 10px; }
    .no-print { display: none; }
  }
</style>
</head>
<body>

<div class="header">
  <h1>🍽️ Rapport Banquets</h1>
  <p>Famille Germain – Yager Group</p>
  <p class="date">Généré le ${dateGeneration}</p>
</div>

<div class="stats">
  <div class="stat">
    <div class="num">${lignes.length}</div>
    <div class="label">Total billets</div>
  </div>
  <div class="stat vert">
    <div class="num">${totalAvec}</div>
    <div class="label">Avec banquet</div>
  </div>
  <div class="stat rouge">
    <div class="num">${totalSans}</div>
    <div class="label">Sans banquet</div>
  </div>
</div>

<table>
  <thead>
    <tr>
      <th>Nom PCI</th>
      <th>Leader</th>
      <th>Type</th>
      <th>Banquet</th>
      <th>Mode</th>
      <th>Allergies</th>
    </tr>
  </thead>
  <tbody>
    ${lignes.map((l: any) => `
    <tr>
      <td>
        <strong>${l.billet.nom_pci}</strong><br>
        <span style="color:#999;font-size:9px">${l.billet.comptes?.courriel ?? ''}</span>
      </td>
      <td>${l.leaderNom ? `${l.leaderNom.prenom_1} ${l.leaderNom.nom_1}` : '<span style="color:#999">Aucun</span>'}</td>
      <td><span class="badge ${l.billet.est_sans_frais ? 'badge-sf' : 'badge-reg'}">${l.billet.est_sans_frais ? 'Sans frais' : 'Régulier'}</span></td>
      <td><span class="badge ${l.aBanquet ? 'badge-avec' : 'badge-sans'}">${l.aBanquet ? '✓ Avec' : '✗ Sans'}</span></td>
      <td><span class="badge ${l.billet.mode_participation === 'virtuel' ? 'badge-virt' : 'badge-place'}">${l.billet.mode_participation === 'virtuel' ? 'Virtuel' : 'Sur place'}</span></td>
      <td class="${l.allergies !== 'Aucune' ? 'allergies' : 'aucune'}">${l.allergies}</td>
    </tr>`).join('')}
  </tbody>
</table>

</body>
</html>`

    return new NextResponse(html, {
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'Content-Disposition': `attachment; filename="rapport-banquets.html"`,
      },
    })

  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}