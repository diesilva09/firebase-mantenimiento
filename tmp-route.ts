// ✅ CORRECTO: Usar una variable local o copiar el objeto
export async function GET(request: Request, { params }: { params: { id: string } }) {
  // Opción 1: Usar una variable nueva
  const idModificado = "nuevo-valor"; 
  
  // Opción 2: Crear una copia si necesitas el objeto completo
  const newParams = { ...params, id: "nuevo-valor" };
  
  // Usar newParams o idModificado en tu consulta...
}
import { NextResponse } from 'next/server';
import { query } from '@/lib/db';




