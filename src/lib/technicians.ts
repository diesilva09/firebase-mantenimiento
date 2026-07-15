/**
 * ÚNICA fuente de técnicos para tareas y formularios.
 * No crear listas locales ni pasar usuarios por props.
 */
import type { User } from './types';

/** Técnicos del equipo de mantenimiento (misma lista usada en formularios). */
export const technicians: User[] = [
  { id: 'tech-1', name: 'Luis Bohorquez', avatarUrl: 'https://picsum.photos/seed/tech1/40/40' },
  { id: 'tech-2', name: 'Duvan Guevara', avatarUrl: 'https://picsum.photos/seed/tech2/40/40' },
  { id: 'tech-3', name: 'Juan David Caro', avatarUrl: 'https://picsum.photos/seed/tech3/40/40' },
  { id: 'tech-4', name: 'Sergio Rubiano', avatarUrl: 'https://picsum.photos/seed/tech4/40/40' },
  { id: 'tech-5', name: 'Javier Morales', avatarUrl: 'https://picsum.photos/seed/tech5/40/40' },
  { id: 'tech-6', name: 'Andres', avatarUrl: 'https://picsum.photos/seed/tech6/40/40' },
  { id: 'tech-7', name: 'Robayo', avatarUrl: 'https://picsum.photos/seed/tech7/40/40' },
];

export const PERSONAL_EXTERNO_VALUE = 'personal-externo';
export const OTRO_TECNICO_VALUE = 'otro';

export function findTechnicianByIdOrName(idOrName: string): User | undefined {
  const normalized = idOrName.toLowerCase().replace(/-/g, ' ').trim();
  return technicians.find((t) => {
    const idNorm = t.id.toLowerCase().replace(/-/g, ' ').trim();
    const nameNorm = t.name.toLowerCase().trim();
    return t.id === idOrName || idNorm === normalized || nameNorm === normalized;
  });
}

export function resolveTechnicianName(assignedToId: string, customName?: string): string {
  if (assignedToId === PERSONAL_EXTERNO_VALUE && customName?.trim()) {
    return `Personal Externo - ${customName.trim()}`;
  }
  if (assignedToId === OTRO_TECNICO_VALUE) {
    return customName?.trim() || '';
  }
  const tech = findTechnicianByIdOrName(assignedToId);
  return tech?.name ?? assignedToId;
}
