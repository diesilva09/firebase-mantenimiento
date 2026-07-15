import type { RegistroLineaProduccion } from "./types"
import {
  calcularCumplimiento,
  calcularMinutosEntreHoras,
  calcularTasaNoConformidad,
  getLineaKey,
  registroCoincideLinea,
  registroCoincidePeriodo,
  sumarMinutosParadas,
  sumarUnidadesNoConformes,
} from "./utils"

export const MESES_REPORTE = [
  { value: "1", label: "Enero" },
  { value: "2", label: "Febrero" },
  { value: "3", label: "Marzo" },
  { value: "4", label: "Abril" },
  { value: "5", label: "Mayo" },
  { value: "6", label: "Junio" },
  { value: "7", label: "Julio" },
  { value: "8", label: "Agosto" },
  { value: "9", label: "Septiembre" },
  { value: "10", label: "Octubre" },
  { value: "11", label: "Noviembre" },
  { value: "12", label: "Diciembre" },
] as const

export interface KpisParadas {
  registros: number
  activos: number
  cerrados: number
  totalParadas: number
  tiempoPerdido: number
  unidadesProgramadas: number
  unidadesReales: number
  noConformesTotales: number
  noConformesEnParadas: number
  tasaNoConformidad: number
  cumplimientoPromedio: number
  disponibilidadPromedio: number
}

export interface ResumenLineaParadas {
  linea: string
  registros: number
  activos: number
  cerrados: number
  totalParadas: number
  tiempoPerdido: number
  cumplimientoPromedio: number
  disponibilidadPromedio: number
  noConformes: number
  unidadesReales: number
  unidadesProgramadas: number
}

export function filtrarRegistrosPorPeriodo(
  registros: RegistroLineaProduccion[],
  anio: string,
  mes: string,
): RegistroLineaProduccion[] {
  return registros.filter((r) =>
    registroCoincidePeriodo(r.apertura.fecha, anio, mes),
  )
}

export function calcularKpisRegistros(
  registros: RegistroLineaProduccion[],
): KpisParadas {
  const totalParadas = registros.reduce((acc, r) => acc + (r.paradas?.length ?? 0), 0)
  const tiempoPerdido = registros.reduce(
    (acc, r) => acc + sumarMinutosParadas(r.paradas),
    0,
  )
  const cerrados = registros.filter((r) => r.estado === "cerrado")
  const unidadesProgramadas = registros.reduce(
    (acc, r) => acc + r.apertura.unidadesProgramadas,
    0,
  )
  const unidadesReales = cerrados.reduce(
    (acc, r) => acc + (r.cierre?.unidadesRealesTotales ?? 0),
    0,
  )
  const noConformesTotales = cerrados.reduce(
    (acc, r) => acc + (r.cierre?.unidadesNoConformesTotales ?? 0),
    0,
  )
  const noConformesEnParadas = registros.reduce(
    (acc, r) => acc + sumarUnidadesNoConformes(r.paradas),
    0,
  )
  const tasaNoConformidad =
    unidadesReales > 0
      ? calcularTasaNoConformidad(unidadesReales, noConformesTotales)
      : 0
  const cumplimientoPromedio =
    cerrados.length > 0
      ? Math.round(
          cerrados.reduce(
            (acc, r) =>
              acc +
              calcularCumplimiento(
                r.apertura.unidadesProgramadas,
                r.cierre!.unidadesRealesTotales,
              ),
            0,
          ) / cerrados.length,
        )
      : 0

  const disponibilidades = registros.map((r) => {
    const tiempoPerdidoLinea = sumarMinutosParadas(r.paradas)
    const minutosTurno =
      calcularMinutosEntreHoras(
        r.apertura.horaInicio,
        r.apertura.finTurnoProgramado,
      ) ?? 540
    return Math.max(
      0,
      Math.min(
        100,
        Math.round(((minutosTurno - tiempoPerdidoLinea) / minutosTurno) * 100),
      ),
    )
  })
  const disponibilidadPromedio =
    disponibilidades.length > 0
      ? Math.round(
          disponibilidades.reduce((a, d) => a + d, 0) / disponibilidades.length,
        )
      : 0

  return {
    registros: registros.length,
    activos: registros.filter((r) => r.estado === "activo").length,
    cerrados: cerrados.length,
    totalParadas,
    tiempoPerdido,
    unidadesProgramadas,
    unidadesReales,
    noConformesTotales,
    noConformesEnParadas,
    tasaNoConformidad,
    cumplimientoPromedio,
    disponibilidadPromedio,
  }
}

export function calcularTiempoPorMotivo(
  registros: RegistroLineaProduccion[],
): { motivo: string; minutos: number }[] {
  const map = new Map<string, number>()
  for (const reg of registros) {
    const paradas = reg.paradas ?? []
    for (const p of paradas) {
      if (!p.motivo) continue
      map.set(p.motivo, (map.get(p.motivo) ?? 0) + p.tiempoMinutos)
    }
  }
  return Array.from(map.entries())
    .map(([motivo, minutos]) => ({ motivo, minutos }))
    .sort((a, b) => b.minutos - a.minutos)
}

export function calcularNoConformesPorMotivo(
  registros: RegistroLineaProduccion[],
): { motivo: string; unidades: number }[] {
  const map = new Map<string, number>()
  for (const reg of registros) {
    const paradas = reg.paradas ?? []
    for (const p of paradas) {
      if (!p.motivo || p.unidadesNoConformes <= 0) continue
      map.set(p.motivo, (map.get(p.motivo) ?? 0) + p.unidadesNoConformes)
    }
  }
  return Array.from(map.entries())
    .map(([motivo, unidades]) => ({ motivo, unidades }))
    .sort((a, b) => b.unidades - a.unidades)
}

export function calcularDisponibilidadPorLinea(
  resumen: ResumenLineaParadas[],
): { linea: string; lineaCompleta: string; disponibilidad: number }[] {
  return resumen.map((item) => ({
    linea: item.linea.length > 14 ? `${item.linea.slice(0, 12)}…` : item.linea,
    lineaCompleta: item.linea,
    disponibilidad: item.disponibilidadPromedio,
  }))
}

export function calcularResumenPorLinea(
  registros: RegistroLineaProduccion[],
  lineas: string[],
): ResumenLineaParadas[] {
  return lineas
    .map((linea) => {
      const deLinea = registros.filter((r) => registroCoincideLinea(r, linea))
      if (deLinea.length === 0) {
        return {
          linea,
          registros: 0,
          activos: 0,
          cerrados: 0,
          totalParadas: 0,
          tiempoPerdido: 0,
          cumplimientoPromedio: 0,
          disponibilidadPromedio: 0,
          noConformes: 0,
          unidadesReales: 0,
          unidadesProgramadas: 0,
        }
      }

      const kpis = calcularKpisRegistros(deLinea)
      const cerrados = deLinea.filter((r) => r.estado === "cerrado")
      const noConformes =
        cerrados.length > 0
          ? kpis.noConformesTotales
          : kpis.noConformesEnParadas

      return {
        linea,
        registros: kpis.registros,
        activos: kpis.activos,
        cerrados: kpis.cerrados,
        totalParadas: kpis.totalParadas,
        tiempoPerdido: kpis.tiempoPerdido,
        cumplimientoPromedio: kpis.cumplimientoPromedio,
        disponibilidadPromedio: kpis.disponibilidadPromedio,
        noConformes,
        unidadesReales: kpis.unidadesReales,
        unidadesProgramadas: kpis.unidadesProgramadas,
      }
    })
    .filter((item) => item.registros > 0)
    .sort((a, b) => b.tiempoPerdido - a.tiempoPerdido)
}

/** Líneas con actividad en el período (incluye personalizadas no listadas en catálogo) */
export function obtenerLineasConDatos(
  registros: RegistroLineaProduccion[],
  lineasCatalogo: string[],
): string[] {
  const keys = new Set<string>()
  for (const linea of lineasCatalogo) keys.add(linea)
  for (const reg of registros) keys.add(getLineaKey(reg.apertura))
  return Array.from(keys)
}
