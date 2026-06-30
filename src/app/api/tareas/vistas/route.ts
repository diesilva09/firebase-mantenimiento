import { NextResponse } from 'next/server'
import { query } from '@/lib/db'

export async function GET(req: Request) {
  if (!process.env.DATABASE_URL) {
    return NextResponse.json({ data: [], message: 'Base de datos no configurada' }, { status: 500 })
  }

  try {
    const { searchParams } = new URL(req.url)
    const userEmail = searchParams.get('userEmail')

    if (!userEmail) {
      return NextResponse.json({ data: [], message: 'userEmail requerido' }, { status: 400 })
    }

    const { rows } = await query(
      'SELECT task_id FROM tareas_vistas WHERE user_email = $1',
      [userEmail]
    )

    const taskIds = rows.map((r: any) => r.task_id)
    return NextResponse.json({ data: taskIds })
  } catch (err) {
    console.error('Error obteniendo tareas vistas:', err)
    return NextResponse.json({ error: 'Error obteniendo tareas vistas' }, { status: 500 })
  }
}

export async function POST(req: Request) {
  if (!process.env.DATABASE_URL) {
    return NextResponse.json({ error: 'Base de datos no configurada' }, { status: 500 })
  }

  try {
    const body = await req.json()
    const userEmail: string | undefined = body.userEmail
    const taskIds: number[] | string[] | undefined = body.taskIds

    if (!userEmail || !Array.isArray(taskIds) || taskIds.length === 0) {
      return NextResponse.json({ error: 'userEmail y taskIds son requeridos' }, { status: 400 })
    }

    // Normalizar IDs a número
    const numericIds = taskIds.map((id) => Number(id)).filter((id) => Number.isFinite(id))
    if (numericIds.length === 0) {
      return NextResponse.json({ error: 'taskIds inválidos' }, { status: 400 })
    }

    // Construir consulta dinámica VALUES ($1, $2), ($3, $4), ...
    const values: (string | number)[] = []
    const valuesClauses: string[] = []

    numericIds.forEach((taskId, index) => {
      const baseIndex = index * 2
      valuesClauses.push(`($${baseIndex + 1}, $${baseIndex + 2})`)
      values.push(taskId, userEmail)
    })

    const sql = `
      INSERT INTO tareas_vistas (task_id, user_email)
      VALUES ${valuesClauses.join(', ')}
      ON CONFLICT (task_id, user_email) DO NOTHING
    `

    await query(sql, values)

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('Error marcando tareas como vistas:', err)
    return NextResponse.json({ error: 'Error marcando tareas como vistas' }, { status: 500 })
  }
}

