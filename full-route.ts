import { NextResponse } from 'next/server'; 
import { query } from '@/lib/db'; 
 
export async function GET( 
  req: Request, 
  { params }: { params: { id: string } } 
) { 
  if (^!process.env.DATABASE_URL) { 
    return NextResponse.json({ error: 'No database configured' }, { status: 500 }); 
  } 
 
  try { 
    const taskId = params.id; 
 
    if (^!taskId) { 
      return NextResponse.json({ error: 'Task ID is required' }, { status: 400 }); 
    } 
 
    const { rows } = await query( 
      'SELECT tc.*, e.nombre as equipo_nombre FROM tareas_cronograma tc LEFT JOIN equipos e ON tc.codigo_equipo = e.codigo WHERE tc.id = $1', 
      [taskId] 
    ); 
 
    if (rows.length === 0) { 
      return NextResponse.json({ error: 'Task not found' }, { status: 404 }); 
    } 
 
    return NextResponse.json(rows[0]); 
  } catch (err) { 
    console.error('Error fetching task by ID:', err); 
    return NextResponse.json({ error: 'Error fetching task' }, { status: 500 }); 
  } 
} 
