import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'
import { chargerRapportBanquets } from '@/lib/rapportBanquets'

// Protège le HTML contre les caractères spéciaux saisis par les utilisateurs (noms, allergies...)
function esc(valeur: unknown): string {
  return String(valeur ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

// Rapport banquets imprimable (Lettre paysage) avec boutons Imprimer et Envoyer
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

    const { data: compte } = await supabase.from('comptes').select('role').eq('id', user.id).single()
    if (compte?.role !== 'admin') return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

    const { searchParams } = new URL(request.url)
    const filtres = {
      evenementId: searchParams.get('evenement_id') ?? '',
      leaderId: searchParams.get('leader_id') ?? '',
      filtreBanquet: searchParams.get('filtre_banquet') ?? 'tous',
    }

    const r = await chargerRapportBanquets(filtres)

    const optionsLeaders = r.leadersActifs
      .map(l => `<option value="${esc(l.id)}">${esc(l.nom)}</option>`)
      .join('')

    const html = `<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="UTF-8">
<title>Rapport Banquets</title>
<style>
  /* Format Lettre paysage (11 x 8,5 po) */
  @page { size: letter landscape; margin: 0.4in; }
  * { margin: 0; padding: 0; box-sizing: border-box; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  body { font-family: Arial, sans-serif; font-size: 11px; color: #1A2535; padding: 20px; background: #E9E6DF; }
  .page { max-width: 10.2in; margin: 0 auto; background: white; padding: 0.35in; border-radius: 6px; box-shadow: 0 2px 10px rgba(0,0,0,0.12); }
  .barre { position: sticky; top: 0; z-index: 10; max-width: 10.2in; margin: 0 auto 14px; display: flex; gap: 10px; justify-content: flex-end; }
  .btn { border: none; border-radius: 8px; padding: 10px 18px; font-size: 14px; font-weight: bold; cursor: pointer; }
  .btn:disabled { opacity: 0.5; cursor: default; }
  .btn-imprimer { background: #C9A84C; color: #1A2535; }
  .btn-envoyer { background: #2E86C1; color: white; }
  .btn-fermer { background: white; color: #666; }
  .panneau { display: none; max-width: 10.2in; margin: 0 auto 14px; background: white; border-radius: 8px; padding: 16px 18px; box-shadow: 0 2px 10px rgba(0,0,0,0.12); font-size: 14px; }
  .panneau.ouvert { display: block; }
  .panneau h2 { font-size: 15px; margin-bottom: 4px; }
  .panneau .aide { font-size: 12px; color: #666; margin-bottom: 12px; }
  .panneau .choix { display: flex; align-items: center; gap: 10px; margin-bottom: 10px; flex-wrap: wrap; }
  .panneau label { display: flex; align-items: center; gap: 6px; cursor: pointer; min-width: 140px; }
  .panneau select, .panneau input[type=email] { flex: 1; min-width: 260px; border: 1px solid #DDD; border-radius: 6px; padding: 8px 10px; font-size: 14px; }
  .panneau .actions { display: flex; align-items: center; gap: 12px; margin-top: 6px; }
  .message { font-size: 13px; font-weight: bold; }
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
  .stat.or .num { color: #C9A84C; }
  table { width: 100%; border-collapse: collapse; margin-top: 8px; }
  thead { background-color: #1A2535; color: white; display: table-header-group; }
  tr { page-break-inside: avoid; break-inside: avoid; }
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
  .pied { margin-top: 14px; font-size: 9px; color: #999; text-align: right; }
  @media print {
    body { padding: 0; background: white; }
    .page { max-width: none; padding: 0; box-shadow: none; border-radius: 0; }
    .no-print { display: none !important; }
  }
</style>
</head>
<body>

<div class="barre no-print">
  <button class="btn btn-fermer" onclick="window.close()">✕ Fermer</button>
  <button class="btn btn-envoyer" onclick="document.getElementById('panneau').classList.toggle('ouvert')">📧 Envoyer</button>
  <button class="btn btn-imprimer" onclick="window.print()">🖨️ Imprimer</button>
</div>

<div id="panneau" class="panneau no-print">
  <h2>📧 Envoyer ce rapport en PDF</h2>
  <p class="aide">Le PDF envoyé contient les mêmes filtres que ce rapport, <strong>sans les courriels des PCI</strong>.</p>
  <div class="choix">
    <label><input type="radio" name="dest" value="leader" checked onchange="choisir()"> Un leader</label>
    <select id="leader">${optionsLeaders || '<option value="">Aucun leader actif</option>'}</select>
  </div>
  <div class="choix">
    <label><input type="radio" name="dest" value="courriel" onchange="choisir()"> Autre courriel</label>
    <input type="email" id="courriel" placeholder="exemple@traiteur.com" disabled>
  </div>
  <div class="actions">
    <button class="btn btn-envoyer" id="btnEnvoyer" onclick="envoyer()">Envoyer le PDF</button>
    <span class="message" id="message"></span>
  </div>
</div>

<div class="page">
<div class="header">
  <h1>🍽️ Rapport Banquets</h1>
  <p>Famille Germain – Yager Group${r.sousTitre ? ' · ' + esc(r.sousTitre) : ''}</p>
  <p class="date">Généré le ${esc(r.dateGeneration)}</p>
</div>

<div class="stats">
  <div class="stat"><div class="num">${r.lignes.length}</div><div class="label">Total billets</div></div>
  <div class="stat vert"><div class="num">${r.totalAvec}</div><div class="label">Avec banquet</div></div>
  <div class="stat rouge"><div class="num">${r.totalSans}</div><div class="label">Sans banquet</div></div>
  <div class="stat or"><div class="num">${r.totalAllergies}</div><div class="label">Avec allergies</div></div>
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
    ${r.lignes.map(l => `
    <tr>
      <td><strong>${esc(l.nom)}</strong><br><span style="color:#999;font-size:9px">${esc(l.courriel)}</span></td>
      <td>${l.leader ? esc(l.leader) : '<span style="color:#999">Aucun</span>'}</td>
      <td><span class="badge ${l.sansFrais ? 'badge-sf' : 'badge-reg'}">${l.sansFrais ? 'Sans frais' : 'Régulier'}</span></td>
      <td><span class="badge ${l.aBanquet ? 'badge-avec' : 'badge-sans'}">${l.aBanquet ? '✓ Avec' : '✗ Sans'}</span></td>
      <td><span class="badge ${l.virtuel ? 'badge-virt' : 'badge-place'}">${l.virtuel ? 'Virtuel' : 'Sur place'}</span></td>
      <td class="${l.allergies !== 'Aucune' ? 'allergies' : 'aucune'}">${esc(l.allergies)}</td>
    </tr>`).join('')}
  </tbody>
</table>
<p class="pied">${r.lignes.length} billet${r.lignes.length !== 1 ? 's' : ''} · Document confidentiel — Famille Germain – Yager Group</p>
</div>

<script>
  var filtres = ${JSON.stringify({ evenement_id: filtres.evenementId, leader_id: filtres.leaderId, filtre_banquet: filtres.filtreBanquet }).replace(/</g, '\\u003c')};

  function choisir() {
    var parLeader = document.querySelector('input[name=dest]:checked').value === 'leader';
    document.getElementById('leader').disabled = !parLeader;
    document.getElementById('courriel').disabled = parLeader;
  }

  function afficher(texte, couleur) {
    var m = document.getElementById('message');
    m.textContent = texte;
    m.style.color = couleur;
  }

  async function envoyer() {
    var parLeader = document.querySelector('input[name=dest]:checked').value === 'leader';
    var corps = Object.assign({}, filtres);
    if (parLeader) {
      corps.destinataire_leader_id = document.getElementById('leader').value;
      if (!corps.destinataire_leader_id) { afficher('Choisissez un leader.', '#E57373'); return; }
    } else {
      corps.courriel = document.getElementById('courriel').value.trim();
      if (!corps.courriel) { afficher('Entrez une adresse courriel.', '#E57373'); return; }
    }
    var bouton = document.getElementById('btnEnvoyer');
    bouton.disabled = true;
    afficher('Envoi en cours...', '#666');
    try {
      var res = await fetch('/api/admin/rapport-banquets-envoyer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(corps),
      });
      var data = await res.json();
      if (res.ok) afficher('✓ Rapport envoyé à ' + data.email, '#4CAF7D');
      else afficher('Erreur : ' + (data.error || 'envoi impossible'), '#E57373');
    } catch (e) {
      afficher('Erreur : envoi impossible', '#E57373');
    }
    bouton.disabled = false;
  }
</script>

</body>
</html>`

    return new NextResponse(html, {
      headers: { 'Content-Type': 'text/html; charset=utf-8' },
    })

  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
