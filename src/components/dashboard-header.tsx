import { useState, useMemo } from "react"
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
  const { query, setQuery, suggestions } = useDashboardSearch()

  const [showSuggestions, setShowSuggestions] = useState(false)

  let placeholder = "Buscar..."
  if (pathname.startsWith("/dashboard/tasks")) {
    placeholder = "Buscar tareas..."
  } else if (pathname.startsWith("/dashboard/forms")) {
    placeholder = "Buscar formularios..."
  } else if (pathname.startsWith("/dashboard/equipos")) {
    placeholder = "Buscar equipos..."
  }

  const handleLogout = async () => {
    await logOut()
    router.push('/login')
  }

  // Filtrar sugerencias según el texto y la sección actual
  const filteredSuggestions = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return []

    let typeFilter: "task" | "form" | "equipo" | null = null
    if (pathname.startsWith("/dashboard/tasks")) typeFilter = "task"
    else if (pathname.startsWith("/dashboard/forms")) typeFilter = "form"
    else if (pathname.startsWith("/dashboard/equipos")) typeFilter = "equipo"

    return suggestions
      .filter((s) => !typeFilter || s.type === typeFilter)
      .filter((s) => s.label.toLowerCase().includes(q))
      .slice(0, 10)
  }, [suggestions, query, pathname])

  const handleSelectSuggestion = (label: string, route?: string) => {
    setQuery(label)
    setShowSuggestions(false)
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
              handleSelectSuggestion(first.label, first.route)
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
              }}
              onFocus={() => {
                if (query.trim()) setShowSuggestions(true)
              }}
              onBlur={() => {
                // Dar tiempo a hacer click en sugerencia
                setTimeout(() => setShowSuggestions(false), 150)
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  const first = filteredSuggestions[0]
                  if (first) {
                    e.preventDefault()
                    handleSelectSuggestion(first.label, first.route)
                  }
                }
              }}
              className="w-full appearance-none bg-background pl-8 shadow-none md:w-2/3 lg:w-1/3"
            />

            {showSuggestions && filteredSuggestions.length > 0 && (
              <div className="absolute z-20 mt-1 max-h-56 w-full overflow-auto rounded-md border bg-popover text-xs shadow-md">
                {filteredSuggestions.map((s) => (
                  <button
                    key={s.id}
                    type="button"
                    className="flex w-full flex-col items-start px-2 py-1.5 text-left hover:bg-accent"
                    onMouseDown={(ev) => {
                      ev.preventDefault()
                      handleSelectSuggestion(s.label, s.route)
                    }}
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
