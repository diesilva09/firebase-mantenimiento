import { User } from 'firebase/auth';

export interface UserRole {
  isAdmin: boolean;
  permissions: string[];
}

/**
 * Verifica si un usuario es administrador basado en su email
 */
export async function checkUserRole(user: User | null): Promise<UserRole> {
  if (!user) {
    return { isAdmin: false, permissions: [] };
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
      return data;
    } else {
      // Fallback: verificación basada en variables de entorno
      const adminEmails = process.env.NEXT_PUBLIC_ADMIN_EMAILS?.split(',')?.map(email => email.trim().toLowerCase()) || [];
      const isAdmin = user.email ? adminEmails.includes(user.email.toLowerCase()) : false;
      
      return {
        isAdmin,
        permissions: isAdmin ? ['read', 'write', 'delete', 'admin'] : ['read']
      };
    }
  } catch (error) {
    console.error('Error checking user role:', error);
    // Fallback seguro
    const adminEmails = process.env.NEXT_PUBLIC_ADMIN_EMAILS?.split(',')?.map(email => email.trim().toLowerCase()) || [];
    const isAdmin = user.email ? adminEmails.includes(user.email.toLowerCase()) : false;
    
    return {
      isAdmin,
      permissions: isAdmin ? ['read', 'write', 'delete', 'admin'] : ['read']
    };
  }
}

/**
 * Verifica si el usuario tiene permisos específicos
 */
export function hasPermission(userRole: UserRole, permission: string): boolean {
  return userRole.isAdmin || userRole.permissions.includes(permission);
}