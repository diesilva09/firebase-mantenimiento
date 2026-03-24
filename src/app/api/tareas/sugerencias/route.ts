import { NextResponse } from 'next/server'
import { query } from '@/lib/db'

export async function GET(req: Request) {
  if (!process.env.DATABASE_URL) {
    return NextResponse.json({ data: [] })
  }

  try {
    const { searchParams } = new URL(req.url)
    const rawQuery = (searchParams.get('query') || '').trim()

    if (!rawQuery || rawQuery.length < 3) {
      return NextResponse.json({ data: [] })
    }

    const likePattern = `%${rawQuery}%`

    const result = await query(
      `SELECT descripcion, COUNT(*) AS usos
       FROM tareas_cronograma
       WHERE descripcion IS NOT NULL AND descripcion ILIKE $1
       GROUP BY descripcion
       ORDER BY usos DESC, descripcion ASC
       LIMIT 10`,
      [likePattern],
    )

    const sugerencias = result.rows
      .map((row: any) => String(row.descripcion))
      .filter((desc, index, self) => desc.trim().length > 0 && self.indexOf(desc) === index)

    return NextResponse.json({ data: sugerencias })
  } catch (err) {
    console.error('Error obteniendo sugerencias de descripcion:', err)
    return NextResponse.json({ data: [] })
  }
}
