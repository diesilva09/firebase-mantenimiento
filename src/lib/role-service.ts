import { User } from 'firebase/auth';

export type AppRole = 'JEFE' | 'TECNICO' | 'NONE';

export interface UserRole {
  isAdmin: boolean;
  role: AppRole; // Nuevo campo explícito
  permissions: string[];
}

/**
 * Verifica si un usuario es administrador basado en su email
 */
export async function checkUserRole(user: User | null): Promise<UserRole> {
  if (!user) {
    return { isAdmin: false, role: 'NONE', permissions: [] };
  }

  // Si el usuario no ha verificado su correo, no otorgar ningún rol
  if (!user.emailVerified) {
    return { isAdmin: false, role: 'NONE', permissions: [] };
  }

  try {
    // Verificar roles desde el backend
    const response = await fetch('/api/auth/role', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: user.email,
        uid: user.uid,
      }),
      credentials: 'include', // Incluir cookies si las usamos
    });

    if (response.ok) {
      const data = await response.json();
      // Aseguramos que la respuesta tenga la estructura correcta
      return {
        isAdmin: data.role === 'JEFE',
        role: data.role || 'NONE',
        permissions: data.role === 'JEFE' ? ['read', 'write', 'delete', 'admin'] : ['read', 'write']
      };
    } else {
      // Fallback: verificación basada en variables de entorno
      return getFallbackRole(user.email);
    }
  } catch (error) {
    console.error('Error checking user role:', error);
    // Fallback seguro
    return getFallbackRole(user.email);
  }
}

/**
 * Verifica si el usuario tiene permisos específicos
 */
export function hasPermission(userRole: UserRole, permission: string): boolean {
  return userRole.isAdmin || userRole.permissions.includes(permission);
}

// Función auxiliar para determinar rol localmente si falla la API
function getFallbackRole(email: string | null): UserRole {
  if (!email) return { isAdmin: false, role: 'NONE', permissions: [] };
  
  const cleanEmail = email.toLowerCase().trim();
  const adminEmails = process.env.NEXT_PUBLIC_ADMIN_EMAILS?.split(',')?.map(e => e.trim().toLowerCase()) || [];
  
  const techEmails = process.env.TECNICO_EMAILS?.split(',')?.map(e => e.trim().toLowerCase()) || [];

  const isJefe = adminEmails.includes(cleanEmail);
  const isTecnico = techEmails.includes(cleanEmail);

  if (isJefe) {
    return { isAdmin: true, role: 'JEFE', permissions: ['read', 'write', 'delete', 'admin'] };
  }
  
  if (isTecnico) {
    return { isAdmin: false, role: 'TECNICO', permissions: ['read', 'write'] };
  }
  
  // Si no está en ninguna lista, no tiene acceso
  return { isAdmin: false, role: 'NONE', permissions: [] };
}