'use client'

export default function BoutonImprimer() {
  return (
    <button onClick={() => window.print()} style={{ backgroundColor: '#C9A84C', color: '#1A2535', border: 'none', borderRadius: 8, padding: '8px 18px', fontWeight: 'bold', fontSize: 15, cursor: 'pointer' }}>
      🖨️ Imprimer / Enregistrer en PDF
    </button>
  )
}
