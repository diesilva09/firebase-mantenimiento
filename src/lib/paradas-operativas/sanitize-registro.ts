import type {
  AperturaLinea,
  ParadaOperativaDetalle,
  RegistroLineaProduccion,
} from "./types"

function parseFechaSegura(val: unknown): Date {
  if (val instanceof Date && !isNaN(val.getTime())) {
    return val
  }
  if (typeof val === "string" || typeof val === "number") {
    const d = new Date(val)
    if (!isNaN(d.getTime())) return d
  }
  return new Date()
}

function sanitizeParada(raw: unknown): ParadaOperativaDetalle | null {
  if (!raw || typeof raw !== "object") return null
  const p = raw as Partial<ParadaOperativaDetalle>
  if (!p.id) return null

  return {
    id: String(p.id),
    horaInicio: p.horaInicio ?? "00:00",
    horaFin: p.horaFin ?? "00:00",
    tiempoMinutos: Number(p.tiempoMinutos) || 0,
    motivo: (p.motivo ?? "") as ParadaOperativaDetalle["motivo"],
    observaciones: p.observaciones,
    unidadesReales: Number(p.unidadesReales) || 0,
    unidadesNoConformes: Number(p.unidadesNoConformes) || 0,
    responsable: p.responsable ?? "",
  }
}

function sanitizeApertura(raw: unknown): AperturaLinea | null {
  if (!raw || typeof raw !== "object") return null
  const a = raw as Partial<AperturaLinea>

  return {
    fecha: parseFechaSegura(a.fecha),
    linea: (a.linea ?? "") as AperturaLinea["linea"],
    lineaOtra: a.lineaOtra,
    turno: a.turno ?? "",
    horaInicio: a.horaInicio ?? "00:00",
    finTurnoProgramado: a.finTurnoProgramado ?? "00:00",
    responsable: a.responsable ?? "",
    unidadesProgramadas: Number(a.unidadesProgramadas) || 0,
    lote: a.lote ?? "",
  }
}

/** Normaliza y descarta registros corruptos para evitar crashes en el cliente. */
export function sanitizeRegistro(raw: unknown): RegistroLineaProduccion | null {
  if (!raw || typeof raw !== "object") return null
  const r = raw as Partial<RegistroLineaProduccion>
  if (!r.id) return null

  const apertura = sanitizeApertura(r.apertura)
  if (!apertura) return null

  const paradasRaw = Array.isArray(r.paradas) ? r.paradas : []
  const paradas = paradasRaw
    .map(sanitizeParada)
    .filter((p): p is ParadaOperativaDetalle => p !== null)

  const estado = r.estado === "cerrado" ? "cerrado" : "activo"

  let cierre = undefined
  if (r.cierre && typeof r.cierre === "object") {
    const c = r.cierre
    if (c.horaFinalizacion && c.responsable) {
      cierre = {
        horaFinalizacion: c.horaFinalizacion,
        responsable: c.responsable,
        unidadesRealesTotales: Number(c.unidadesRealesTotales) || 0,
        unidadesNoConformesTotales: Number(c.unidadesNoConformesTotales) || 0,
      }
    }
  }

  return {
    id: String(r.id),
    apertura,
    paradas,
    cierre,
    estado,
    creadoEn: r.creadoEn ?? new Date().toISOString(),
  }
}

export function sanitizeRegistros(raw: unknown): RegistroLineaProduccion[] {
  if (!Array.isArray(raw)) return []
  return raw.map(sanitizeRegistro).filter((r): r is RegistroLineaProduccion => r !== null)
}
