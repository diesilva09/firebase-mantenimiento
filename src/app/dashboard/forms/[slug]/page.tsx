"use client"

import { useMemo } from "react"
import { useParams } from "next/navigation"
import { forms } from "@/lib/data"
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { ArrowLeft } from "lucide-react"

// Import all form components
import { EquipmentInspectionForm } from "../_components/equipment-inspection-form"
import { MaintenanceOrderForm } from "../_components/maintenance-order-form"
import { StopOperationsForm } from "../_components/stop-operations-form"
import { ConsumptionForm } from "../_components/consumption-form"
import { SparesRequestForm } from "../_components/spares-request-form"
 
import { MaintenanceMinuteForm } from "../_components/maintenance-minute-form"

const formComponents = {
  "inspeccion-equipos": EquipmentInspectionForm,
  "orden-mantenimiento": MaintenanceOrderForm,
  "paradas-operativas": StopOperationsForm,
  "consumo-diario": ConsumptionForm,
  "solicitud-repuestos": SparesRequestForm,
  "minuta-mtto": MaintenanceMinuteForm,
}

export default function DynamicFormPage() {
  const params = useParams()
  const slug = params.slug as keyof typeof formComponents

  const formInfo = useMemo(() => forms.find((f) => f.slug === slug), [slug])
  const FormComponent = formComponents[slug]

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

  return (
    <div className="max-w-4xl mx-auto">
        <div className="mb-6">
            <Button asChild variant="outline" size="sm">
                <Link href="/dashboard/forms">
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Volver a Formularios
                </Link>
            </Button>
        </div>
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl">{formInfo.title}</CardTitle>
          <CardDescription>{formInfo.description}</CardDescription>
        </CardHeader>
        <CardContent>
          <FormComponent />
        </CardContent>
      </Card>
    </div>
  )
}
