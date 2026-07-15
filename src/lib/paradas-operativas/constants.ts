export const LINEAS_PRODUCCION = [
  "TECNOPACK",
  "EMERITO",
  "DOYPACK FRUTOS",
  "TWIST OFF",
  "6 BOQUILLAS",
  "16 BOQUILLAS",
  "FLAUTA",
  "ROTATIVA",
  "DOYPACK SALSAS",
  "OTRA",
] as const

/** Líneas fijas del catálogo (sin OTRA ni personalizadas) */
export const LINEAS_FIJAS = LINEAS_PRODUCCION.filter(
  (linea) => linea !== "OTRA",
)

export const MOTIVOS_PARADA = [
  "Arranque línea",
  "Toma de alimentos",
  "Falla mecánica",
  "Problemas de Calidad",
  "Problemas producción",
  "Falta de producto",
  "Falta de Materia prima",
  "Otro",
] as const

export const TURNOS_PRODUCCION = [
  {
    label: "6:00 AM - 3:00 PM",
    horaInicio: "06:00",
    finTurnoProgramado: "15:00",
  },
  {
    label: "7:00 AM - 4:00 PM",
    horaInicio: "07:00",
    finTurnoProgramado: "16:00",
  },
  {
    label: "8:00 PM - 5:00 AM",
    horaInicio: "20:00",
    finTurnoProgramado: "05:00",
  },
] as const

export const TURNOS_SUGERIDOS = TURNOS_PRODUCCION.map((t) => t.label)

export type LineaProduccion = (typeof LINEAS_PRODUCCION)[number]
export type MotivoParada = (typeof MOTIVOS_PARADA)[number]
export type EstadoRegistroLinea = "activo" | "cerrado"
