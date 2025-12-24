import { NextResponse } from 'next/server';
import { query } from '@/lib/db';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { email, uid } = body;

    if (!email) {
      return NextResponse.json({ 
        error: 'Email es requerido' 
      }, { status: 400 });
    }

    // Validar email contra base de datos de usuarios autorizados
    // Aquí puedes implementar la lógica específica para tu sistema
    const adminEmails = process.env.NEXT_PUBLIC_ADMIN_EMAILS?.split(',')?.map(e => e.trim().toLowerCase()) || [];
    const isAdmin = adminEmails.includes(email.toLowerCase());
    
    // Aquí puedes implementar lógica más compleja como verificar en una tabla de usuarios
    // const userQuery = await query('SELECT role FROM usuarios WHERE email = $1', [email]);
    // const userRole = userQuery.rows[0]?.role || 'user';
    
    return NextResponse.json({
      isAdmin,
      permissions: isAdmin 
        ? ['read', 'write', 'delete', 'admin', 'create', 'update'] 
        : ['read']
    });
  } catch (error) {
    console.error('Error verificando rol de usuario:', error);
    return NextResponse.json({ 
      error: 'Error interno del servidor' 
    }, { status: 500 });
  }
}