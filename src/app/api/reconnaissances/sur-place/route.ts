import { NextResponse } from 'next/server'
import { supabaseAdmin, verifierAcces } from '@/lib/reconnaissancesServeur'

// Enregistrer les nombres « sur place » du leader pour un événement (toutes les villes d'un coup)
export async function POST(request: Request) {
  try {
    const corps = await request.json()
    const acces = await verifierAcces(corps.evenement_id)
    if (!acces.ok) return NextResponse.json({ error: acces.erreur }, { status: acces.statut })

    const [{ data: villes }, { data: types }] = await Promise.all([
      supabaseAdmin.from('evenement_villes').select('id').eq('evenement_id', acces.evenement.id),
      supabaseAdmin.from('reconnaissance_types').select('id').eq('actif', true),
    ])
    const villesValides = new Set((villes ?? []).map(v => v.id))
    const typesValides = new Set((types ?? []).map(t => t.id))
    const sansVilles = villesValides.size === 0

    const lignes: { ville_id: string | null; type_id: string; nombre: number }[] = []
    for (const l of Array.isArray(corps.lignes) ? corps.lignes : []) {
      const nombre = Math.floor(Number(l?.nombre))
      if (!Number.isFinite(nombre) || nombre <= 0) continue
      if (nombre > 9999) return NextResponse.json({ error: 'Nombre trop grand (maximum 9999).' }, { status: 400 })
      const villeId = sansVilles ? null : (typeof l.ville_id === 'string' && villesValides.has(l.ville_id) ? l.ville_id : undefined)
      if (villeId === undefined || !typesValides.has(l?.type_id)) continue
      lignes.push({ ville_id: villeId, type_id: l.type_id, nombre })
    }

    // On remplace toutes les lignes du leader pour cet événement
    const { error: erreurRetrait } = await supabaseAdmin
      .from('reconnaissances_sur_place')
      .delete()
      .eq('evenement_id', acces.evenement.id)
      .eq('leader_id', acces.userId)
    if (erreurRetrait) return NextResponse.json({ error: erreurRetrait.message }, { status: 500 })

    if (lignes.length > 0) {
      const { error } = await supabaseAdmin.from('reconnaissances_sur_place').insert(
        lignes.map(l => ({ ...l, evenement_id: acces.evenement.id, leader_id: acces.userId }))
      )
      if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true, total: lignes.reduce((s, l) => s + l.nombre, 0) })
  } catch (error: any) {
    console.error('Erreur reconnaissances sur place:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
