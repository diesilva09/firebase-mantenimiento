"use client"

import * as React from "react"
import { Bar, BarChart, CartesianGrid, XAxis, YAxis, Pie, PieChart, Cell, Line, LineChart, ResponsiveContainer, Legend, Tooltip } from "recharts"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ChartContainer, ChartTooltipContent } from "@/components/ui/chart"
import { Submission, Task } from "@/lib/types"
import { getAllSubmissions } from "@/lib/submissions-service"

interface StatisticsViewProps {
  submissions: Submission[];
  tasks: Task[];
}

const COLORS = ["#89BBEF", "#4A639A", "#F87171", "#34D399", "#FBBF24"];

export function StatisticsView({ submissions, tasks }: StatisticsViewProps) {
  const [allSubmissions, setAllSubmissions] = React.useState<Submission[]>([])
  const [loading, setLoading] = React.useState(true)

  React.useEffect(() => {
    let mounted = true

    async function load() {
      try {
        const data = await getAllSubmissions()
        if (mounted && data.length) {
          setAllSubmissions(data)
        }
      } finally {
        if (mounted) setLoading(false)
      }
    }

    load()
    return () => {
      mounted = false
    }
  }, [])

  // Usar solo los datos reales cargados desde la BD. Si no hay nada en BD,
  // las gráficas de consumo quedarán vacías (sin usar datos de ejemplo).
  const effectiveSubmissions = allSubmissions

  const waterKeys = [
    "aguaCalderaManana",
    "aguaCalderaTarde",
    "aguaSalsasManana",
    "aguaSalsasTarde",
    "aguaFrutosManana",
    "aguaFrutosTarde",
    "aguaAutoclaveManana",
    "aguaAutoclaveTarde",
    "aguaContadorPrincipal",
  ]

  const waterServiceKeys = [
    "Agua Caldera Mañana (m³)",
    "Agua Caldera Tarde (m³)",
    "Agua Salsas Mañana (m³)",
    "Agua Salsas Tarde (m³)",
    "Agua Frutos Mañana (m³)",
    "Agua Frutos Tarde (m³)",
    "Agua Autoclave Mañana (m³)",
    "Agua Autoclave Tarde (m³)",
    "Agua Principal (m³)",
  ]

  const getTotalWater = (data: Record<string, any>) => {
    const fromDaily = waterKeys.reduce((total, key) => total + (Number(data[key]) || 0), 0)
    const fromServices = waterServiceKeys.reduce((total, key) => total + (Number(data[key]) || 0), 0)
    return fromDaily + fromServices
  }

  const submissionsByForm = effectiveSubmissions.reduce((acc, sub) => {
    acc[sub.formTitle] = (acc[sub.formTitle] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const submissionsChartData = Object.entries(submissionsByForm).map(([name, value]) => ({ name, value }));

  const activeUsers = [...new Set(tasks.map(t => t.assignedTo.name))];

  const dailyConsumption = effectiveSubmissions
    .filter(s => s.form === 'consumo-diario' || s.form === 'consumos-servicios')
    .map(s => {
      const data = s.data as Record<string, any>

      const rawDate =
        (data.fecha as string | undefined) ||
        (data["Fecha"] as string | undefined)

      const energia =
        Number(data.energia ?? data["Energía (kWh)"] ?? 0)

      const gas =
        Number(data.medidorGasPrincipal ?? data["Gas Principal (m³)"] ?? 0)

      return {
        date: rawDate
          ? new Date(rawDate).toLocaleDateString('es-ES', { month: 'short', day: 'numeric' })
          : '',
        energia,
        aguaTotal: getTotalWater(data),
        gas,
      }
    })
    .filter(d => d.date)
    .slice(-7)

  const annualEnergyConsumption = React.useMemo(() => {
    const monthlyEnergy: Record<string, number> = {};
    const monthlyWater: Record<string, number> = {};
    const monthlyGas: Record<string, number> = {};

    effectiveSubmissions
      .filter(s => s.form === 'consumo-diario' || s.form === 'consumos-servicios')
      .forEach(s => {
        const data = s.data as Record<string, any>
        const rawDate =
          (data.fecha as string | undefined) ||
          (data["Fecha"] as string | undefined)

        if (!rawDate) return

        const date = new Date(rawDate);
        const month = date.toLocaleString('es-ES', { month: 'short' });

        if (!monthlyEnergy[month]) {
          monthlyEnergy[month] = 0;
        }
        if (!monthlyWater[month]) {
          monthlyWater[month] = 0;
        }
        if (!monthlyGas[month]) {
          monthlyGas[month] = 0;
        }

        const energia =
          Number(data.energia ?? data["Energía (kWh)"] ?? 0)
        const gas =
          Number(data.medidorGasPrincipal ?? data["Gas Principal (m³)"] ?? 0)

        monthlyEnergy[month] += energia;
        monthlyWater[month] += getTotalWater(data);
        monthlyGas[month] += gas;
      });

    const monthOrder = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
    
    return monthOrder.map(month => ({
      name: month,
      Energia: monthlyEnergy[month] || 0,
      Agua: monthlyWater[month] || 0,
      Gas: monthlyGas[month] || 0,
    }));
  }, [submissions]);

  
  return (
    <div className="grid gap-6 md:grid-cols-1 lg:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle>Respuestas por Formulario</CardTitle>
          <CardDescription>Cantidad de respuestas para cada tipo de formulario.</CardDescription>
        </CardHeader>
        <CardContent>
          <ChartContainer config={{}} className="h-[300px] w-full">
            <ResponsiveContainer>
              <BarChart data={submissionsChartData} margin={{ top: 5, right: 20, left: -10, bottom: 60 }}>
                <CartesianGrid vertical={false} />
                <XAxis dataKey="name" tickLine={false} axisLine={false} tickMargin={8} angle={-45} textAnchor="end" interval={0} />
                <YAxis />
                <Tooltip cursor={{ fill: 'hsl(var(--muted))' }} content={<ChartTooltipContent />} />
                <Bar dataKey="value" fill="hsl(var(--primary))" radius={4} />
              </BarChart>
            </ResponsiveContainer>
          </ChartContainer>
        </CardContent>
      </Card>
      
      
      <Card className="lg:col-span-2">
        <CardHeader>
          <CardTitle>Consumo de Servicios (Últimos 7 Días)</CardTitle>
          <CardDescription>Tendencia de consumo de energía y agua.</CardDescription>
        </CardHeader>
        <CardContent>
          <ChartContainer config={{}} className="h-[300px] w-full">
            <ResponsiveContainer>
              <LineChart data={dailyConsumption}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis yAxisId="left" />
                <YAxis yAxisId="right" orientation="right" />
                <Tooltip content={<ChartTooltipContent />} />
                <Legend />
                <Line yAxisId="left" type="monotone" dataKey="energia" stroke="hsl(var(--primary))" strokeWidth={2} name="Energía (kWh)" />
                <Line yAxisId="right" type="monotone" dataKey="aguaTotal" stroke="hsl(var(--accent))" strokeWidth={2} name="Agua Total (m³)" />
                <Line yAxisId="right" type="monotone" dataKey="gas" stroke="#F97316" strokeWidth={2} strokeDasharray="4 4" name="Gas (m³)" />
              </LineChart>
            </ResponsiveContainer>
          </ChartContainer>
        </CardContent>
      </Card>

      <Card className="lg:col-span-2">
        <CardHeader>
          <CardTitle>Gráfica anual de servicios</CardTitle>
          <CardDescription>Consumo mensual de servicios (energía, agua y gas) durante el año actual.</CardDescription>
        </CardHeader>
        <CardContent>
          <ChartContainer config={{}} className="h-[300px] w-full">
            <ResponsiveContainer>
              <LineChart data={annualEnergyConsumption}>
                <CartesianGrid vertical={false} />
                <XAxis dataKey="name" tickLine={false} axisLine={false} tickMargin={8} />
                <YAxis />
                <Tooltip cursor={{ fill: 'hsl(var(--muted))' }} content={<ChartTooltipContent />} />
                <Legend />
                <Line type="monotone" dataKey="Energia" stroke="hsl(var(--accent))" strokeWidth={2} name="Energía (kWh)" />
                <Line type="monotone" dataKey="Agua" stroke="hsl(var(--primary))" strokeWidth={2} name="Agua Total (m³)" />
                <Line type="monotone" dataKey="Gas" stroke="#F97316" strokeWidth={2} strokeDasharray="4 4" name="Gas (m³)" />
              </LineChart>
            </ResponsiveContainer>
          </ChartContainer>
        </CardContent>
      </Card>

     
    </div>
  )
}
