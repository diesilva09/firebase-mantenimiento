import { NextResponse } from "next/server";
import { query } from "@/lib/db";

// GET /api/zonas?tipo=PARTES_ALTAS&area=ENVASADO%20FRUTOS
export async function GET(req: Request) {
  if (!process.env.DATABASE_URL) {
    return NextResponse.json(
      { data: [], message: "Base de datos no configurada" },
      { status: 500 }
    );
  }

  try {
    const { searchParams } = new URL(req.url);
    const tipo = searchParams.get("tipo");
    const area = searchParams.get("area");

    const where: string[] = [];
    const values: any[] = [];

    if (tipo) {
      where.push(`tipo = $${values.length + 1}`);
      values.push(tipo);
    }

    if (area) {
      where.push(`area = $${values.length + 1}`);
      values.push(area);
    }

    const whereSql = where.length ? `WHERE ${where.join(" AND ")}` : "";

    const { rows } = await query(
      `
      SELECT id, tipo, area, codigo, nombre, created_at
      FROM zonas
      ${whereSql}
      ORDER BY area NULLS LAST, nombre ASC
      `,
      values
    );

    return NextResponse.json({ data: rows });
  } catch (err) {
    console.error("Error consultando zonas:", err);
    return NextResponse.json(
      { error: "Error consultando zonas" },
      { status: 500 }
    );
  }
}

// POST /api/zonas
export async function POST(req: Request) {
  if (!process.env.DATABASE_URL) {
    return NextResponse.json(
      { error: "Base de datos no configurada" },
      { status: 500 }
    );
  }

  try {
    const body = await req.json();
    const { tipo, area, codigo, nombre } = body || {};

    if (!tipo || !nombre) {
      return NextResponse.json(
        { error: "tipo y nombre son requeridos" },
        { status: 400 }
      );
    }

    const { rows } = await query(
      `
      INSERT INTO zonas (tipo, area, codigo, nombre)
      VALUES ($1, $2, $3, $4)
      RETURNING id, tipo, area, codigo, nombre, created_at
      `,
      [tipo, area || null, codigo || null, nombre]
    );

    return NextResponse.json({ data: rows[0] }, { status: 201 });
  } catch (err: any) {
    console.error("Error creando zona:", err);
    if (err?.code === "23505") {
      // unique_violation (por codigo)
      return NextResponse.json(
        { error: "Ya existe una zona con ese código" },
        { status: 409 }
      );
    }
    return NextResponse.json(
      { error: "Error creando zona" },
      { status: 500 }
    );
  }
}

// PUT /api/zonas
export async function PUT(req: Request) {
  if (!process.env.DATABASE_URL) {
    return NextResponse.json(
      { error: "Base de datos no configurada" },
      { status: 500 }
    );
  }

  try {
    const body = await req.json();
    const { id, area, codigo, nombre } = body || {};

    if (!id || !nombre) {
      return NextResponse.json(
        { error: "id y nombre son requeridos" },
        { status: 400 }
      );
    }

    const { rows } = await query(
      `
      UPDATE zonas
      SET area = $2,
          codigo = $3,
          nombre = $4
      WHERE id = $1
      RETURNING id, tipo, area, codigo, nombre, created_at
      `,
      [id, area || null, codigo || null, nombre]
    );

    if (!rows[0]) {
      return NextResponse.json(
        { error: "Zona no encontrada" },
        { status: 404 }
      );
    }

    return NextResponse.json({ data: rows[0] });
  } catch (err: any) {
    console.error("Error actualizando zona:", err);
    if (err?.code === "23505") {
      // unique_violation (por codigo)
      return NextResponse.json(
        { error: "Ya existe una zona con ese código" },
        { status: 409 }
      );
    }
    return NextResponse.json(
      { error: "Error actualizando zona" },
      { status: 500 }
    );
  }
}

// DELETE /api/zonas?id=123
export async function DELETE(req: Request) {
  if (!process.env.DATABASE_URL) {
    return NextResponse.json(
      { error: "Base de datos no configurada" },
      { status: 500 }
    );
  }

  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json(
        { error: "id es requerido" },
        { status: 400 }
      );
    }

    await query("DELETE FROM zonas WHERE id = $1", [id]);

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Error eliminando zona:", err);
    return NextResponse.json(
      { error: "Error eliminando zona" },
      { status: 500 }
    );
  }
}