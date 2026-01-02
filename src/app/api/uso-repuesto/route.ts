import { NextResponse } from "next/server"
import { query } from "@/lib/db"
// Registra una solicitud de uso de repuesto (descuenta stock y guarda historial)
export async function POST(req: Request) {
  if (!process.env.DATABASE_URL) {
    // Modo sin base de datos: solo simula éxito
    try {
      const body = await req.json()
      return NextResponse.json({
        success: true,
        message: "Solicitud de uso registrada (modo sin base de datos)",
        data: {
          repuestoId: body.repuestoId,
          cantidad: body.cantidad,
          maquinaCodigo: body.maquinaCodigo,
          maquinaLabel: body.maquinaLabel,
          responsable: body.responsable,
          descripcionUso: body.descripcionUso ?? null,
          lowStock: false,
        },
      })
    } catch {
      return NextResponse.json({ error: "Invalid payload" }, { status: 400 })
    }
  }

  try {
    const body = await req.json()

    const {
      repuestoId,
      cantidad,
      maquinaCodigo,
      maquinaLabel,
      responsable,
      descripcionUso,
    } = body

    if (!repuestoId || !cantidad || cantidad <= 0) {
      return NextResponse.json(
        { error: "repuestoId y cantidad > 0 son requeridos" },
        { status: 400 }
      )
    }

    if (!maquinaCodigo || !maquinaLabel) {
      return NextResponse.json(
        { error: "Información de máquina requerida" },
        { status: 400 }
      )
    }

    if (!responsable) {
      return NextResponse.json(
        { error: "Responsable requerido" },
        { status: 400 }
      )
    }

    // 1) Actualizar stock disponible del repuesto.
    // En la base actual la columna es `stock_maximo` — usaremos esa como fuente de verdad
    // y devolveremos también un alias `stock_actual` para compatibilidad con el frontend.
    const updateResult = await query(
      `UPDATE repuestos_inventario
       SET
         stock_maximo = stock_maximo - $1,
         updated_at   = NOW()
       WHERE id = $2
       RETURNING id, codigo, descripcion, stock_maximo, stock_minimo, categoria, subcategoria, codigo_compra, proveedor, imagen_url, precio` ,
      [cantidad, repuestoId]
    )

    if (updateResult.rows.length === 0) {
      return NextResponse.json({ error: "Repuesto no encontrado" }, { status: 404 })
    }

    const updated = updateResult.rows[0]

    // 2) Validar que el stock no haya quedado negativo (priorizamos stock_actual si existe)
    const currentStock = Number(updated.stock_maximo)

    if (!Number.isNaN(currentStock) && currentStock < 0) {
      // Revertir rápidamente el cambio de stock_maximo
      await query(
        `UPDATE repuestos_inventario
         SET
           stock_maximo = stock_maximo + $1,
           updated_at   = NOW()
         WHERE id = $2`,
        [cantidad, repuestoId]
      )

      return NextResponse.json(
        { error: "La cantidad solicitada supera el stock actual" },
        { status: 400 }
      )
    }

    const lowStock = !Number.isNaN(currentStock) && currentStock <= Number(updated.stock_minimo ?? 0)

    // 3) Registrar la solicitud de uso en la tabla de historial
    const hasDescripcion = typeof descripcionUso === "string" && descripcionUso.trim().length > 0

    const usoResult = await query(
      `INSERT INTO repuestos_uso_solicitudes (
         repuesto_id,
         cantidad_solicitada,
         maquina_codigo,
         maquina_label,
         responsable,
         descripcion_uso,
         estado,
         completado_por,
         completado_at
       ) VALUES ($1, $2, $3, $4, $5, $6,
                 $7, $8, $9)
       RETURNING id, estado`,
      [
        repuestoId,
        cantidad,
        maquinaCodigo,
        maquinaLabel,
        responsable,
        hasDescripcion ? descripcionUso.trim() : null,
        hasDescripcion ? "completado" : "pendiente",
        hasDescripcion ? "jefe" : null,
        hasDescripcion ? new Date() : null,
      ]
    )

    const nuevoUso = usoResult.rows[0]

    // Crear notificación
    try {
      const baseUrl = process.env.VERCEL_URL
        ? `https://${process.env.VERCEL_URL}`
        : `http://localhost:${process.env.PORT ?? 3000}`;

      await fetch(`${baseUrl}/api/notificaciones`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          titulo: `Uso de Repuesto ${nuevoUso.estado}`,
          mensaje: `Responsable: ${responsable}\nRepuesto: ${cantidad} x ${updated.descripcion}\nMáquina: ${maquinaLabel}`,
          tipo: 'spare_part_usage',
          severidad: 'info',
          ref_task_id: nuevoUso.id,
          estado_tarea: nuevoUso.estado
        })
      })
    } catch (notificationError) {
      console.error('Error creando la notificación:', notificationError)
    }

    // Devolver tanto stock_maximo como un alias stock_actual para compatibilidad
    return NextResponse.json({
      success: true,
      data: {
        updatedRepuesto: {
          ...updated,
          stock_actual: updated.stock_maximo,
        },
        usageId: nuevoUso.id,
        usageStatus: nuevoUso.estado,
        lowStock,
      },
    })
  } catch (err) {
    console.error("Error registrando uso de repuesto:", err)
    return NextResponse.json(
      { error: "Error registrando uso de repuesto" },
      { status: 500 }
    )
  }
}

export async function GET(req: Request) {
  if (!process.env.DATABASE_URL) {
    // En modo sin BD devolvemos lista vacía
    return NextResponse.json({ data: [] })
  }

  try {
    const { searchParams } = new URL(req.url)
    const estado = searchParams.get("estado") || "pendiente"

    const categoria = searchParams.get("categoria")
    const subcategoria = searchParams.get("subcategoria")
    const codigo = searchParams.get("codigo")
    const maquina = searchParams.get("maquina")
    const responsable = searchParams.get("responsable")
    const desde = searchParams.get("desde")
    const hasta = searchParams.get("hasta")

    const conditions: string[] = ["uso.estado = $1"]
    const values: any[] = [estado]

    let paramIndex = 2

    if (categoria) {
      conditions.push(`inv.categoria = $${paramIndex++}`)
      values.push(categoria)
    }

    if (subcategoria) {
      conditions.push(`inv.subcategoria = $${paramIndex++}`)
      values.push(subcategoria)
    }

    if (codigo) {
      conditions.push(`inv.codigo ILIKE $${paramIndex++}`)
      values.push(`%${codigo}%`)
    }

    if (maquina) {
      conditions.push(`uso.maquina_label ILIKE $${paramIndex++}`)
      values.push(`%${maquina}%`)
    }

    if (responsable) {
      conditions.push(`uso.responsable ILIKE $${paramIndex++}`)
      values.push(`%${responsable}%`)
    }

    if (desde) {
      conditions.push(`uso.created_at >= $${paramIndex++}`)
      values.push(desde)
    }

    if (hasta) {
      conditions.push(`uso.created_at <= $${paramIndex++}`)
      values.push(hasta)
    }

    const whereClause = conditions.length ? `WHERE ${conditions.join(" AND ")}` : ""

    const { rows } = await query(
      `SELECT
         uso.id,
         uso.created_at,
         uso.estado,
         uso.repuesto_id,
         inv.codigo        AS repuesto_codigo,
         inv.nombre        AS repuesto_nombre,
         inv.descripcion   AS repuesto_descripcion,
         inv.categoria,
         inv.subcategoria,
         inv.precio,
         uso.cantidad_solicitada AS cantidad,
         uso.maquina_codigo,
         uso.maquina_label,
         uso.responsable,
         uso.descripcion_uso,
         uso.completado_por,
         uso.completado_at
       FROM repuestos_uso_solicitudes uso
       JOIN repuestos_inventario inv ON inv.id = uso.repuesto_id
       ${whereClause}
       ORDER BY uso.created_at DESC`,
      values
    )

    const data = rows.map((row: any) => ({
      id: row.id,
      createdAt: row.created_at,
      estado: row.estado,
      repuestoId: row.repuesto_id,
      repuestoCodigo: row.repuesto_codigo,
      repuestoNombre: row.repuesto_nombre,
      repuestoDescripcion: row.repuesto_descripcion,
      categoria: row.categoria,
      subcategoria: row.subcategoria,
      cantidad: Number(row.cantidad),
      maquinaCodigo: row.maquina_codigo,
      maquinaLabel: row.maquina_label,
      responsable: row.responsable,
      descripcionUso: row.descripcion_uso,
      completadoPor: row.completado_por,
      completadoAt: row.completado_at,
    }))

    return NextResponse.json({ data })
  } catch (err) {
    console.error("Error consultando usos de repuestos:", err)
    return NextResponse.json(
      { error: "Error consultando usos de repuestos" },
      { status: 500 }
    )
  }
}

// Marca un uso como completado y actualiza la descripción
export async function PUT(req: Request) {
  if (!process.env.DATABASE_URL) {
    // En modo sin BD devolvemos success para no romper el flujo de UI
    return NextResponse.json({ success: true })
  }

  try {
    const body = await req.json()
    const { id, descripcionUso, completadoPor } = body

    if (!id) {
      return NextResponse.json({ error: "id de uso requerido" }, { status: 400 })
    }

    const desc = typeof descripcionUso === "string" ? descripcionUso.trim() : ""
    if (!desc) {
      return NextResponse.json(
        { error: "descripcionUso requerida para completar el uso" },
        { status: 400 }
      )
    }

    const who =
      typeof completadoPor === "string" && completadoPor.trim()
        ? completadoPor.trim()
        : "operario"

    const result = await query(
      `UPDATE repuestos_uso_solicitudes
       SET descripcion_uso = $1,
           estado          = 'completado',
           completado_por  = $2,
           completado_at   = NOW(),
           updated_at      = NOW()
       WHERE id = $3
       RETURNING id`,
      [desc, who, id]
    )

    if (result.rows.length === 0) {
      return NextResponse.json({ error: "Uso no encontrado" }, { status: 404 })
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error("Error completando uso de repuesto:", err)
    return NextResponse.json(
      { error: "Error completando uso de repuesto" },
      { status: 500 }
    )
  }
}

// Elimina un registro de uso de repuesto (solo debería usarse para usos completados)
export async function DELETE(req: Request) {
  if (!process.env.DATABASE_URL) {
    return NextResponse.json({ success: true })
  }

  try {
    const { searchParams } = new URL(req.url)
    const idParam = searchParams.get("id")

    const id = idParam ? Number(idParam) : NaN
    if (!id || Number.isNaN(id)) {
      return NextResponse.json({ error: "id inválido" }, { status: 400 })
    }

    const result = await query(
      `DELETE FROM repuestos_uso_solicitudes WHERE id = $1 RETURNING id`,
      [id]
    )

    if (result.rows.length === 0) {
      return NextResponse.json({ error: "Uso no encontrado" }, { status: 404 })
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error("Error eliminando uso de repuesto:", err)
    return NextResponse.json(
      { error: "Error eliminando uso de repuesto" },
      { status: 500 }
    )
  }
}
