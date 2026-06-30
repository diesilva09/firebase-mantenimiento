import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import { z } from "zod";

const zonaSchema = z.object({
  tipo: z.string(),
  area: z.string().optional().nullable(),
  codigo: z.string().optional().nullable(),
  nombre: z.string(),
  imagenes_folder_url: z.string().optional().nullable(),
  attachments_url: z.string().optional().nullable(),
});

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const tipo = searchParams.get("tipo");
    const area = searchParams.get("area");

    const conditions: string[] = [];
    const values: any[] = [];
    let idx = 1;

    if (tipo) {
      conditions.push(`tipo = $${idx++}`);
      values.push(tipo);
    }
    if (area) {
      conditions.push(`area = $${idx++}`);
      values.push(area);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

    const { rows } = await query(
      `SELECT * FROM zonas ${whereClause} ORDER BY area ASC NULLS LAST, nombre ASC`,
      values,
    );

    return NextResponse.json({ data: rows });
  } catch (err) {
    console.error("Error consultando zonas:", err);
    return NextResponse.json({ error: "Error consultando zonas" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const data = zonaSchema.parse(body);
    const { rows } = await query(
      `INSERT INTO zonas (tipo, area, codigo, nombre, imagenes_folder_url, attachments_url)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [data.tipo, data.area, data.codigo, data.nombre, data.imagenes_folder_url ?? null, data.attachments_url ?? null],
    );
    return NextResponse.json({ data: rows[0] }, { status: 201 });
  } catch (err: any) {
    console.error("Error creando zona:", err);
    if (err?.code === "P2002") { // Prisma unique constraint violation
      return NextResponse.json({ error: "Ya existe una zona con ese código" }, { status: 409 });
    }
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: 'Datos de entrada inválidos', details: err.errors }, { status: 400 })
    }
    return NextResponse.json({ error: "Error creando zona" }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    const body = await req.json();
    const { id, ...updateData } = body;
    if (!id) {
      return NextResponse.json({ error: "id es requerido" }, { status: 400 });
    }
    const data = zonaSchema.partial().parse(updateData);
    const { rows } = await query(
      `UPDATE zonas SET
         tipo = COALESCE($1, tipo),
         area = COALESCE($2, area),
         codigo = COALESCE($3, codigo),
         nombre = COALESCE($4, nombre),
         imagenes_folder_url = COALESCE($5, imagenes_folder_url),
         attachments_url = COALESCE($6, attachments_url)
       WHERE id = $7
       RETURNING *`,
      [data.tipo ?? null, data.area ?? null, data.codigo ?? null, data.nombre ?? null, data.imagenes_folder_url ?? null, data.attachments_url ?? null, Number(id)],
    );
    return NextResponse.json({ data: rows[0] });
  } catch (err: any) {
    console.error("Error actualizando zona:", err);
    if (err?.code === "P2002") { // Prisma unique constraint violation
      return NextResponse.json({ error: "Ya existe una zona con ese código" }, { status: 409 });
    }
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: 'Datos de entrada inválidos', details: err.errors }, { status: 400 })
    }
    return NextResponse.json({ error: "Error actualizando zona" }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    if (!id) {
      return NextResponse.json({ error: "id es requerido" }, { status: 400 });
    }
    const { rows } = await query(
      `DELETE FROM zonas WHERE id = $1 RETURNING *`,
      [Number(id)],
    );
    return NextResponse.json({ success: true, data: rows[0] });
  } catch (err) {
    console.error("Error eliminando zona:", err);
    return NextResponse.json({ error: "Error eliminando zona" }, { status: 500 });
  }
}
