// src/lib/notification-service.ts
import { query } from '@/lib/db';

interface NotificationPayload {
  titulo: string;
  mensaje: string;
  tipo: 'task_alert' | 'form_submission' | 'system' | 'spare_part_usage';
  severidad: 'info' | 'warning' | 'critical';
  ref_task_id?: number;
  estado_tarea?: 'Pendiente' | 'Completada' | 'Futura';
  prioridad?: 'Alta' | 'Media' | 'Baja';
}

export async function createNotification(payload: NotificationPayload) {
  try {
    const {
      titulo,
      mensaje,
      tipo,
      severidad,
      estado_tarea,
      prioridad,
      ref_task_id,
    } = payload;

    const result = await query(
      `INSERT INTO notificaciones
        (titulo, mensaje, tipo, severidad, estado_tarea, prioridad, ref_task_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [titulo, mensaje, tipo, severidad, estado_tarea, prioridad, ref_task_id]
    );

    return result.rows[0];
  } catch (e) {
    console.error('Error al crear notificación en la base de datos:', e);
    throw new Error('Error al crear notificación en la base de datos');
  }
}
