import { NextResponse } from 'next/server'
import { query } from '@/lib/db'

type Frecuencia = 'ninguna' | 'diaria' | 'semanal' | 'mensual' | 'trimestral' | 'personalizada'

function calcularProximaEjecucion(
  frecuencia: Frecuencia,
  intervalo: number | null,
  desde: Date,
): Date | null {
  if (!frecuencia || frecuencia === 'ninguna') return null

  const base = new Date(desde)
  const step = intervalo && intervalo > 0 ? intervalo : 1

  switch (frecuencia) {
    case 'diaria': {
      base.setDate(base.getDate() + step)
      return base
    }
    case 'semanal': {
      base.setDate(base.getDate() + 7 * step)
      return base
    }
    case 'mensual': {
      base.setMonth(base.getMonth() + step)
      return base
    }
    case 'trimestral': {
      base.setMonth(base.getMonth() + 3 * step)
      return base
    }
    case 'personalizada': {
      base.setDate(base.getDate() + step)
      return base
    }
    default:
      return null
  }
}

export async function GET(req: Request) {
  if (!process.env.DATABASE_URL) {
    return NextResponse.json({ data: [], message: 'No database configured' })
  }

  try {
    // Generar instancias pendientes de tareas recurrentes antes de devolver la lista
    const now = new Date()

    const recurrentesResult = await query(
      `SELECT * FROM tareas_cronograma
       WHERE frecuencia IS NOT NULL
         AND frecuencia <> 'ninguna'
         AND proxima_ejecucion IS NOT NULL
         AND proxima_ejecucion <= $1`,
      [now.toISOString()],
    )

    for (const baseTask of recurrentesResult.rows) {
      const proxima = baseTask.proxima_ejecucion
        ? new Date(baseTask.proxima_ejecucion)
        : null
      if (!proxima) continue

      // Evitar duplicados: verificar si ya existe una tarea para ese mismo código y fecha
      const existing = await query(
        `SELECT id FROM tareas_cronograma
         WHERE fecha_programada = $1
           AND COALESCE(codigo_equipo, '') = COALESCE($2, '')
           AND COALESCE(codigo_zona, '') = COALESCE($3, '')
           AND COALESCE(titulo, '') = COALESCE($4, '')`,
        [
          proxima.toISOString(),
          baseTask.codigo_equipo || null,
          baseTask.codigo_zona || null,
          baseTask.titulo || null,
        ],
      )

      if (existing.rows.length === 0) {
        const insertResult = await query(
          `INSERT INTO tareas_cronograma (
             codigo_equipo,
             codigo_zona,
             area,
             titulo,
             descripcion,
             tipo_tarea,
             cronograma,
             prioridad,
             estado,
             fecha_programada,
             responsable,
             tiene_alerta,
             frecuencia,
             intervalo,
             ultima_ejecucion,
             proxima_ejecucion
           ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
           RETURNING *`,
          [
            baseTask.codigo_equipo,
            baseTask.codigo_zona,
            baseTask.area,
            baseTask.titulo,
            baseTask.descripcion,
            baseTask.tipo_tarea,
            baseTask.cronograma,
            baseTask.prioridad,
            'pendiente',
            proxima.toISOString(),
            baseTask.responsable,
            baseTask.tiene_alerta || false,
            baseTask.frecuencia,
            baseTask.intervalo,
            baseTask.ultima_ejecucion,
            // La nueva instancia hereda la siguiente ejecución calculada a partir de esta fecha
            calcularProximaEjecucion(
              (baseTask.frecuencia || 'ninguna') as Frecuencia,
              baseTask.intervalo ?? null,
              proxima,
            )?.toISOString() ?? null,
          ],
        )

        const nuevaTareaAuto = insertResult.rows[0]

        // Crear notificación para la tarea generada automáticamente
        try {
          const url = new URL(req.url)
          const baseUrl = `${url.protocol}//${url.host}`

          const code = nuevaTareaAuto.codigo_equipo || nuevaTareaAuto.codigo_zona || 'Sin código'
          const area = nuevaTareaAuto.area || 'Sin área'
          const fecha = new Date(nuevaTareaAuto.fecha_programada).toLocaleString('es-CO', { timeZone: 'America/Bogota' })

          const message = `Responsable: ${nuevaTareaAuto.responsable}\nPrioridad: ${nuevaTareaAuto.prioridad}\nFecha: ${fecha}\nDescripción: ${nuevaTareaAuto.descripcion}`

          await fetch(`${baseUrl}/api/notificaciones`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              titulo: `Nueva Tarea (frecuenciada): ${code} - ${area}`,
              mensaje: message,
              tipo: 'task_alert',
              severidad: nuevaTareaAuto.prioridad === 'Alta'
                ? 'critical'
                : nuevaTareaAuto.prioridad === 'Media'
                  ? 'warning'
                  : 'info',
              ref_task_id: nuevaTareaAuto.id,
              estado_tarea: 'Pendiente',
            }),
          })
        } catch (notificationError) {
          console.error('Error creando la notificación para tarea frecuenciada:', notificationError)
        }
      }

      // Actualizar la tarea base con su última y próxima ejecución
      const siguiente = calcularProximaEjecucion(
        (baseTask.frecuencia || 'ninguna') as Frecuencia,
        baseTask.intervalo ?? null,
        proxima,
      )

      await query(
        `UPDATE tareas_cronograma
         SET ultima_ejecucion = $1,
             proxima_ejecucion = $2
         WHERE id = $3`,
        [
          proxima.toISOString(),
          siguiente ? siguiente.toISOString() : null,
          baseTask.id,
        ],
      )
    }

    const { rows } = await query(
      `SELECT tc.*, e.nombre as equipo_nombre
       FROM tareas_cronograma tc
       LEFT JOIN equipos e ON tc.codigo_equipo = e.codigo
       ORDER BY tc.fecha_programada DESC`,
    )
    return NextResponse.json({ data: rows })
  } catch (err) {
    console.error('Error consultando tareas:', err)
    return NextResponse.json({ error: 'Error consultando tareas' }, { status: 500 })
  }
}

export async function POST(req: Request) {
  if (!process.env.DATABASE_URL) {
    return NextResponse.json({ error: 'Base de datos no configurada' }, { status: 500 })
  }

  try {
    const body = await req.json()

    const frecuencia: Frecuencia = (body.frecuencia || 'ninguna') as Frecuencia
    const intervalo: number | null = body.intervalo ?? null

    const fechaProgramada = new Date(body.fecha_programada)
    const proximaEjecucionInicial =
      frecuencia === 'ninguna'
        ? null
        : calcularProximaEjecucion(frecuencia, intervalo, fechaProgramada)

    const { rows } = await query(
      `INSERT INTO tareas_cronograma (
        codigo_equipo, codigo_zona, area, titulo, descripcion, tipo_tarea,
        cronograma, prioridad, estado, fecha_programada, responsable, tiene_alerta,
        frecuencia, intervalo, ultima_ejecucion, proxima_ejecucion
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
      RETURNING *`,
      [
        body.codigo_equipo,
        body.codigo_zona,
        body.area,
        body.titulo,
        body.descripcion,
        body.tipo_tarea || 'mantenimiento',
        body.cronograma,
        body.prioridad,
        'pendiente',
        body.fecha_programada,
        body.responsable,
        body.tiene_alerta || false,
        frecuencia,
        intervalo,
        null,
        proximaEjecucionInicial ? proximaEjecucionInicial.toISOString() : null,
      ],
    )

    const nuevaTarea = rows[0]

    // Crear notificación
    try {
      const url = new URL(req.url)
      const baseUrl = `${url.protocol}//${url.host}`

      // Consultar información adicional del equipo para la notificación
      let nombreEquipo = 'Sin nombre';
      let lineaEquipo = 'Sin línea';
      
      if (nuevaTarea.codigo_equipo) {
        const equipoRes = await query('SELECT nombre, linea FROM equipos WHERE codigo = $1', [nuevaTarea.codigo_equipo]);
        if (equipoRes.rows.length > 0) {
          nombreEquipo = equipoRes.rows[0].nombre || 'Sin nombre';
          lineaEquipo = equipoRes.rows[0].linea || 'Sin línea';
        }
      }

      const code = nuevaTarea.codigo_equipo || nuevaTarea.codigo_zona || 'Sin código';
      const area = nuevaTarea.area || 'Sin área';
      const fecha = new Date(nuevaTarea.fecha_programada).toLocaleString('es-CO', { timeZone: 'America/Bogota' });

      // Formato de notificación mejorado con etiquetas y saltos de línea
      const message = `Responsable: ${nuevaTarea.responsable}\nPrioridad: ${nuevaTarea.prioridad}\nFecha: ${fecha}\nDescripción: ${nuevaTarea.descripcion}`;

      await fetch(`${baseUrl}/api/notificaciones`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          titulo: `Nueva Tarea: ${code} - ${area}`,
          mensaje: message,
          tipo: 'task_alert',
          severidad: nuevaTarea.prioridad === 'Alta'
            ? 'critical' // Rojo
            : nuevaTarea.prioridad === 'Media'
              ? 'warning' // Naranja
              : 'info', // Baja -> se mapea a Verde en frontend
          ref_task_id: nuevaTarea.id,
          estado_tarea: 'Pendiente'
        })
      })
    } catch (notificationError) {
      console.error('Error creando la notificación:', notificationError)
      // Opcional: podrías querer manejar este error de alguna forma,
      // pero por ahora solo lo logueamos para no afectar la respuesta principal.
    }

    return NextResponse.json(nuevaTarea, { status: 201 })
  } catch (err) {
    console.error('Error insertando tarea:', err)
    return NextResponse.json({ error: 'Error guardando tarea' }, { status: 500 })
  }
}

export async function PUT(req: Request) {
  if (!process.env.DATABASE_URL) {
    return NextResponse.json({ error: 'Base de datos no configurada' }, { status: 500 })
  }

  try {
    const body = await req.json()

    const frecuencia: Frecuencia = (body.frecuencia || 'ninguna') as Frecuencia
    const intervalo: number | null = body.intervalo ?? null

    let proximaEjecucion = body.proxima_ejecucion ?? null

    if (frecuencia === 'ninguna') {
      proximaEjecucion = null
    } else if (!proximaEjecucion && body.fecha_programada) {
      const fechaProgramada = new Date(body.fecha_programada)
      const siguiente = calcularProximaEjecucion(frecuencia, intervalo, fechaProgramada)
      proximaEjecucion = siguiente ? siguiente.toISOString() : null
    }

    const { rows } = await query(
      `UPDATE tareas_cronograma 
       SET codigo_equipo = $1,
           codigo_zona = $2,
           area = $3,
           titulo = $4,
           descripcion = $5,
           tipo_tarea = $6,
           cronograma = $7,
           prioridad = $8,
           fecha_programada = $9,
           responsable = $10,
           tiene_alerta = $11,
           frecuencia = $12,
           intervalo = $13,
           proxima_ejecucion = $14
       WHERE id = $15
       RETURNING *`,
      [
        body.codigo_equipo,
        body.codigo_zona,
        body.area,
        body.titulo,
        body.descripcion,
        body.tipo_tarea || 'mantenimiento',
        body.cronograma,
        body.prioridad,
        body.fecha_programada,
        body.responsable,
        body.tiene_alerta || false,
        frecuencia,
        intervalo,
        proximaEjecucion,
        body.id,
      ],
    )

    if (rows.length === 0) {
      return NextResponse.json({ error: 'Tarea no encontrada' }, { status: 404 })
    }

    return NextResponse.json(rows[0])
  } catch (err) {
    console.error('Error actualizando tarea:', err)
    return NextResponse.json({ error: 'Error actualizando tarea' }, { status: 500 })
  }
}

// DELETE - Eliminar tarea
export async function DELETE(req: Request) {
  if (!process.env.DATABASE_URL) {
    return NextResponse.json({ error: 'Base de datos no configurada' }, { status: 500 })
  }

  try {
    const { searchParams } = new URL(req.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json({ error: 'ID de tarea requerido' }, { status: 400 })
    }

    // Eliminar también el historial asociado a esta tarea
    // Hoja de vida de equipos
    await query('DELETE FROM equipos_historial WHERE tarea_id = $1', [id])
    // Hoja de vida de zonas
    await query('DELETE FROM zonas_historial WHERE tarea_id = $1', [id])

    const { rows } = await query(
      'DELETE FROM tareas_cronograma WHERE id = $1 RETURNING *',
      [id]
    )

    if (rows.length === 0) {
      return NextResponse.json({ error: 'Tarea no encontrada' }, { status: 404 })
    }

    return NextResponse.json({ success: true, message: 'Tarea eliminada' })
  } catch (err) {
    console.error('Error eliminando tarea:', err)
    return NextResponse.json({ error: 'Error eliminando tarea' }, { status: 500 })
  }
}
