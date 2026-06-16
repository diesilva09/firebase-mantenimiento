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

    // 1. Intentar buscar al usuario en la base de datos
    const existingUser = await query(
      'SELECT id, email, rol, activo FROM usuarios WHERE id = $1 OR email = $2', 
      [uid, email.toLowerCase()]
    );

    let dbUser = existingUser.rows[0];

    // 2. Si el usuario NO existe, lo creamos (Auto-registro/Migración)
    if (!dbUser) {
      // Determinamos el rol inicial usando las variables de entorno actuales (solo para el primer registro)
      const adminEmails = (process.env.NEXT_PUBLIC_ADMIN_EMAILS || '').split(',').map(e => e.trim().toLowerCase());
      const isInitialAdmin = adminEmails.includes(email.toLowerCase());
      const initialRol = isInitialAdmin ? 'JEFE' : 'TECNICO';
      const defaultName = email.split('@')[0];

      await query(
        'INSERT INTO usuarios (id, email, rol, activo, nombre) VALUES ($1, $2, $3, $4, $5)',
        [uid, email.toLowerCase(), initialRol, true, defaultName]
      );

      // Creamos un objeto temporal para la respuesta inmediata
      dbUser = { rol: initialRol, activo: true };
    }

    // 3. Si el usuario existe pero está desactivado
    if (!dbUser.activo) {
      return NextResponse.json({
        isAdmin: false,
        role: 'NONE',
        permissions: []
      });
    }

    const isJefe = dbUser.rol === 'JEFE';
    const isTecnico = dbUser.rol === 'TECNICO';

    return NextResponse.json({
      isAdmin: isJefe,
      role: isJefe ? 'JEFE' : (isTecnico ? 'TECNICO' : 'NONE'),
      permissions: isJefe 
        ? ['read', 'write', 'delete', 'admin', 'create', 'update'] 
        : (isTecnico ? ['read', 'write'] : ['read'])
    });
  } catch (error) {
    console.error('Error verificando rol de usuario:', error);
    return NextResponse.json({ 
      error: 'Error interno del servidor' 
    }, { status: 500 });
  }
}