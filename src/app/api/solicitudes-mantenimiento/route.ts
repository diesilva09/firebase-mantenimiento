import { NextRequest, NextResponse } from "next/server"
import { query } from "@/lib/db"
import { createNotification } from "@/lib/notification-service"

const VALID_STATUSES = ["pendiente", "completado"] as const

type MaintenanceRequestStatus = (typeof VALID_STATUSES)[number]
type ActorRole = "JEFE" | "TECNICO" | "INVITADO" | "NONE"

async function ensureSolicitudesSchema() {
  try {
    await query(`ALTER TABLE solicitudes_mantenimiento ADD COLUMN IF NOT EXISTS estado TEXT`)
    await query(`ALTER TABLE solicitudes_mantenimiento ADD COLUMN IF NOT EXISTS orden_id INTEGER`)
    await query(
      `UPDATE solicitudes_mantenimiento
       SET estado = CASE
         WHEN orden_id IS NOT NULL THEN 'completado'
         WHEN estado IS NULL THEN 'pendiente'
         ELSE estado
       END`
    )
  } catch (error) {
    console.warn("No se pudo autoajustar el esquema de solicitudes_mantenimiento:", error)
  }
}

async function getSolicitudesSchemaInfo() {
  const { rows } = await query(
    `SELECT column_name
     FROM information_schema.columns
     WHERE table_schema = 'public'
       AND table_name = 'solicitudes_mantenimiento'`
  )

  const columns = new Set(rows.map((row: any) => String(row.column_name)))

  return {
    hasEstado: columns.has("estado"),
    hasOrdenId: columns.has("orden_id"),
  }
}

function normalizeSolicitudRow(row: any, schemaInfo: { hasEstado: boolean; hasOrdenId: boolean }) {
  const ordenId = schemaInfo.hasOrdenId ? row.orden_id ?? null : null
  const estado =
    ordenId !== null
      ? "completado"
      : schemaInfo.hasEstado && typeof row.estado === "string" && row.estado
        ? row.estado
        : "pendiente"

  return {
    ...row,
    estado,
    orden_id: ordenId,
  }
}

async function resolveActorRole(params: { actorEmail?: string; actorUid?: string }): Promise<ActorRole> {
  const actorEmail = typeof params.actorEmail === "string" ? params.actorEmail.trim().toLowerCase() : ""
  const actorUid = typeof params.actorUid === "string" ? params.actorUid.trim() : ""

  if (!actorEmail && !actorUid) return "NONE"

  const existingUser = await query(
    "SELECT id, email, rol, activo FROM usuarios WHERE id = $1 OR email = $2",
    [actorUid || null, actorEmail || null]
  )

  const dbUser = existingUser.rows[0]
  if (!dbUser || dbUser.activo === false) return "NONE"

  const rol = typeof dbUser.rol === "string" ? dbUser.rol : "NONE"
  if (rol === "JEFE" || rol === "TECNICO" || rol === "INVITADO") return rol
  return "NONE"
}

export async function POST(request: NextRequest) {
  try {
    await ensureSolicitudesSchema()
    const body = await request.json()
    const {
      nombreSolicitante,
      areaEquipo,
      fechaSolicitud,
      departamentoSolicitante,
      otroDepartamento,
      descripcionSolicitud,
      adjuntos,
    } = body

    const estado: MaintenanceRequestStatus = "pendiente"

    if (!nombreSolicitante || !areaEquipo || !fechaSolicitud || !departamentoSolicitante || !descripcionSolicitud) {
      return NextResponse.json(
        { success: false, error: "Faltan campos obligatorios para registrar la solicitud." },
        { status: 400 }
      )
    }

    const schemaInfo = await getSolicitudesSchemaInfo()
    const columns = [
      "nombre_solicitante",
      "area_equipo",
      "fecha_solicitud",
      "departamento_solicitante",
      "otro_departamento",
      "descripcion_solicitud",
      "adjuntos",
    ]
    const values: any[] = [
      nombreSolicitante,
      areaEquipo,
      fechaSolicitud,
      departamentoSolicitante,
      otroDepartamento || null,
      descripcionSolicitud,
      adjuntos || null,
    ]

    if (schemaInfo.hasEstado) {
      columns.push("estado")
      values.push(estado)
    }

    if (schemaInfo.hasOrdenId) {
      columns.push("orden_id")
      values.push(null)
    }

    const placeholders = values.map((_, index) => `$${index + 1}`).join(", ")

    const result = await query(
      `INSERT INTO solicitudes_mantenimiento (${columns.join(", ")})
       VALUES (${placeholders})
       RETURNING *`,
      values
    )

    const newRequest = normalizeSolicitudRow(result.rows[0], schemaInfo)

    try {
      await createNotification({
        titulo: "Nueva solicitud de mantenimiento",
        mensaje:
          `Solicitante: ${nombreSolicitante}\n` +
          `Area y/o equipo: ${areaEquipo}\n` +
          `Departamento: ${departamentoSolicitante === "Otro" ? otroDepartamento || "Otro" : departamentoSolicitante}`,
        tipo: "form_submission",
        severidad: "info",
        ref_task_id: newRequest.id,
        estado_tarea: "Pendiente",
      })
    } catch (notificationError) {
      console.error("Error creando la notificacion de la solicitud:", notificationError)
    }

    return NextResponse.json(
      {
        success: true,
        data: newRequest,
      },
      { status: 201 }
    )
  } catch (error: any) {
    console.error("Error creando solicitud de mantenimiento:", error)
    return NextResponse.json(
      {
        success: false,
        error: "Error interno del servidor",
        details: error.message,
      },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  try {
    await ensureSolicitudesSchema()
    const schemaInfo = await getSolicitudesSchemaInfo()
    const { searchParams } = new URL(request.url)
    const idParam = searchParams.get("id")
    const id = idParam ? Number(idParam) : null

    if (idParam && (!id || Number.isNaN(id))) {
      return NextResponse.json(
        { error: "El id enviado no es valido." },
        { status: 400 }
      )
    }

    const selectEstado = schemaInfo.hasEstado ? "estado" : "'pendiente'::text AS estado"
    const selectOrdenId = schemaInfo.hasOrdenId ? "orden_id" : "NULL::integer AS orden_id"
    const orderBy = schemaInfo.hasEstado
      ? `ORDER BY
           CASE WHEN estado = 'pendiente' THEN 0 ELSE 1 END,
           created_at DESC`
      : `ORDER BY created_at DESC`

    const { rows } = await query(
      `SELECT
         id,
         nombre_solicitante,
         area_equipo,
         fecha_solicitud,
         departamento_solicitante,
         otro_departamento,
         descripcion_solicitud,
         adjuntos,
         ${selectEstado},
         ${selectOrdenId},
         created_at
       FROM solicitudes_mantenimiento
       ${id ? "WHERE id = $1" : ""}
       ${orderBy}`,
      id ? [id] : []
    )

    return NextResponse.json({ data: rows.map((row: any) => normalizeSolicitudRow(row, schemaInfo)) })
  } catch (error: any) {
    console.error("Error consultando solicitudes de mantenimiento:", error)
    return NextResponse.json(
      {
        error:
          error?.code === "42P01"
            ? "La tabla solicitudes_mantenimiento no existe. Ejecuta la migracion correspondiente."
            : "Error consultando solicitudes de mantenimiento",
      },
      { status: 500 }
    )
  }
}

export async function PUT(request: NextRequest) {
  try {
    await ensureSolicitudesSchema()
    const schemaInfo = await getSolicitudesSchemaInfo()
    const body = await request.json().catch(() => ({} as any))
    const id = Number(body.id)
    const estado = typeof body.estado === "string" ? body.estado.toLowerCase() : ""
    const ordenId =
      body.ordenId === null || body.ordenId === undefined || body.ordenId === ""
        ? null
        : Number(body.ordenId)

    if (!id || Number.isNaN(id)) {
      return NextResponse.json({ success: false, error: "El id de la solicitud es requerido." }, { status: 400 })
    }

    if (!VALID_STATUSES.includes(estado as MaintenanceRequestStatus)) {
      return NextResponse.json(
        { success: false, error: "El estado enviado no es valido." },
        { status: 400 }
      )
    }

    const actorRole = await resolveActorRole({ actorEmail: body.actorEmail, actorUid: body.actorUid })
    if (actorRole === "NONE") {
      return NextResponse.json({ success: false, error: "No autorizado." }, { status: 403 })
    }

    if (estado !== "completado") {
      return NextResponse.json(
        { success: false, error: "Solo se permite completar la solicitud desde este modulo." },
        { status: 400 }
      )
    }

    if (actorRole !== "JEFE" && actorRole !== "TECNICO") {
      return NextResponse.json({ success: false, error: "No autorizado." }, { status: 403 })
    }

    if (ordenId !== null && Number.isNaN(ordenId)) {
      return NextResponse.json({ success: false, error: "ordenId invalido." }, { status: 400 })
    }

    const currentRequestResult = await query(
      `SELECT *
       FROM solicitudes_mantenimiento
       WHERE id = $1`,
      [id]
    )

    if (currentRequestResult.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: "La solicitud no fue encontrada." },
        { status: 404 }
      )
    }

    const currentRequest = currentRequestResult.rows[0]

    if (!schemaInfo.hasEstado) {
      if (schemaInfo.hasOrdenId && ordenId !== null && !Number.isNaN(ordenId)) {
        const linkResult = await query(
          `UPDATE solicitudes_mantenimiento
           SET orden_id = COALESCE($1, orden_id)
           WHERE id = $2
           RETURNING *`,
          [ordenId, id]
        )

        const linkedRequest = normalizeSolicitudRow(linkResult.rows[0], schemaInfo)

        if (!currentRequest.orden_id) {
          try {
            await createNotification({
              titulo: "Solicitud de mantenimiento completada",
              mensaje:
                `Solicitante: ${linkedRequest.nombre_solicitante}\n` +
                `Area y/o equipo: ${linkedRequest.area_equipo}\n` +
                `Departamento: ${
                  linkedRequest.departamento_solicitante === "Otro"
                    ? linkedRequest.otro_departamento || "Otro"
                    : linkedRequest.departamento_solicitante
                }`,
              tipo: "form_submission",
              severidad: "info",
              ref_task_id: linkedRequest.id,
              estado_tarea: "Completada",
            })
          } catch (notificationError) {
            console.error("Error creando la notificacion de solicitud completada:", notificationError)
          }
        }

        return NextResponse.json({
          success: true,
          data: linkedRequest,
          warning: "La solicitud se marco como completada por el enlace de la orden, aunque el estado venia de un esquema anterior.",
        })
      }

      return NextResponse.json({
        success: true,
        data: normalizeSolicitudRow(currentRequest, schemaInfo),
        warning: "La orden se creo, pero la solicitud no pudo marcarse como completada porque la columna estado aun no existe.",
      })
    }

    const setClauses = ["estado = $1"]
    const values: any[] = [estado]

    if (schemaInfo.hasOrdenId) {
      setClauses.push(`orden_id = COALESCE($2, orden_id)`)
      values.push(ordenId)
      values.push(id)
    } else {
      values.push(id)
    }

    const result = await query(
      `UPDATE solicitudes_mantenimiento
       SET ${setClauses.join(", ")}
       WHERE id = $${schemaInfo.hasOrdenId ? 3 : 2}
       RETURNING *`,
      values
    )

    const updatedRequest = normalizeSolicitudRow(result.rows[0], schemaInfo)

    if (currentRequest.estado !== "completado" && updatedRequest.estado === "completado") {
      try {
        await createNotification({
          titulo: "Solicitud de mantenimiento completada",
          mensaje:
            `Solicitante: ${updatedRequest.nombre_solicitante}\n` +
            `Area y/o equipo: ${updatedRequest.area_equipo}\n` +
            `Departamento: ${
              updatedRequest.departamento_solicitante === "Otro"
                ? updatedRequest.otro_departamento || "Otro"
                : updatedRequest.departamento_solicitante
            }`,
          tipo: "form_submission",
          severidad: "info",
          ref_task_id: updatedRequest.id,
          estado_tarea: "Completada",
        })
      } catch (notificationError) {
        console.error("Error creando la notificacion de solicitud completada:", notificationError)
      }
    }

    return NextResponse.json({
      success: true,
      data: updatedRequest,
    })
  } catch (error: any) {
    console.error("Error actualizando estado de solicitud de mantenimiento:", error)
    return NextResponse.json(
      {
        success: false,
        error: "Error interno del servidor",
        details: error.message,
      },
      { status: 500 }
    )
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const idParam = searchParams.get("id")
    const id = idParam ? Number(idParam) : NaN

    if (!id || Number.isNaN(id)) {
      return NextResponse.json({ success: false, error: "El id de la solicitud es requerido." }, { status: 400 })
    }

    const body = await request.json().catch(() => ({} as any))
    const actorRole = await resolveActorRole({ actorEmail: body.actorEmail, actorUid: body.actorUid })

    if (actorRole !== "JEFE") {
      return NextResponse.json({ success: false, error: "No autorizado." }, { status: 403 })
    }

    const result = await query(
      `DELETE FROM solicitudes_mantenimiento
       WHERE id = $1
       RETURNING *`,
      [id]
    )

    if (result.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: "La solicitud no fue encontrada." },
        { status: 404 }
      )
    }

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error("Error eliminando solicitud de mantenimiento:", error)
    return NextResponse.json(
      { success: false, error: "Error interno del servidor", details: error.message },
      { status: 500 }
    )
  }
}
