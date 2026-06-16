"use client"

import { Suspense } from 'react'
import TasksPageClient from './_components/tasks-page-client'

// Datos de ejemplo para usuarios (puedes obtenerlos de tu BD)
const users = [
  { id: '1', name: 'Juan Pérez', avatarUrl: 'https://picsum.photos/seed/juan/40/40' },
  { id: '2', name: 'María García', avatarUrl: 'https://picsum.photos/seed/maria/40/40' },
  { id: '3', name: 'Carlos López', avatarUrl: 'https://picsum.photos/seed/carlos/40/40' },
  { id: '4', name: 'Ana Rodríguez', avatarUrl: 'https://picsum.photos/seed/ana/40/40' },
]

function TasksLoading() {
  return (
    <div className="container mx-auto py-6">
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Cargando tareas...</p>
        </div>
      </div>
    </div>
  )
}

export default function TasksPage() {
  const initialTasks: any[] = []
  return (
    <Suspense fallback={<TasksLoading />}>
      <TasksPageClient initialTasks={initialTasks} users={users} />
    </Suspense>
  )
}