import { NextResponse } from "next/server";
import { query } from "@/lib/db";

// POST /api/zonas/historial
// Crea un registro de hoja de vida en la tabla zonas_historial
export async function POST(req: Request) {
  if (!process.env.DATABASE_URL) {
    return NextResponse.json({ error: "Base de datos no configurada" }, { status: 500 });
  }

  try {
    const body = await req.json();

    const {
      codigoZona,
      tareaId,
      fechaEvento,
      labor,
      tipoMantenimiento,
      repuestosUsados,
      observaciones,
      ejecutadoPor,
      creadoPor,
    } = body || {};

    if (!codigoZona || !labor) {
      return NextResponse.json({ error: "codigoZona y labor son requeridos" }, { status: 400 });
    }

    const values: any[] = [];
    const columns: string[] = [];
    const placeholders: string[] = [];

    const pushField = (column: string, value: any) => {
      if (value !== undefined && value !== null) {
        columns.push(column);
        values.push(value);
        placeholders.push(`$${values.length}`);
      }
    };

    pushField("codigo_zona", codigoZona);
    pushField("tarea_id", tareaId ? Number(tareaId) : null);
    pushField("fecha_evento", fechaEvento || new Date().toISOString());
    pushField("labor", labor);
    pushField("tipo_mantenimiento", tipoMantenimiento ?? null);
    pushField("repuestos_usados", repuestosUsados ?? null);
    pushField("observaciones", observaciones ?? null);
    pushField("ejecutado_por", ejecutadoPor ?? null);
    pushField("creado_por", creadoPor ?? null);

    const sql = `
      INSERT INTO zonas_historial (${columns.join(", ")})
      VALUES (${placeholders.join(", ")})
      RETURNING *
    `;

    const { rows } = await query(sql, values);

    return NextResponse.json({ data: rows[0] });
  } catch (err) {
    console.error("Error creando registro en zonas_historial:", err);
    return NextResponse.json({ error: "Error creando registro en zonas_historial" }, { status: 500 });
  }
}

// GET /api/zonas/historial?codigoZona=ZON-001
// Devuelve el historial de una zona ordenado por fecha_evento DESC
export async function GET(req: Request) {
  if (!process.env.DATABASE_URL) {
    return NextResponse.json({ data: [], message: "Base de datos no configurada" }, { status: 500 });
  }

  try {
    const { searchParams } = new URL(req.url);
    const codigoZona = searchParams.get("codigoZona");

    if (!codigoZona) {
      return NextResponse.json({ data: [], message: "codigoZona requerido" }, { status: 400 });
    }

    const { rows } = await query(
      `
      SELECT
        id,
        codigo_zona,
        tarea_id,
        fecha_evento,
        labor,
        tipo_mantenimiento,
        repuestos_usados,
        observaciones,
        ejecutado_por,
        creado_por,
        created_at
      FROM zonas_historial
      WHERE codigo_zona = $1
      ORDER BY fecha_evento DESC, id DESC
      `,
      [codigoZona]
    );

    return NextResponse.json({ data: rows });
  } catch (err) {
    console.error("Error consultando zonas_historial:", err);
    return NextResponse.json({ error: "Error consultando zonas_historial" }, { status: 500 });
  }
}
