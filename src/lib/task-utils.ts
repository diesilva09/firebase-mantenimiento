import { Task, User } from './types';
import { findTechnicianByIdOrName } from './technicians';
import { isNetworkError } from './toast-utils';

/** Timestamp para ordenar: completadas por fecha de cierre, resto por creación. */
export function getTaskRecencyTimestamp(task: Task): number {
  if (task.status === 'Completada' && task.completionDate) {
    return new Date(task.completionDate).getTime();
  }
  if (task.createdAt) {
    return new Date(task.createdAt).getTime();
  }
  const idNum = parseInt(task.id, 10);
  if (!Number.isNaN(idNum)) return idNum;
  return new Date(task.nextExecution).getTime();
}

/** Más recientes primero (arriba en el cronograma). */
export function sortTasksByRecency(tasks: Task[]): Task[] {
  return [...tasks].sort(
    (a, b) => getTaskRecencyTimestamp(b) - getTaskRecencyTimestamp(a),
  );
}

// Función para mapear tareas de la base de datos al formato del frontend
export function mapDatabaseTaskToFrontend(dbTask: any): Task {
  // Determinar el estado basado en la fecha y el estado de la BD
  let status: Task['status'] = 'Pendiente';
  const today = new Date();
  const executionDate = new Date(dbTask.fecha_programada);

  if (dbTask.estado === 'completada') {
    status = 'Completada';
  } else if (executionDate > today) {
    status = 'Futura';
  }

  // Buscar usuario responsable (lista fija de técnicos de la plataforma)
  const matchedResponsible = findTechnicianByIdOrName(dbTask.responsable || '');
  const assignedTo = matchedResponsible || {
    id: `custom-${dbTask.id}`,
    name: dbTask.responsable,
    avatarUrl: `https://picsum.photos/seed/${encodeURIComponent(dbTask.responsable)}/40/40`
  };

  // Usuario que ejecutó la tarea (si existe en la BD)
  let executedBy = undefined;
  if (dbTask.ejecutado_por) {
    const name = dbTask.ejecutado_por as string;
    executedBy = findTechnicianByIdOrName(name) || {
      id: `executed-${dbTask.id}`,
      name,
      avatarUrl: `https://picsum.photos/seed/${encodeURIComponent(name)}/40/40`
    };
  }

  return {
    id: dbTask.id.toString(),
    code: dbTask.codigo_equipo || dbTask.codigo_zona || 'N/A',
    area: dbTask.area || 'Sin área',
    description: dbTask.descripcion || dbTask.titulo,
    schedule: dbTask.cronograma,
    priority: dbTask.prioridad,
    status,
    assignedTo,
    executedBy,
    nextExecution: dbTask.fecha_programada,
    createdAt: dbTask.creado_en
      ? new Date(dbTask.creado_en).toISOString()
      : undefined,
    completionDate: dbTask.fecha_completada,
    hasAlert: dbTask.tiene_alerta || false,
    workDone: dbTask.trabajo_realizado,
    imageUrlBefore: dbTask.imagen_antes,
    imageUrlAfter: dbTask.imagen_despues,
    anexoUrl: dbTask.anexo_url,
    frecuencia: dbTask.frecuencia || 'ninguna',
    intervalo: dbTask.intervalo ?? null,
    anticipacion_dias: dbTask.anticipacion_dias ?? null,
    // Campos adicionales usados en TaskDetailsDialog (se acceden como any)
    ...(dbTask.tipo_mantenimiento && { maintenanceType: dbTask.tipo_mantenimiento }),
    ...(dbTask.repuestos_usados && { sparesUsed: dbTask.repuestos_usados }),
    ...(dbTask.observaciones && { observations: dbTask.observaciones }),
  } as any;
}

// Función para obtener tareas desde la API (CORREGIDA: usa rutas relativas)
export async function fetchTasksFromDB(schedule?: string, userEmail?: string | null): Promise<any[]> {
  try {
    // 🔥 CORRECCIÓN: Usamos ruta relativa, sin baseUrl
    const url = new URL(
      schedule
        ? `/api/tareas?cronograma=${encodeURIComponent(schedule)}`
        : '/api/tareas',
      window.location.origin // toma automáticamente el origen actual (http://192.168.0.164:3000)
    );

    if (userEmail) {
      url.searchParams.set('userEmail', userEmail);
    }

    const response = await fetch(url.toString(), {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
      cache: 'no-store'
    });

    if (!response.ok) {
      throw new Error('Error fetching tasks from database');
    }

    const result = await response.json();
    return result.data || [];
  } catch (error) {
    console.error('Error fetching tasks:', error);
    return [];
  }
}

// Función para completar una tarea (ya usa ruta relativa, está bien)
export async function completeTaskInDB(
  taskId: string,
  workDone: string,
  executedBy: string,
  imageBeforeUrl?: string,
  imageAfterUrl?: string,
  completionDate?: string,
  tipoMantenimiento?: string,
  repuestos?: string,
  observaciones?: string,
  modoManual?: boolean,
  anexoUrl?: string,
): Promise<boolean> {
  try {
    const response = await fetch('/api/tareas/completar', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        taskId,
        workDone,
        executedBy,
        imageBeforeUrl,
        imageAfterUrl,
        completionDate: completionDate || new Date().toISOString(),
        tipoMantenimiento,
        repuestos,
        observaciones,
        modoManual,
        anexoUrl,
      })
    });

    if (!response.ok) {
      throw new Error(`Error al completar la tarea (${response.status})`);
    }

    return true;
  } catch (error) {
    console.error('Error completing task:', error);
    if (isNetworkError(error)) throw error;
    return false;
  }
}

// Función para actualizar tarea (ya usa ruta relativa, está bien)
export async function updateTaskInDB(taskData: any): Promise<boolean> {
  try {
    const response = await fetch('/api/tareas', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(taskData)
    });

    return response.ok;
  } catch (error) {
    console.error('Error updating task:', error);
    return false;
  }
}

// Función para eliminar tarea (ya usa ruta relativa, está bien)
export async function deleteTaskInDB(taskId: string): Promise<boolean> {
  try {
    const response = await fetch(`/api/tareas?id=${taskId}`, {
      method: 'DELETE',
    });

    // Si la API responde 404, asumimos que la tarea ya no existe en la BD
    if (response.status === 404) {
      console.warn(`Tarea ${taskId} no encontrada en la BD al intentar eliminarla (404).`);
      return true;
    }

    if (!response.ok) {
      throw new Error(`Error al eliminar la tarea (${response.status})`);
    }

    return response.ok;
  } catch (error) {
    console.error('Error deleting task:', error);
    if (isNetworkError(error)) throw error;
    return false;
  }
}