"use client"

import { useDashboardSearch, SearchSuggestion } from "@/context/dashboard-search-context"
import { useEffect } from "react"

interface Zona {
  id: string;
  tipo: "PARTES_ALTAS" | "LOCATIVO";
  area: string | null;
  codigo: string | null;
  nombre: string;
}

/**
 * A client component that fetches global data (like zones, equipment, etc.)
 * and populates the dashboard search context with suggestions.
 * This component should be placed within the DashboardSearchProvider.
 */
export function GlobalSearchSuggestions() {
  const { setSuggestions } = useDashboardSearch()

  useEffect(() => {
    async function fetchAndSetZoneSuggestions() {
      try {
        const res = await fetch(`/api/zonas`)
        if (!res.ok) {
          console.warn("GlobalSearch: Failed to fetch zones.")
          return
        }

        const json = await res.json()
        const zonas = (Array.isArray(json?.data) ? json.data : []) as Zona[]

        const items: SearchSuggestion[] = zonas.map((z) => {
          const areaPart = z.area ? ` - ${z.area}` : ""
          const tipoPart = z.tipo === "PARTES_ALTAS" ? " (Partes Altas)" : " (Locativo)"
          const label = `${z.codigo || "SIN-COD"}${areaPart} - ${z.nombre}${tipoPart}`

          return {
            id: z.id,
            label,
            type: "zona",
            route: `/dashboard/zonas?selectedZonaCodigo=${encodeURIComponent(z.codigo || z.id)}`,
          }
        })

        setSuggestions((prev) => {
          // Remove old zone suggestions and add the new ones
          const others = prev.filter((s) => s.type !== "zona")
          return [...others, ...items]
        })
      } catch (error) {
        console.error("GlobalSearch: Error fetching zone suggestions:", error)
      }
    }

    fetchAndSetZoneSuggestions()
  }, [setSuggestions])

  // This component does not render anything itself.
  return null
}
