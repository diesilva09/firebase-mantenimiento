import type { AperturaLinea, CierreLinea, ParadaOperativaDetalle } from "./types"
import type { RegistroLineaProduccion } from "./types"
import { sanitizeRegistro, sanitizeRegistros } from "./sanitize-registro"

const BASE = "/api/paradas-operativas/registros"

function normalizarRegistro(registro: RegistroLineaProduccion): RegistroLineaProduccion {
  return sanitizeRegistro(registro) ?? {
    id: String(registro.id ?? "0"),
    apertura: {
      fecha: new Date(),
      linea: "",
      turno: "",
      horaInicio: "00:00",
      finTurnoProgramado: "00:00",
      responsable: "",
      unidadesProgramadas: 0,
      lote: "",
    },
    paradas: [],
    estado: "activo",
    creadoEn: new Date().toISOString(),
  }
}

async function parseJson<T>(res: Response): Promise<T> {
  let data: unknown
  try {
    data = await res.json()
  } catch {
    throw new Error("Respuesta inválida del servidor")
  }
  if (!res.ok) {
    const err = data as { error?: string }
    throw new Error(err?.error || "Error en la solicitud")
  }
  return data as T
}

export async function fetchLineasPersonalizadas(): Promise<string[]> {
  try {
    const res = await fetch("/api/paradas-operativas/lineas-personalizadas", {
      cache: "no-store",
    })
    const data = await parseJson<{ data: string[] }>(res)
    return data.data
  } catch {
    return []
  }
}

export async function eliminarLineaPersonalizada(nombre: string): Promise<void> {
  const params = new URLSearchParams({ nombre })
  const res = await fetch(
    `/api/paradas-operativas/lineas-personalizadas?${params.toString()}`,
    { method: "DELETE" },
  )
  await parseJson<{ ok: boolean }>(res)
}

export async function fetchRegistrosLinea(): Promise<RegistroLineaProduccion[]> {
  const res = await fetch(BASE, { cache: "no-store" })
  const data = await parseJson<{ data?: unknown }>(res)
  return sanitizeRegistros(data.data).map(normalizarRegistro)
}

export async function abrirRegistroLinea(
  apertura: AperturaLinea,
): Promise<RegistroLineaProduccion> {
  const res = await fetch(BASE, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ apertura }),
  })
  return normalizarRegistro(await parseJson<RegistroLineaProduccion>(res))
}

export async function agregarParada(
  registroId: string,
  parada: Omit<ParadaOperativaDetalle, "id">,
): Promise<RegistroLineaProduccion> {
  const res = await fetch(`${BASE}/${registroId}/paradas`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ parada }),
  })
  return normalizarRegistro(await parseJson<RegistroLineaProduccion>(res))
}

export async function eliminarParada(
  registroId: string,
  paradaId: string,
): Promise<RegistroLineaProduccion> {
  const res = await fetch(`${BASE}/${registroId}/paradas/${paradaId}`, {
    method: "DELETE",
  })
  return normalizarRegistro(await parseJson<RegistroLineaProduccion>(res))
}

export async function actualizarParada(
  registroId: string,
  paradaId: string,
  parada: Omit<ParadaOperativaDetalle, "id">,
): Promise<RegistroLineaProduccion> {
  const res = await fetch(`${BASE}/${registroId}/paradas/${paradaId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ parada }),
  })
  return normalizarRegistro(await parseJson<RegistroLineaProduccion>(res))
}

export async function cerrarRegistroLinea(
  registroId: string,
  cierre: CierreLinea,
): Promise<RegistroLineaProduccion> {
  const res = await fetch(`${BASE}/${registroId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ cierre }),
  })
  return normalizarRegistro(await parseJson<RegistroLineaProduccion>(res))
}

export async function actualizarAperturaLinea(
  registroId: string,
  apertura: AperturaLinea,
): Promise<RegistroLineaProduccion> {
  const res = await fetch(`${BASE}/${registroId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ apertura }),
  })
  return normalizarRegistro(await parseJson<RegistroLineaProduccion>(res))
}

export async function eliminarRegistroLinea(registroId: string): Promise<void> {
  const res = await fetch(`${BASE}/${registroId}`, { method: "DELETE" })
  await parseJson<{ ok: boolean }>(res)
}
