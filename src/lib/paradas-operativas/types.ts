import type { EstadoRegistroLinea, LineaProduccion, MotivoParada } from "./constants"

export interface AperturaLinea {
  fecha: Date
  linea: LineaProduccion | ""
  lineaOtra?: string
  turno: string
  horaInicio: string
  finTurnoProgramado: string
  responsable: string
  unidadesProgramadas: number
  lote: string
}

export interface ParadaOperativaDetalle {
  id: string
  horaInicio: string
  horaFin: string
  tiempoMinutos: number
  motivo: MotivoParada | ""
  observaciones?: string
  unidadesReales: number
  unidadesNoConformes: number
  responsable: string
}

export interface CierreLinea {
  horaFinalizacion: string
  responsable: string
  unidadesRealesTotales: number
  unidadesNoConformesTotales: number
}

export interface RegistroLineaProduccion {
  id: string
  apertura: AperturaLinea
  paradas: ParadaOperativaDetalle[]
  cierre?: CierreLinea
  estado: EstadoRegistroLinea
  creadoEn: string
}
