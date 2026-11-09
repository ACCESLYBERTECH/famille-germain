import { NextResponse } from 'next/server'
import { supabaseAdmin, verifierAcces } from '@/lib/reconnaissancesServeur'
import { LONGUEURS, trouverDoublon, cleNumero } from '@/lib/reconnaissances'

const texte = (v: unknown, max: number) => (typeof v === 'string' ? v.trim().replace(/\s+/g, ' ').slice(0, max) : '')

// Ajouter ou modifier une personne reconnue en virtuel
export async function POST(request: Request) {
  try {
    const corps = await request.json()
    const acces = await verifierAcces(corps.evenement_id)
    if (!acces.ok) return NextResponse.json({ error: acces.erreur }, { status: acces.statut })

    const nom = texte(corps.nom, LONGUEURS.nom)
    if (!nom) return NextResponse.json({ error: 'Le nom est obligatoire.' }, { status: 400 })
    const ville = texte(corps.ville, LONGUEURS.lieu)
    if (!ville) return NextResponse.json({ error: 'La ville est obligatoire.' }, { status: 400 })

    // Reconnaissances cochées : seulement des reconnaissances actives qui existent
    const demandes: string[] = Array.isArray(corps.type_ids) ? corps.type_ids.filter((t: unknown) => typeof t === 'string') : []
    const { data: types } = demandes.length > 0
      ? await supabaseAdmin.from('reconnaissance_types').select('id').in('id', demandes).eq('actif', true)
      : { data: [] as { id: string }[] }
    const typeIds = (types ?? []).map(t => t.id)
    const autre = texte(corps.autre, LONGUEURS.autre)
    if (typeIds.length === 0 && !autre) {
      return NextResponse.json({ error: 'Cochez au moins une reconnaissance (ou remplissez « Autre »).' }, { status: 400 })
    }

    // Le groupe du leader (lui-même + ses PCI + ses leaders en dessous)
    const { data: groupe } = acces.estAdmin
      ? { data: [] as { compte_id: string }[] }
      : await supabaseAdmin.rpc('get_groupe_ids', { leader_uuid: acces.userId })
    const idsGroupe = new Set<string>([acces.userId, ...(groupe ?? []).map((r: { compte_id: string }) => r.compte_id)])

    // Le PCI choisi dans la liste doit faire partie de son groupe (sinon on garde seulement ce qui est écrit)
    let compteId: string | null = typeof corps.compte_id === 'string' ? corps.compte_id : null
    if (compteId && !acces.estAdmin && !idsGroupe.has(compteId)) compteId = null

    // Numéro de PCI : celui du compte choisi (fiable), sinon celui écrit à la main (obligatoire)
    let numero = cleNumero(typeof corps.numero_amway === 'string' ? corps.numero_amway : '')
    if (compteId) {
      const { data: compteChoisi } = await supabaseAdmin.from('comptes').select('numero_amway').eq('id', compteId).single()
      numero = cleNumero(compteChoisi?.numero_amway) || numero
    }
    if (!numero) return NextResponse.json({ error: 'Le numéro de PCI est obligatoire.' }, { status: 400 })
    if (numero.length > 20) return NextResponse.json({ error: 'Numéro de PCI invalide.' }, { status: 400 })

    // Pas deux fois le même numéro de PCI pour la même conférence, dans SON organisation
    // (lui-même et ses leaders en dessous). Entre deux organisations, rien n'est révélé :
    // l'admin voit les doublons dans son rapport.
    let requete = supabaseAdmin
      .from('reconnaissances_virtuel')
      .select('id, compte_id, numero_amway, nom, leader_id')
      .eq('evenement_id', acces.evenement.id)
    if (!acces.estAdmin) {
      const { data: leadersGroupe } = await supabaseAdmin.from('comptes').select('id').in('id', Array.from(idsGroupe)).eq('role', 'leader')
      requete = requete.in('leader_id', [acces.userId, ...(leadersGroupe ?? []).map(l => l.id)])
    }
    const { data: existantes } = await requete
    const doublon = trouverDoublon(existantes ?? [], { compte_id: compteId, numero_amway: numero }, typeof corps.id === 'string' ? corps.id : undefined)
    if (doublon) {
      if (doublon.leader_id === acces.userId) {
        return NextResponse.json({ error: `${doublon.nom} (#${numero}) est déjà dans vos entrées pour cette conférence.`, doublonId: doublon.id }, { status: 409 })
      }
      const { data: autreLeader } = await supabaseAdmin.from('comptes').select('prenom_1, nom_1').eq('id', doublon.leader_id).single()
      return NextResponse.json({ error: `${doublon.nom} (#${numero}) est déjà inscrit(e) par ${autreLeader ? `${autreLeader.prenom_1} ${autreLeader.nom_1}` : 'un de vos leaders'} pour cette conférence.` }, { status: 409 })
    }

    const valeurs = {
      compte_id: compteId,
      nom,
      nom_2: texte(corps.nom_2, LONGUEURS.nom) || null,
      numero_amway: numero,
      ville,
      province: texte(corps.province, LONGUEURS.lieu) || null,
      pays: texte(corps.pays, LONGUEURS.lieu) || null,
      type_ids: typeIds,
      autre: autre || null,
      modifie_le: new Date().toISOString(),
    }

    if (typeof corps.id === 'string') {
      // Modification : seulement ses propres entrées (l'admin peut tout modifier)
      const { data: existante } = await supabaseAdmin.from('reconnaissances_virtuel').select('leader_id, evenement_id').eq('id', corps.id).single()
      if (!existante || existante.evenement_id !== acces.evenement.id) return NextResponse.json({ error: 'Entrée introuvable' }, { status: 404 })
      if (!acces.estAdmin && existante.leader_id !== acces.userId) {
        return NextResponse.json({ error: 'Vous pouvez modifier seulement vos propres entrées.' }, { status: 403 })
      }
      const { data, error } = await supabaseAdmin.from('reconnaissances_virtuel').update(valeurs).eq('id', corps.id).select().single()
      if (error) return NextResponse.json({ error: error.message }, { status: 500 })
      return NextResponse.json({ entree: data })
    }

    const { data, error } = await supabaseAdmin
      .from('reconnaissances_virtuel')
      .insert({ ...valeurs, evenement_id: acces.evenement.id, leader_id: acces.userId })
      .select()
      .single()
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ entree: data })
  } catch (error: any) {
    console.error('Erreur reconnaissance virtuel:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// Retirer une personne
export async function DELETE(request: Request) {
  try {
    const id = new URL(request.url).searchParams.get('id')
    if (!id) return NextResponse.json({ error: 'id requis' }, { status: 400 })
    const { data: existante } = await supabaseAdmin.from('reconnaissances_virtuel').select('leader_id, evenement_id').eq('id', id).single()
    if (!existante) return NextResponse.json({ error: 'Entrée introuvable' }, { status: 404 })

    const acces = await verifierAcces(existante.evenement_id)
    if (!acces.ok) return NextResponse.json({ error: acces.erreur }, { status: acces.statut })
    if (!acces.estAdmin && existante.leader_id !== acces.userId) {
      return NextResponse.json({ error: 'Vous pouvez retirer seulement vos propres entrées.' }, { status: 403 })
    }
    const { error } = await supabaseAdmin.from('reconnaissances_virtuel').delete().eq('id', id)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Erreur retrait reconnaissance:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
