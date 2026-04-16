import { useState, useMemo, useEffect } from "react"
import { LogOut, Search } from "lucide-react"
import { NotificationBadge } from "@/components/notification-badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { SidebarTrigger } from "@/components/ui/sidebar"
import { useRouter, usePathname } from "next/navigation"
import { logOut } from "@/firebase/auth/auth-service"
import { useDashboardSearch } from "@/context/dashboard-search-context"

export function DashboardHeader() {
  const router = useRouter()
  const pathname = usePathname()
  const { query, setQuery, suggestions, /* highlightedSuggestionId, */ setHighlightedSuggestionId } = useDashboardSearch()
  const [hoveredSuggestionId, setHoveredSuggestionId] = useState<string | null>(null)
  const [selectedIndex, setSelectedIndex] = useState<number>(-1)

  const [showSuggestions, setShowSuggestions] = useState(false)

  let placeholder = "Buscar..."
  if (pathname.startsWith("/dashboard/tasks")) {
    placeholder = "Buscar tareas..."
  } else if (pathname.startsWith("/dashboard/forms")) {
    placeholder = "Buscar formularios..."
  } else if (pathname.startsWith("/dashboard/equipos")) {
    placeholder = "Buscar equipos..."
  } else if (pathname.startsWith("/dashboard/inventario")) {
    placeholder = "Buscar repuestos..."
  }

  const handleLogout = async () => {
    await logOut()
    router.push('/login')
  }

  // Filtrar sugerencias según el texto y el módulo activo. Solo mostramos
  // sugerencias relevantes al módulo actual (p. ej. solo `equipo` cuando
  // estamos en /dashboard/equipos). En la ruta principal mostramos todo.
  const filteredSuggestions = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return []

    // Determinar tipos permitidos según la ruta
    const allowedTypes: string[] = []
    if (pathname.startsWith("/dashboard/tasks")) allowedTypes.push("task")
    else if (pathname.startsWith("/dashboard/forms")) allowedTypes.push("form")
    else if (pathname.startsWith("/dashboard/equipos")) allowedTypes.push("equipo")
    else if (pathname.startsWith("/dashboard/inventario")) allowedTypes.push("repuesto")
    else if (pathname.startsWith("/dashboard/zonas")) allowedTypes.push("zona")
    else {
      // Rutas fuera de módulos específicos (p. ej. /dashboard) muestran todo
      allowedTypes.push("task", "form", "equipo", "repuesto", "zona")
    }

    return suggestions
      .filter((s) => allowedTypes.includes(s.type) && s.label.toLowerCase().includes(q))
      .slice(0, 10)
  }, [suggestions, query, pathname])

  // We DO NOT auto-set highlightedSuggestionId when suggestions appear (typing).
  // Only set highlighted suggestion when the user confirms selection (Enter or click).
  useEffect(() => {
    if (!showSuggestions) {
      setHoveredSuggestionId(null)
      setSelectedIndex(-1)
    }
  }, [showSuggestions])

  // Reset selected index when filtered suggestions change
  useEffect(() => {
    setSelectedIndex(-1)
  }, [filteredSuggestions])

  const handleSelectSuggestion = (label: string, route?: string, id?: string) => {
    setQuery(label)
    setShowSuggestions(false)
    if (id) {
      setHighlightedSuggestionId(id)
    }
    if (route) {
      router.push(route)
    }
  }

  return (
    <header className="flex h-14 items-center gap-4 border-b bg-card px-4 lg:h-[60px] lg:px-6 sticky top-0 z-30">
        <SidebarTrigger className="shrink-0" />
      <div className="w-full flex-1">
        <form
          onSubmit={(e) => {
            e.preventDefault()
            const first = filteredSuggestions[0]
            if (first) {
              handleSelectSuggestion(first.label, first.route, first.id)
            }
          }}
        >
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              type="search"
              placeholder={placeholder}
              value={query}
              onChange={(e) => {
                setQuery(e.target.value)
                setShowSuggestions(true)
                setSelectedIndex(-1)
              }}
              onFocus={() => {
                if (query.trim()) setShowSuggestions(true)
              }}
              onBlur={() => {
                // Dar tiempo a hacer click en sugerencia
                setTimeout(() => setShowSuggestions(false), 150)
              }}
              onKeyDown={(e) => {
                if (e.key === 'ArrowDown') {
                  e.preventDefault()
                  setSelectedIndex((prev) =>
                    prev < filteredSuggestions.length - 1 ? prev + 1 : prev
                  )
                } else if (e.key === 'ArrowUp') {
                  e.preventDefault()
                  setSelectedIndex((prev) => (prev > 0 ? prev - 1 : -1))
                } else if (e.key === 'Enter') {
                  e.preventDefault()
                  if (selectedIndex >= 0 && filteredSuggestions[selectedIndex]) {
                    const selected = filteredSuggestions[selectedIndex]
                    handleSelectSuggestion(selected.label, selected.route, selected.id)
                  } else {
                    const first = filteredSuggestions[0]
                    if (first) {
                      handleSelectSuggestion(first.label, first.route, first.id)
                    }
                  }
                } else if (e.key === 'Escape') {
                  setShowSuggestions(false)
                }
              }}
              className="w-full appearance-none bg-background pl-8 shadow-none md:w-2/3 lg:w-1/3"
            />

            {showSuggestions && filteredSuggestions.length > 0 && (
              <div className="absolute z-20 mt-1 max-h-56 w-full overflow-auto rounded-md border bg-popover text-xs shadow-md">
                {filteredSuggestions.map((s, index) => (
                  <button
                    key={s.id}
                    type="button"
                    className={`flex w-full flex-col items-start px-2 py-1.5 text-left hover:bg-accent ${
                      index === selectedIndex ? 'bg-accent' : ''
                    } ${hoveredSuggestionId === s.id ? 'bg-accent/70' : ''}`}
                    onMouseDown={(ev) => {
                      ev.preventDefault()
                      handleSelectSuggestion(s.label, s.route, s.id)
                    }}
                    onMouseEnter={() => {
                      setHoveredSuggestionId(s.id)
                      setSelectedIndex(index)
                    }}
                    onMouseLeave={() => setHoveredSuggestionId(null)}
                  >
                    <span className="font-medium">{s.label}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </form>
      </div>

      <NotificationBadge />
      <Button
        variant="secondary"
        size="icon"
        onClick={handleLogout}
        className="rounded-full bg-yellow-400 text-black hover:bg-yellow-500"
      >
        <LogOut className="h-5 w-5" />
        <span className="sr-only">Cerrar sesión</span>
      </Button>
    </header>
  )
}
