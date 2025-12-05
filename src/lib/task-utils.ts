import { Task, User } from './types'

// Función para mapear tareas de la base de datos al formato del frontend
export function mapDatabaseTaskToFrontend(dbTask: any, users: User[]): Task {
  // Determinar el estado basado en la fecha y el estado de la BD
  let status: Task['status'] = 'Pendiente'
  const today = new Date()
  const executionDate = new Date(dbTask.fecha_programada)
  
  if (dbTask.estado === 'completada') {
    status = 'Completada'
  } else if (executionDate > today) {
    status = 'Futura'
  }

  // Buscar usuario responsable
  const assignedTo = users.find(user => 
    user.name.toLowerCase().includes(dbTask.responsable.toLowerCase()) ||
    dbTask.responsable.toLowerCase().includes(user.name.toLowerCase())
  ) || {
    id: `custom-${dbTask.id}`,
    name: dbTask.responsable,
    avatarUrl: `https://picsum.photos/seed/${encodeURIComponent(dbTask.responsable)}/40/40`
  }

  // Usuario que ejecutó la tarea (si existe en la BD)
  let executedBy = undefined
  if (dbTask.ejecutado_por) {
    const name = dbTask.ejecutado_por as string
    executedBy = users.find(user => 
      user.name.toLowerCase().includes(name.toLowerCase()) ||
      name.toLowerCase().includes(user.name.toLowerCase())
    ) || {
      id: `executed-${dbTask.id}`,
      name,
      avatarUrl: `https://picsum.photos/seed/${encodeURIComponent(name)}/40/40`
    }
  }

  return {
    id: dbTask.id.toString(),
    code: dbTask.codigo_equipo || dbTask.codigo_zona || 'N/A',
    area: dbTask.area || 'Sin área',
    description: dbTask.titulo || dbTask.descripcion,
    schedule: dbTask.cronograma,
    priority: dbTask.prioridad,
    status,
    assignedTo,
    executedBy,
    nextExecution: dbTask.fecha_programada,
    completionDate: dbTask.fecha_completada,
    hasAlert: dbTask.tiene_alerta || false,
    workDone: dbTask.trabajo_realizado,
    imageUrlBefore: dbTask.imagen_antes,
    imageUrlAfter: dbTask.imagen_despues,
  }
}

// Función para obtener tareas desde la API
export async function fetchTasksFromDB(schedule?: string, userEmail?: string | null): Promise<any[]> {
  try {
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
    const urlObj = new URL(
      schedule
        ? `${baseUrl}/api/tareas?cronograma=${encodeURIComponent(schedule)}`
        : `${baseUrl}/api/tareas`
    )

    if (userEmail) {
      urlObj.searchParams.set('userEmail', userEmail)
    }
    
    const response = await fetch(urlObj.toString(), {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
      cache: 'no-store'
    })

    if (!response.ok) {
      throw new Error('Error fetching tasks from database')
    }

    const result = await response.json()
    return result.data || []
  } catch (error) {
    console.error('Error fetching tasks:', error)
    return []
  }
}

// Función para completar una tarea
export async function completeTaskInDB(
  taskId: string, 
  workDone: string, 
  executedBy: string,
  imageBefore?: string,
  imageAfter?: string
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
        imageBefore,
        imageAfter,
        completionDate: new Date().toISOString()
      })
    })

    return response.ok
  } catch (error) {
    console.error('Error completing task:', error)
    return false
  }
}

// ✅ AGREGAR ESTA FUNCIÓN - Actualizar tarea
export async function updateTaskInDB(taskData: any): Promise<boolean> {
  try {
    const response = await fetch('/api/tareas', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(taskData)
    })

    return response.ok
  } catch (error) {
    console.error('Error updating task:', error)
    return false
  }
}

// ✅ AGREGAR ESTA FUNCIÓN - Eliminar tarea
export async function deleteTaskInDB(taskId: string): Promise<boolean> {
  try {
    const response = await fetch(`/api/tareas?id=${taskId}`, {
      method: 'DELETE',
    })

    // Si la API responde 404, asumimos que la tarea ya no existe en la BD
    // y permitimos que el frontend la elimine igual de la UI.
    if (response.status === 404) {
      console.warn(`Tarea ${taskId} no encontrada en la BD al intentar eliminarla (404).`)
      return true
    }

    return response.ok
  } catch (error) {
    console.error('Error deleting task:', error)
    return false
  }
}