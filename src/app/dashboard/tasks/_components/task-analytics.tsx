"use client"

import * as React from "react"
import { useMemo, useState } from "react"
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from "recharts"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { Wrench, CheckCircle, AlertTriangle, Calendar } from "lucide-react"
import type { Task, Schedule, TaskStatus } from "@/lib/types"
import { isSameMonth, isSameYear } from "date-fns"

const schedules: Schedule[] = ['Maquinaria', 'Mantenimiento Locativo', 'Partes Altas', 'Equipo de Medición'];

const STATUS_CONFIG: Record<TaskStatus, { color: string; label: string }> = {
  Completada: { color: "#22c55e", label: "Ejecutadas" },
  Pendiente: { color: "#ef4444", label: "Pendientes" },
  Futura: { color: "#3b82f6", label: "Próximas" },
}

interface AnalyticsData {
  stats: {
    total: number
    Completada: number
    Pendiente: number
    Futura: number
  }
  chartData: {
    name: string
    value: number
  }[]
}

export function ScheduleAnalytics({ schedule, tasks }: { schedule: Schedule; tasks: Task[] }) {
  const [timePeriod, setTimePeriod] = useState<"monthly" | "annual">("monthly")
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear())
  const [selectedMonth, setSelectedMonth] = useState<number>(new Date().getMonth()) // 0-11

  const availableYears = useMemo(() => {
    const years = new Set<number>()
    tasks.forEach(task => {
      const d = new Date(task.nextExecution)
      if (!isNaN(d.getTime())) {
        years.add(d.getFullYear())
      }
    })
    if (years.size === 0) {
      years.add(new Date().getFullYear())
    }
    return Array.from(years).sort((a, b) => a - b)
  }, [tasks])

  const monthNames = [
    "Enero",
    "Febrero",
    "Marzo",
    "Abril",
    "Mayo",
    "Junio",
    "Julio",
    "Agosto",
    "Septiembre",
    "Octubre",
    "Noviembre",
    "Diciembre",
  ]

  const data: AnalyticsData = useMemo(() => {
    const filteredTasks = tasks.filter(task => {
      const taskDate = new Date(task.nextExecution)
      if (isNaN(taskDate.getTime())) return false

      if (timePeriod === "monthly") {
        return (
          taskDate.getFullYear() === selectedYear &&
          taskDate.getMonth() === selectedMonth
        )
      }

      // annual
      return taskDate.getFullYear() === selectedYear
    })

    const stats: AnalyticsData["stats"] = {
      total: filteredTasks.length,
      Completada: 0,
      Pendiente: 0,
      Futura: 0,
    }

    filteredTasks.forEach(task => {
      if (stats[task.status] !== undefined) {
        stats[task.status]++
      }
    })

    const chartData = (Object.keys(STATUS_CONFIG) as TaskStatus[]).map(status => ({
      name: STATUS_CONFIG[status].label,
      value: stats[status],
    })).filter(item => item.value > 0)

    return { stats, chartData }
  }, [tasks, timePeriod, selectedYear, selectedMonth])

  const kpiCards = [
    { title: "Total Labores", value: data.stats.total, Icon: Wrench, color: "text-gray-500" },
    { title: "Ejecutadas", value: data.stats.Completada, Icon: CheckCircle, color: "text-green-500" },
    { title: "Pendientes", value: data.stats.Pendiente, Icon: AlertTriangle, color: "text-red-500" },
    { title: "Próximas", value: data.stats.Futura, Icon: Calendar, color: "text-blue-500" },
  ]

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
        <h3 className="text-lg font-semibold text-foreground">{schedule}</h3>
        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant={timePeriod === "monthly" ? "default" : "outline"}
            size="sm"
            onClick={() => setTimePeriod("monthly")}
          >
            Mensual
          </Button>
          <Button
            variant={timePeriod === "annual" ? "default" : "outline"}
            size="sm"
            onClick={() => setTimePeriod("annual")}
          >
            Anual
          </Button>

          {/* Selector de año */}
          <select
            className="border rounded px-2 py-1 text-sm bg-background"
            value={selectedYear}
            onChange={(e) => setSelectedYear(Number(e.target.value))}
          >
            {availableYears.map((year) => (
              <option key={year} value={year}>
                {year}
              </option>
            ))}
          </select>

          {/* Selector de mes solo en vista mensual */}
          {timePeriod === "monthly" && (
            <select
              className="border rounded px-2 py-1 text-sm bg-background"
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(Number(e.target.value))}
            >
              {monthNames.map((name, index) => (
                <option key={index} value={index}>
                  {name}
                </option>
              ))}
            </select>
          )}
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {kpiCards.map(({ title, value, Icon, color }) => (
          <Card key={title}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{title}</CardTitle>
              <Icon className={`h-4 w-4 ${color}`} />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{value}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
          <CardHeader>
            <CardTitle>Estado de Labores</CardTitle>
          </CardHeader>
          <CardContent>
            {data.chartData.length > 0 ? (
              <div className="h-[300px] w-full">
                <ResponsiveContainer>
                  <PieChart>
                    <Pie
                      data={data.chartData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    >
                      {data.chartData.map((entry, index) => {
                        const statusKey = (Object.keys(STATUS_CONFIG) as TaskStatus[]).find(
                          key => STATUS_CONFIG[key].label === entry.name
                        )
                        return <Cell key={`cell-${index}`} fill={statusKey ? STATUS_CONFIG[statusKey].color : "#8884d8"} />
                      })}
                    </Pie>
                    <Tooltip
                      formatter={(value: number, name: string) => [`${value} labores`, name]}
                    />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-[300px] text-center text-muted-foreground">
                <Wrench className="h-12 w-12 text-gray-400" />
                <p className="mt-2 text-sm">No hay datos para el período seleccionado.</p>
              </div>
            )}
          </CardContent>
      </Card>
    </div>
  )
}


export function TaskAnalytics({ tasks }: { tasks: Task[] }) {
  const tasksBySchedule = useMemo(() => {
    const grouped: Record<Schedule, Task[]> = {
      'Maquinaria': [],
      'Mantenimiento Locativo': [],
      'Partes Altas': [],
      'Equipo de Medición': [],
    };
    tasks.forEach(task => {
      if (grouped[task.schedule]) {
        grouped[task.schedule].push(task);
      }
    });
    return grouped;
  }, [tasks]);

  return (
    <Tabs defaultValue="Maquinaria" className="w-full">
      <TabsList className="grid w-full grid-cols-2 md:grid-cols-4 h-auto">
        {schedules.map(schedule => (
          <TabsTrigger key={schedule} value={schedule} className="w-full">
            {schedule}
          </TabsTrigger>
        ))}
      </TabsList>
      {schedules.map(schedule => (
        <TabsContent key={schedule} value={schedule} className="mt-4">
          <ScheduleAnalytics
            schedule={schedule}
            tasks={tasksBySchedule[schedule]}
          />
        </TabsContent>
      ))}
    </Tabs>
  )
}