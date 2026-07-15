import type {
  AperturaLinea,
  CierreLinea,
  ParadaOperativaDetalle,
  RegistroLineaProduccion,
  EstadoRegistroLinea,
} from "./types"

export interface RegistroLineaRow {
  id: number
  fecha: string | Date
  linea: string
  linea_otra: string | null
  turno: string
  hora_inicio: string
  fin_turno_programado: string
  responsable_apertura: string
  unidades_programadas: number
  lote: string
  estado: EstadoRegistroLinea
  hora_finalizacion: string | null
  responsable_cierre: string | null
  unidades_reales_totales: number | null
  unidades_no_conformes_totales: number | null
  creado_en: string
  cerrado_en: string | null
}

export interface ParadaDetalleRow {
  id: number
  registro_linea_id: number
  hora_inicio: string
  hora_fin: string
  tiempo_minutos: number
  motivo: string
  observaciones: string | null
  unidades_reales: number
  unidades_no_conformes: number
  responsable: string
  creado_en: string
}

export function parseFechaDb(val: string | Date): Date {
  if (val instanceof Date) {
    return new Date(val.getFullYear(), val.getMonth(), val.getDate(), 12, 0, 0)
  }
  const s = String(val).slice(0, 10)
  return new Date(`${s}T12:00:00`)
}

export function mapParadaRow(row: ParadaDetalleRow): ParadaOperativaDetalle {
  return {
    id: String(row.id),
    horaInicio: row.hora_inicio ?? "00:00",
    horaFin: row.hora_fin ?? "00:00",
    tiempoMinutos: Number(row.tiempo_minutos) || 0,
    motivo: (row.motivo ?? "") as ParadaOperativaDetalle["motivo"],
    observaciones: row.observaciones ?? undefined,
    unidadesReales: Number(row.unidades_reales) || 0,
    unidadesNoConformes: Number(row.unidades_no_conformes) || 0,
    responsable: row.responsable ?? "",
  }
}

export function mapRegistroRow(
  row: RegistroLineaRow,
  paradas: ParadaDetalleRow[] = [],
): RegistroLineaProduccion {
  const cierre: CierreLinea | undefined =
    row.estado === "cerrado" &&
    row.hora_finalizacion &&
    row.responsable_cierre &&
    row.unidades_reales_totales !== null
      ? {
          horaFinalizacion: row.hora_finalizacion,
          responsable: row.responsable_cierre,
          unidadesRealesTotales: row.unidades_reales_totales,
          unidadesNoConformesTotales: row.unidades_no_conformes_totales ?? 0,
        }
      : undefined

  return {
    id: String(row.id),
    apertura: {
      fecha: parseFechaDb(row.fecha),
      linea: row.linea as AperturaLinea["linea"],
      lineaOtra: row.linea_otra ?? undefined,
      turno: row.turno ?? "",
      horaInicio: row.hora_inicio ?? "00:00",
      finTurnoProgramado: row.fin_turno_programado ?? "00:00",
      responsable: row.responsable_apertura ?? "",
      unidadesProgramadas: Number(row.unidades_programadas) || 0,
      lote: row.lote ?? "",
    },
    paradas: paradas.map(mapParadaRow),
    cierre,
    estado: row.estado,
    creadoEn: row.creado_en,
  }
}

export function formatFecha(date: Date): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, "0")
  const d = String(date.getDate()).padStart(2, "0")
  return `${y}-${m}-${d}`
}
