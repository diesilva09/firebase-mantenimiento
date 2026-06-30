import { NextResponse } from 'next/server'
import { query } from '@/lib/db'
import { requireAdminFromRequest } from '@/lib/auth-server'

// GET /api/archivos?id={id} - Recupera y sirve el archivo binario
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const idStr = searchParams.get('id')
    const metadataOnly = searchParams.get('metadata') === '1'

    if (!idStr) {
      return NextResponse.json({ error: 'ID de archivo requerido' }, { status: 400 })
    }

    const id = parseInt(idStr, 10)
    if (isNaN(id)) {
      return NextResponse.json({ error: 'ID de archivo inválido' }, { status: 400 })
    }

    const { rows } = await query(
      metadataOnly
        ? 'SELECT nombre, mime_type FROM archivos WHERE id = $1'
        : 'SELECT nombre, mime_type, contenido FROM archivos WHERE id = $1',
      [id]
    )

    if (rows.length === 0) {
      return NextResponse.json({ error: 'Archivo no encontrado' }, { status: 404 })
    }

    const file = rows[0]

    if (metadataOnly) {
      return NextResponse.json({
        id,
        nombre: file.nombre,
        mimeType: file.mime_type,
      })
    }

    // Construir la respuesta con el binario y las cabeceras correctas
    const headers = new Headers()
    headers.set('Content-Type', file.mime_type)
    headers.set(
      'Content-Disposition',
      `inline; filename="${encodeURIComponent(file.nombre)}"`
    )
    headers.set('Cache-Control', 'public, max-age=31536000, immutable')

    return new Response(file.contenido, {
      status: 200,
      headers,
    })
  } catch (error) {
    console.error('Error recuperando archivo de la BD:', error)
    return NextResponse.json({ error: 'Error recuperando archivo' }, { status: 500 })
  }
}

// POST /api/archivos - Sube un archivo a la base de datos (BYTEA)
export async function POST(req: Request) {
  try {
    const formData = await req.formData()
    const file = formData.get('file') as File | null

    if (!file) {
      return NextResponse.json({ error: 'No se subió ningún archivo' }, { status: 400 })
    }

    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)
    const nombre = file.name
    const mimeType = file.type

    // Guardar en la tabla archivos
    const { rows } = await query(
      'INSERT INTO archivos (nombre, mime_type, contenido) VALUES ($1, $2, $3) RETURNING id',
      [nombre, mimeType, buffer]
    )

    const fileId = rows[0].id
    const fileUrl = `/api/archivos?id=${fileId}&name=${encodeURIComponent(nombre)}`

    return NextResponse.json({
      id: fileId,
      url: fileUrl,
      nombre,
      mimeType,
    })
  } catch (error) {
    console.error('Error subiendo archivo a la BD:', error)
    return NextResponse.json({ error: 'Error subiendo archivo' }, { status: 500 })
  }
}

export async function DELETE(req: Request) {
  try {
    const authResult = await requireAdminFromRequest(req)

    if (!authResult.ok) {
      return NextResponse.json({ error: authResult.message }, { status: authResult.status })
    }

    if (authResult.role !== 'JEFE') {
      return NextResponse.json(
        { error: 'Solo el jefe puede eliminar archivos adjuntos' },
        { status: 403 }
      )
    }

    const { searchParams } = new URL(req.url)
    const idStr = searchParams.get('id')

    if (!idStr) {
      return NextResponse.json({ error: 'ID de archivo requerido' }, { status: 400 })
    }

    const id = parseInt(idStr, 10)
    if (isNaN(id)) {
      return NextResponse.json({ error: 'ID de archivo inválido' }, { status: 400 })
    }

    const { rows } = await query('DELETE FROM archivos WHERE id = $1 RETURNING id, nombre', [id])

    if (rows.length === 0) {
      return NextResponse.json({ error: 'Archivo no encontrado' }, { status: 404 })
    }

    return NextResponse.json({
      id: rows[0].id,
      nombre: rows[0].nombre,
      message: 'Archivo eliminado correctamente',
    })
  } catch (error) {
    console.error('Error eliminando archivo de la BD:', error)
    return NextResponse.json({ error: 'Error eliminando archivo' }, { status: 500 })
  }
}
