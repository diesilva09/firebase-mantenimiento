import { query } from "@/lib/db"
import { formatFecha } from "@/lib/paradas-operativas/db-mappers"
import type { ParadaOperativaDetalle } from "@/lib/paradas-operativas/types"

const VENTANA_DUPLICADO_SEG = 120

type AperturaInput = {
  fecha: string | Date
  linea: string
  lineaOtra?: string
  turno: string
  lote: string
  horaInicio: string
  responsable: string
}

type ParadaInput = Omit<ParadaOperativaDetalle, "id">

export async function buscarAperturaDuplicada(
  apertura: AperturaInput,
): Promise<number | null> {
  const fecha = formatFecha(new Date(apertura.fecha))
  const lineaOtra = apertura.linea === "OTRA" ? apertura.lineaOtra?.trim() || null : null

  const { rows } = await query(
    `SELECT id
     FROM registros_linea_produccion
     WHERE estado = 'activo'
       AND fecha = $1
       AND linea = $2
       AND COALESCE(linea_otra, '') = COALESCE($3, '')
       AND turno = $4
       AND lote = $5
       AND responsable_apertura = $6
       AND hora_inicio = $7
       AND creado_en > NOW() - ($8::text || ' seconds')::interval
     ORDER BY id DESC
     LIMIT 1`,
    [
      fecha,
      apertura.linea,
      lineaOtra,
      apertura.turno,
      apertura.lote,
      apertura.responsable,
      apertura.horaInicio,
      String(VENTANA_DUPLICADO_SEG),
    ],
  )

  return rows[0]?.id ?? null
}

export async function buscarParadaDuplicada(
  registroId: number,
  parada: ParadaInput,
): Promise<number | null> {
  const { rows } = await query(
    `SELECT id
     FROM paradas_operativas_detalle
     WHERE registro_linea_id = $1
       AND hora_inicio = $2
       AND hora_fin = $3
       AND motivo = $4
       AND responsable = $5
       AND tiempo_minutos = $6
       AND creado_en > NOW() - ($7::text || ' seconds')::interval
     ORDER BY id DESC
     LIMIT 1`,
    [
      registroId,
      parada.horaInicio,
      parada.horaFin,
      parada.motivo,
      parada.responsable,
      parada.tiempoMinutos,
      String(VENTANA_DUPLICADO_SEG),
    ],
  )

  return rows[0]?.id ?? null
}
