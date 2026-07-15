import { query } from "@/lib/db"
import {
  claveNombreLinea,
  normalizarNombreLinea,
} from "@/lib/paradas-operativas/utils"

export interface LineaPersonalizadaRow {
  id: number
  nombre: string
  nombre_normalizado: string
  creado_en: string
  activa: boolean
}

export async function ensureLineaPersonalizada(nombre: string): Promise<void> {
  const limpio = normalizarNombreLinea(nombre)
  if (!limpio) return

  try {
    await query(
      `INSERT INTO lineas_personalizadas (nombre, nombre_normalizado)
       VALUES ($1, $2)
       ON CONFLICT (nombre_normalizado) DO UPDATE SET
         nombre = EXCLUDED.nombre,
         activa = true`,
      [limpio, claveNombreLinea(limpio)],
    )
  } catch (err) {
    // El catálogo es auxiliar: no debe bloquear la apertura del registro
    console.error("No se pudo registrar línea personalizada en catálogo:", err)
  }
}

export async function getLineasPersonalizadasActivas(): Promise<string[]> {
  const { rows } = await query(
    `SELECT nombre FROM lineas_personalizadas
     WHERE activa = true
     ORDER BY nombre ASC`,
  )
  return (rows as Pick<LineaPersonalizadaRow, "nombre">[]).map((r) => r.nombre)
}

export async function desactivarLineaPersonalizada(nombre: string): Promise<boolean> {
  const clave = claveNombreLinea(nombre)
  if (!clave) return false

  const { rows } = await query(
    `UPDATE lineas_personalizadas
     SET activa = false
     WHERE nombre_normalizado = $1 AND activa = true
     RETURNING id`,
    [clave],
  )

  return rows.length > 0
}
