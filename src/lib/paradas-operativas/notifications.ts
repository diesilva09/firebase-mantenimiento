import { format } from "date-fns"
import { es } from "date-fns/locale"
import { createNotification } from "@/lib/notification-service"
import type { ParadaOperativaDetalle, RegistroLineaProduccion } from "./types"
import { calcularCumplimiento, formatearMinutos, getLineaLabel, calcularTasaNoConformidad } from "./utils"

function formatearFechaInforme(fecha: Date): string {
  return format(fecha, "dd/MM/yyyy", { locale: es })
}

function refId(registroId: string): number {
  return Number(registroId)
}

export async function notificarAperturaLinea(registro: RegistroLineaProduccion) {
  const { apertura } = registro
  const linea = getLineaLabel(apertura)

  try {
    await createNotification({
      titulo: `Línea abierta — ${linea}`,
      mensaje: [
        `Fecha: ${formatearFechaInforme(apertura.fecha)}`,
        `Turno: ${apertura.turno}`,
        `Lote: ${apertura.lote}`,
        `Unidades programadas: ${apertura.unidadesProgramadas.toLocaleString()}`,
        `Responsable: ${apertura.responsable}`,
      ].join("\n"),
      tipo: "operational_stop",
      severidad: "info",
      ref_task_id: refId(registro.id),
      estado_tarea: "Pendiente",
    })
  } catch (error) {
    console.error("Error creando notificación de apertura de línea:", error)
  }
}

export async function notificarCierreLinea(registro: RegistroLineaProduccion) {
  const { apertura, cierre } = registro
  if (!cierre) return

  const linea = getLineaLabel(apertura)
  const cumplimiento = calcularCumplimiento(
    apertura.unidadesProgramadas,
    cierre.unidadesRealesTotales,
  )
  const tasaNoConformes = calcularTasaNoConformidad(
    cierre.unidadesRealesTotales,
    cierre.unidadesNoConformesTotales,
  )

  try {
    await createNotification({
      titulo: `Producción cerrada — ${linea}`,
      mensaje: [
        `Fecha: ${formatearFechaInforme(apertura.fecha)}`,
        `Lote: ${apertura.lote}`,
        `Unidades: ${cierre.unidadesRealesTotales.toLocaleString()} / ${apertura.unidadesProgramadas.toLocaleString()} (${cumplimiento}%)`,
        `No conformes: ${cierre.unidadesNoConformesTotales.toLocaleString()} (${tasaNoConformes}%)`,
        `Responsable cierre: ${cierre.responsable}`,
      ].join("\n"),
      tipo: "operational_stop",
      severidad: "info",
      ref_task_id: refId(registro.id),
      estado_tarea: "Completada",
    })
  } catch (error) {
    console.error("Error creando notificación de cierre de línea:", error)
  }
}

export async function notificarParadaOperativa(
  registro: RegistroLineaProduccion,
  parada: ParadaOperativaDetalle,
) {
  const linea = getLineaLabel(registro.apertura)

  try {
    await createNotification({
      titulo: `Parada operativa — ${linea}`,
      mensaje: [
        `Fecha: ${formatearFechaInforme(registro.apertura.fecha)}`,
        `Lote: ${registro.apertura.lote}`,
        `Horario: ${parada.horaInicio} – ${parada.horaFin}`,
        `Tiempo: ${formatearMinutos(parada.tiempoMinutos)}`,
        `Motivo: ${parada.motivo || "—"}`,
        `Responsable: ${parada.responsable}`,
      ].join("\n"),
      tipo: "operational_stop",
      severidad: "warning",
      ref_task_id: refId(registro.id),
      estado_tarea: "Pendiente",
    })
  } catch (error) {
    console.error("Error creando notificación de parada operativa:", error)
  }
}
