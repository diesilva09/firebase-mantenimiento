"use client"

import { Suspense } from 'react'
import TasksPageClient from './_components/tasks-page-client'

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
      <TasksPageClient initialTasks={initialTasks} />
    </Suspense>
  )
}