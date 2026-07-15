import { NextResponse } from "next/server"
import {
  desactivarLineaPersonalizada,
  getLineasPersonalizadasActivas,
} from "@/lib/paradas-operativas/lineas-personalizadas"

export async function GET() {
  if (!process.env.DATABASE_URL) {
    return NextResponse.json({ data: [] })
  }

  try {
    const data = await getLineasPersonalizadasActivas()
    return NextResponse.json({ data })
  } catch (err) {
    console.error("Error consultando líneas personalizadas:", err)
    const detalle = err instanceof Error ? err.message : ""
    const tablaFaltante =
      detalle.includes("does not exist") || detalle.includes("no existe")
    // Si la tabla aún no está migrada, devolver vacío para no bloquear el formulario
    if (tablaFaltante) {
      return NextResponse.json({ data: [] })
    }
    return NextResponse.json(
      { error: "Error consultando líneas personalizadas" },
      { status: 500 },
    )
  }
}

export async function DELETE(req: Request) {
  if (!process.env.DATABASE_URL) {
    return NextResponse.json({ error: "Base de datos no configurada" }, { status: 500 })
  }

  try {
    const nombre = new URL(req.url).searchParams.get("nombre")?.trim()
    if (!nombre) {
      return NextResponse.json({ error: "Nombre de línea requerido" }, { status: 400 })
    }

    const eliminada = await desactivarLineaPersonalizada(nombre)
    if (!eliminada) {
      return NextResponse.json({ error: "Línea personalizada no encontrada" }, { status: 404 })
    }

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error("Error eliminando línea personalizada:", err)
    return NextResponse.json(
      { error: "Error eliminando línea personalizada" },
      { status: 500 },
    )
  }
}
