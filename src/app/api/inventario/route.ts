import { NextResponse } from "next/server"
import { query } from "@/lib/db"
import { requireAdminFromRequest } from "@/lib/auth-server"

// Fallback en memoria si no hay DATABASE_URL (modo demo)
const FALLBACK_REPUESTOS: any[] = []

export async function GET() {
  if (!process.env.DATABASE_URL) {
    return NextResponse.json({
      data: FALLBACK_REPUESTOS,
      message: "No database configured, returning fallback data",
    })
  }

  try {
    const { rows } = await query(
      `SELECT
        id,
        codigo,
        nombre,
        categoria,
        subcategoria,
        descripcion,
        codigo_compra,
        proveedor,
        stock_maximo,
        stock_minimo,
        -- no existe stock_actual ni ubicacion en el esquema actual; devolvemos alias/NULL para compatibilidad
        stock_maximo AS stock_actual,
        NULL AS ubicacion,
        precio,
        imagen_url,
        created_at,
        updated_at
       FROM repuestos_inventario
       ORDER BY created_at DESC`
    )

    return NextResponse.json({ data: rows })
  } catch (err) {
    console.error("Error consultando inventario:", err)
    return NextResponse.json(
      { error: "Error consultando inventario en la base de datos" },
      { status: 500 }
    )
  }
}

export async function POST(req: Request) {
  const check = await requireAdminFromRequest(req)
  if (!check.ok) {
    return NextResponse.json({ error: check.message }, { status: check.status })
  }


  if (!process.env.DATABASE_URL) {
    try {
      const body = await req.json()
      const now = new Date().toISOString()
      const newItem = {
        id: `local-${Date.now()}`,
        codigo: body.codigo,
        nombre: body.nombre || null,
        categoria: body.categoria,
        subcategoria: body.subcategoria || null,
        descripcion: body.descripcion || "",

        codigo_compra: body.codigoCompra || null,
        proveedor: body.proveedor || null,
        stock_maximo: body.stockMaximo ?? 0,
        stock_minimo: body.stockMinimo ?? 0,
        imagen_url: body.imagenUrl || null,
        created_at: now,
        updated_at: now,
      }
      FALLBACK_REPUESTOS.unshift(newItem)
      return NextResponse.json(newItem, { status: 201 })
    } catch {
      return NextResponse.json({ error: "Invalid payload" }, { status: 400 })
    }
  }

  try {
    const body = await req.json()

    const { rows } = await query(
      `INSERT INTO repuestos_inventario (
        codigo,
        nombre,
        categoria,
        subcategoria,
        descripcion,
        codigo_compra,
        proveedor,
        stock_maximo,
        stock_minimo,
        imagen_url,
        precio
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11
      )
      RETURNING
        id,
        codigo,
        nombre,
        categoria,
        subcategoria,
        descripcion,
        codigo_compra,
        proveedor,
        stock_maximo,
        stock_minimo,
        imagen_url,
        precio,
        created_at,
        updated_at`,
      [
        body.codigo,
        body.nombre || null,
        body.categoria,
        body.subcategoria || null,
        body.descripcion || "",

        body.codigoCompra || null,
        body.proveedor || null,
        body.stockMaximo ?? 0,
        body.stockMinimo ?? 0,
        body.imagenUrl || null,
        body.precio ?? 0,
      ]
    )

    // Añadir compatibilidad: exponer stock_actual igual a stock_maximo si el cliente lo espera
    if (rows[0]) {
      rows[0].stock_actual = rows[0].stock_maximo
    }

    return NextResponse.json(rows[0], { status: 201 })
  } catch (err) {
    console.error("Error insertando repuesto:", err)
    return NextResponse.json(
      { error: "Error guardando repuesto en la base de datos" },
      { status: 500 }
    )
  }
}

export async function PUT(req: Request) {
  const check = await requireAdminFromRequest(req)
  if (!check.ok) {
    return NextResponse.json({ error: check.message }, { status: check.status })
  }

  if (!process.env.DATABASE_URL) {
    return NextResponse.json(
      { error: "Database not configured" },
      { status: 500 }
    )
  }

  try {
    const body = await req.json()
    const { id, ...updateData } = body

    if (!id) {
      return NextResponse.json({ error: "ID is required" }, { status: 400 })
    }

    const { rows } = await query(
      `UPDATE repuestos_inventario
       SET
        codigo       = $1,
        nombre       = $2,
        categoria    = $3,
        subcategoria = $4,
        descripcion  = $5,
        codigo_compra= $6,
        proveedor    = $7,
        stock_maximo = $8,
        stock_minimo = $9,
        imagen_url   = $10,
        precio       = $11,
        updated_at   = NOW()
       WHERE id = $12
       RETURNING *`,
      [
        updateData.codigo,
        updateData.nombre || null,
        updateData.categoria,
        updateData.subcategoria || null,
        updateData.descripcion || "",

        updateData.codigoCompra || null,
        updateData.proveedor || null,
        updateData.stockMaximo ?? 0,
        updateData.stockMinimo ?? 0,
        updateData.imagenUrl || null,
        updateData.precio ?? 0,
        id,
      ]
    )

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

export async function DELETE(req: Request) {
  const check = await requireAdminFromRequest(req)
  if (!check.ok) {
    return NextResponse.json({ error: check.message }, { status: check.status })
  }

  if (!process.env.DATABASE_URL) {
    return NextResponse.json(
      { error: "Database not configured" },
      { status: 500 }
    )
  }

  try {
    const { searchParams } = new URL(req.url)
    const id = searchParams.get("id")

    if (!id) {
      return NextResponse.json({ error: "ID is required" }, { status: 400 })
    }

    const numericId = parseInt(id, 10)
    if (isNaN(numericId)) {
      return NextResponse.json(
        { error: "Invalid ID format" },
        { status: 400 }
      )
    }

    const check = await query(
      "SELECT id, codigo FROM repuestos_inventario WHERE id = $1",
      [numericId]
    )

    if (check.rows.length === 0) {
      return NextResponse.json({ error: "Repuesto no encontrado" }, { status: 404 })
    }

    // Eliminar primero los usos asociados a este repuesto para no violar la foreign key
    await query(
      "DELETE FROM repuestos_uso_solicitudes WHERE repuesto_id = $1",
      [numericId]
    )

    const result = await query(
      "DELETE FROM repuestos_inventario WHERE id = $1 RETURNING id, codigo",
      [numericId]
    )

    return NextResponse.json({
      message: "Repuesto eliminado",
      data: result.rows[0],
    })
  } catch (err) {
    console.error("Error eliminando repuesto:", err)
    return NextResponse.json(
      { error: "Error eliminando repuesto" },
      { status: 500 }
    )
  }
}
