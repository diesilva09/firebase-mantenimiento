"use client"

import { useMemo, useEffect } from "react"
import { useParams } from "next/navigation"
import { forms } from "@/lib/data"
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { ArrowLeft } from "lucide-react"
import { useUserRole } from "@/context/user-role-context"
import { useRouter } from "next/navigation"

// Import all form components
import { EquipmentInspectionForm } from "../_components/equipment-inspection-form"
import { MaintenanceOrderForm } from "../_components/maintenance-order-form"
import { StopOperationsForm } from "../_components/stop-operations-form"
import { ConsumptionForm } from "../_components/consumption-form"
import { SparesRequestForm } from "../_components/spares-request-form"
 
import { MaintenanceMinuteForm } from "../_components/maintenance-minute-form"
import { SolicitudesMantenimientoForm } from "../_components/solicitudes-mantenimiento-form"

const formComponents = {
  "inspeccion-equipos": EquipmentInspectionForm,
  "orden-mantenimiento": MaintenanceOrderForm,
  "paradas-operativas": StopOperationsForm,
  "consumo-diario": ConsumptionForm,
  "solicitud-repuestos": SparesRequestForm,
  "minuta-mtto": MaintenanceMinuteForm,
  "solicitudes-mantenimiento": SolicitudesMantenimientoForm,
}

export default function DynamicFormPage() {
  const params = useParams()
  const slug = params.slug as keyof typeof formComponents
  const router = useRouter()
  const { userRole, roleLoading } = useUserRole()

  // Redirigir si es INVITADO y no está en el formulario correcto
  useEffect(() => {
    if (!roleLoading && userRole?.role === 'INVITADO' && slug !== 'solicitudes-mantenimiento') {
      router.replace('/dashboard/forms/solicitudes-mantenimiento')
    }
  }, [userRole?.role, slug, roleLoading, router])

  const formInfo = useMemo(() => forms.find((f) => f.slug === slug), [slug])
  const FormComponent = formComponents[slug]

  // Mientras carga el rol, mostrar pantalla de espera
  if (roleLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <p className="text-sm text-muted-foreground">Verificando sesión...</p>
      </div>
    )
  }

  if (!formInfo || !FormComponent) {
    return (
      <div className="text-center py-10">
        <h1 className="text-2xl font-bold">Formulario no encontrado</h1>
        <p className="text-muted-foreground">El formulario que buscas no existe o ha sido movido.</p>
        <Button asChild variant="link" className="mt-4">
            <Link href="/dashboard/forms">Volver a Formularios</Link>
        </Button>
      </div>
    )
  }

  const isWideForm = slug === "paradas-operativas"

  return (
    <div className={isWideForm ? "mx-auto w-full max-w-7xl px-2 sm:px-4" : "mx-auto max-w-4xl"}>
        <div className="mb-6">
            <Button asChild variant="outline" size="sm">
                <Link href="/dashboard/forms">
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Volver a Formularios
                </Link>
            </Button>
        </div>
      <Card className={isWideForm ? "shadow-sm" : undefined}>
        <CardHeader className={isWideForm ? "pb-4" : undefined}>
          <CardTitle className="text-2xl">{formInfo.title}</CardTitle>
          <CardDescription>{formInfo.description}</CardDescription>
        </CardHeader>
        <CardContent className={isWideForm ? "px-4 pb-8 sm:px-8" : undefined}>
          <FormComponent />
        </CardContent>
      </Card>
    </div>
  )
}