import { format } from "date-fns"
import { es } from "date-fns/locale"
import { LINEAS_FIJAS } from "@/lib/paradas-operativas/constants"
import type { RegistroLineaProduccion } from "./types"

const HORA_REGEX = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/

export function normalizarNombreLinea(nombre: string): string {
  return nombre.trim().replace(/\s+/g, " ")
}

export function claveNombreLinea(nombre: string): string {
  return normalizarNombreLinea(nombre).toLowerCase()
}

export function normalizarHora(hora: string): string {
  if (!hora || !/^\d{1,2}:\d{2}$/.test(hora)) return hora
  const [h, m] = hora.split(":")
  return `${h.padStart(2, "0")}:${m}`
}

export function isValidHora(value: string): boolean {
  return HORA_REGEX.test(value)
}

export function calcularMinutosEntreHoras(inicio: string, fin: string): number | null {
  if (!isValidHora(inicio) || !isValidHora(fin)) return null

  const [hi, mi] = inicio.split(":").map(Number)
  const [hf, mf] = fin.split(":").map(Number)

  let diff = hf * 60 + mf - (hi * 60 + mi)
  if (diff < 0) diff += 24 * 60

  return diff
}

export function formatearMinutos(minutos: number): string {
  if (minutos < 60) return `${minutos} min`
  const h = Math.floor(minutos / 60)
  const m = minutos % 60
  return m > 0 ? `${h}h ${m}min` : `${h}h`
}

export function sumarMinutosParadas(
  paradas: { tiempoMinutos: number }[] | null | undefined,
): number {
  if (!Array.isArray(paradas)) return 0
  return paradas.reduce((acc, p) => acc + (Number(p.tiempoMinutos) || 0), 0)
}

export function sumarUnidadesNoConformes(
  paradas: { unidadesNoConformes: number }[] | null | undefined,
): number {
  if (!Array.isArray(paradas)) return 0
  return paradas.reduce((acc, p) => acc + (Number(p.unidadesNoConformes) ?? 0), 0)
}

export function calcularTasaNoConformidad(
  unidadesBase: number,
  noConformes: number,
): number {
  if (unidadesBase <= 0) return 0
  return Math.round((noConformes / unidadesBase) * 100)
}

export function calcularUnidadesConformes(reales: number, noConformes: number): number {
  return Math.max(0, reales - noConformes)
}

export function calcularCumplimiento(
  programadas: number,
  reales: number,
): number {
  if (programadas <= 0) return 0
  return Math.round((reales / programadas) * 100)
}

export function getLineaLabel(
  apertura: { linea: string; lineaOtra?: string },
): string {
  if (apertura.linea === "OTRA" && apertura.lineaOtra?.trim()) {
    return apertura.lineaOtra.trim()
  }
  return apertura.linea || "Sin línea"
}

/** Clave única para agrupar en reportes (líneas personalizadas usan su nombre) */
export function getLineaKey(
  apertura: { linea: string; lineaOtra?: string },
): string {
  if (apertura.linea === "OTRA" && apertura.lineaOtra?.trim()) {
    return normalizarNombreLinea(apertura.lineaOtra)
  }
  return apertura.linea || "Sin línea"
}

export function registroCoincideLinea(
  registro: { apertura: { linea: string; lineaOtra?: string } },
  lineaKey: string,
): boolean {
  return getLineaKey(registro.apertura) === lineaKey
}

/** Lista ordenada de claves de línea para el dashboard */
export function construirListadoLineas(
  lineasPersonalizadas: string[],
  registros: RegistroLineaProduccion[] = [],
): string[] {
  const desdeCatalogo = lineasPersonalizadas.map((n) => normalizarNombreLinea(n))
  const desdeRegistros = registros
    .filter((r) => r.apertura.linea === "OTRA" && r.apertura.lineaOtra?.trim())
    .map((r) => normalizarNombreLinea(r.apertura.lineaOtra!))

  const personalizadasUnicas = [
    ...new Set([...desdeCatalogo, ...desdeRegistros]),
  ].filter(Boolean)

  return [...LINEAS_FIJAS, ...personalizadasUnicas]
}

export function registroCoincidePeriodo(
  fecha: Date | string | null | undefined,
  anio: string,
  mes: string,
): boolean {
  const d = obtenerFechaValida(fecha)
  if (anio !== "todos" && d.getFullYear() !== Number(anio)) return false
  if (mes !== "todos" && d.getMonth() + 1 !== Number(mes)) return false
  return true
}

export function registroCoincideFecha(
  fecha: Date | string | null | undefined,
  filtroFecha?: Date,
): boolean {
  if (!filtroFecha) return true
  const d = obtenerFechaValida(fecha)
  return (
    d.getFullYear() === filtroFecha.getFullYear() &&
    d.getMonth() === filtroFecha.getMonth() &&
    d.getDate() === filtroFecha.getDate()
  )
}

/** Formato de fecha largo en español, ej: "10 de julio de 2026" */
export function formatearFechaEs(fecha: Date | string | null | undefined): string {
  return formatearFechaSegura(fecha, "PPP")
}

/** Formatea fechas sin lanzar excepción si el valor es inválido. */
export function formatearFechaSegura(
  fecha: Date | string | null | undefined,
  patron: string,
): string {
  if (fecha == null) return "—"
  const d = fecha instanceof Date ? fecha : new Date(fecha)
  if (isNaN(d.getTime())) return "—"
  try {
    return format(d, patron, { locale: es })
  } catch {
    return "—"
  }
}

export function obtenerFechaValida(fecha: Date | string | null | undefined): Date {
  if (fecha instanceof Date && !isNaN(fecha.getTime())) return fecha
  if (typeof fecha === "string" || typeof fecha === "number") {
    const d = new Date(fecha)
    if (!isNaN(d.getTime())) return d
  }
  return new Date()
}

/** Locale español para componentes Calendar */
export { es as localeFechaEs }
