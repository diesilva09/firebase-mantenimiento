"use client"

import { useState } from "react"
import type { RegistroLineaProduccion } from "@/lib/paradas-operativas/types"
import { ParadasGlobalReport } from "./paradas-global-report"
import { ParadasLineList } from "./paradas-line-list"
import { ParadasLineReport } from "./paradas-line-report"

type DashboardView = "listado" | "linea" | "global"

interface ParadasDashboardProps {
  registros: RegistroLineaProduccion[]
  lineasPersonalizadas: string[]
  onEliminarLineaPersonalizada?: (nombre: string) => Promise<void>
}

export function ParadasDashboard({
  registros,
  lineasPersonalizadas,
  onEliminarLineaPersonalizada,
}: ParadasDashboardProps) {
  const [vista, setVista] = useState<DashboardView>("listado")
  const [lineaSeleccionada, setLineaSeleccionada] = useState<string | null>(null)

  if (vista === "global") {
    return (
      <ParadasGlobalReport
        registros={registros}
        lineasPersonalizadas={lineasPersonalizadas}
        onVolver={() => setVista("listado")}
      />
    )
  }

  if (vista === "linea" && lineaSeleccionada) {
    return (
      <ParadasLineReport
        lineaKey={lineaSeleccionada}
        registros={registros}
        onVolver={() => {
          setLineaSeleccionada(null)
          setVista("listado")
        }}
      />
    )
  }

  return (
    <ParadasLineList
      registros={registros}
      lineasPersonalizadas={lineasPersonalizadas}
      onSeleccionar={(linea) => {
        setLineaSeleccionada(linea)
        setVista("linea")
      }}
      onVerInformeGlobal={() => setVista("global")}
      onEliminarLineaPersonalizada={onEliminarLineaPersonalizada}
    />
  )
}
