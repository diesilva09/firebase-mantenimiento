import { NextResponse } from "next/server"
import { query } from "@/lib/db"

// GET /api/repuestos?codigo_equipo=EQ-001
export async function GET(req: Request) {
  if (!process.env.DATABASE_URL) {
    return NextResponse.json({ data: [], message: "No database configured" })
  }

  try {
    const { searchParams } = new URL(req.url)
    const codigo_equipo = searchParams.get("codigo_equipo")

    if (!codigo_equipo) {
      return NextResponse.json(
        { error: "codigo_equipo es requerido" },
        { status: 400 }
      )
    }

    const { rows } = await query(
      `SELECT
         id,
         codigo_equipo,
         codigo_repuesto,
         nombre,
         descripcion,
         cantidad,
         precio,
         ubicacion,
         foto_url,
         creado_en
       FROM repuestos
       WHERE codigo_equipo = $1
       ORDER BY creado_en DESC`,
      [codigo_equipo]
    )

    // Debug: verificar qué se está devolviendo
    console.log('Repuestos desde DB:', rows.map(r => ({ id: r.id, nombre: r.nombre, precio: r.precio, tipo_precio: typeof r.precio })))

    return NextResponse.json({ data: rows })
  } catch (err) {
    console.error("Error consultando repuestos:", err)
    return NextResponse.json(
      { error: "Error consultando repuestos" },
      { status: 500 }
    )
  }
}

// POST /api/repuestos
export async function POST(req: Request) {
  if (!process.env.DATABASE_URL) {
    return NextResponse.json({ error: "Database not configured" }, { status: 500 })
  }

  try {
    const body = await req.json()

    // Debug: ver qué se está recibiendo
    console.log('POST repuesto - body recibido:', body)
    console.log('POST repuesto - precio recibido:', body.precio, 'tipo:', typeof body.precio)

    const precioValue = body.precio !== null && body.precio !== undefined && body.precio !== '' 
      ? (typeof body.precio === 'string' ? parseFloat(body.precio) : Number(body.precio))
      : null

    console.log('POST repuesto - precio procesado:', precioValue)

    const { rows } = await query(
      `INSERT INTO repuestos (
         codigo_equipo,
         codigo_repuesto,
         nombre,
         descripcion,
         cantidad,
         precio,
         ubicacion,
         foto_url,
         creado_en
       ) VALUES (
         $1, $2, $3, $4, $5, $6, $7, $8, NOW()
       )
       RETURNING
         id,
         codigo_equipo,
         codigo_repuesto,
         nombre,
         descripcion,
         cantidad,
         precio,
         ubicacion,
         foto_url,
         creado_en`,
      [
        body.codigoEquipo,
        body.codigoRepuesto,
        body.nombre,
        body.descripcion || null,
        body.cantidad ?? 0,
        precioValue,
        body.ubicacion || null,
        body.fotoUrl || null,
      ]
    )

    console.log('POST repuesto - respuesta DB:', rows[0], 'precio en respuesta:', rows[0]?.precio, 'tipo:', typeof rows[0]?.precio)

    return NextResponse.json(rows[0], { status: 201 })
  } catch (err) {
    console.error("Error insertando repuesto:", err)
    return NextResponse.json(
      { error: "Error guardando repuesto" },
      { status: 500 }
    )
  }
}

// PUT /api/repuestos
export async function PUT(req: Request) {
  if (!process.env.DATABASE_URL) {
    return NextResponse.json({ error: "Database not configured" }, { status: 500 })
  }

  try {
    const body = await req.json()
    const { id } = body

    if (!id) {
      return NextResponse.json({ error: "ID es requerido" }, { status: 400 })
    }

    // Debug: ver qué se está recibiendo
    console.log('PUT repuesto - body recibido:', body)
    console.log('PUT repuesto - precio recibido:', body.precio, 'tipo:', typeof body.precio)

    const precioValue = body.precio !== null && body.precio !== undefined && body.precio !== '' 
      ? (typeof body.precio === 'string' ? parseFloat(body.precio) : Number(body.precio))
      : null

    console.log('PUT repuesto - precio procesado:', precioValue)

    const { rows } = await query(
      `UPDATE repuestos
       SET
         codigo_repuesto = $1,
         nombre = $2,
         descripcion = $3,
         cantidad = $4,
         precio = $5,
         ubicacion = $6,
         foto_url = $7
       WHERE id = $8
       RETURNING
         id,
         codigo_equipo,
         codigo_repuesto,
         nombre,
         descripcion,
         cantidad,
         precio,
         ubicacion,
         foto_url,
         creado_en`,
      [
        body.codigoRepuesto,
        body.nombre,
        body.descripcion || null,
        body.cantidad ?? 0,
        precioValue,
        body.ubicacion || null,
        body.fotoUrl || null,
        id,
      ]
    )

    console.log('PUT repuesto - respuesta DB:', rows[0], 'precio en respuesta:', rows[0]?.precio, 'tipo:', typeof rows[0]?.precio)

    if (rows.length === 0) {
      return NextResponse.json({ error: "Repuesto no encontrado" }, { status: 404 })
    }

    return NextResponse.json(rows[0])

    if (rows.length === 0) {
      return NextResponse.json({ error: "Repuesto no encontrado" }, { status: 404 })
    }

    return NextResponse.json(rows[0])
  } catch (err) {
    console.error("Error actualizando repuesto:", err)
    return NextResponse.json(
      { error: "Error actualizando repuesto" },
      { status: 500 }
    )
  }
}

// DELETE /api/repuestos?id=123
export async function DELETE(req: Request) {
  if (!process.env.DATABASE_URL) {
    return NextResponse.json({ error: "Database not configured" }, { status: 500 })
  }

  try {
    const { searchParams } = new URL(req.url)
    const id = searchParams.get("id")

    if (!id) {
      return NextResponse.json({ error: "ID es requerido" }, { status: 400 })
    }

    const numericId = parseInt(id)
    if (isNaN(numericId)) {
      return NextResponse.json({ error: "Formato de ID inválido" }, { status: 400 })
    }

    const { rows } = await query(
      `DELETE FROM repuestos
       WHERE id = $1
       RETURNING id, codigo_equipo, codigo_repuesto, nombre`,
      [numericId]
    )

    if (rows.length === 0) {
      return NextResponse.json({ error: "Repuesto no encontrado" }, { status: 404 })
    }

    return NextResponse.json({
      message: "Repuesto eliminado",
      deleted: rows[0],
    })
  } catch (err) {
    console.error("Error eliminando repuesto:", err)
    return NextResponse.json(
      { error: "Error eliminando repuesto" },
      { status: 500 }
    )
  }
}