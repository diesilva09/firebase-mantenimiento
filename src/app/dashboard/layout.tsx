"use client"
import * as React from "react"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { ClipboardList, LayoutGrid, Wrench, MapPin } from "lucide-react"
import { DashboardSearchProvider } from "@/context/dashboard-search-context";
import { GlobalSearchSuggestions } from "@/components/global-search-suggestions"
import { useIsMobile } from "@/hooks/use-mobile"
import { UserRoleProvider, useUserRole } from "@/context/user-role-context"


import {
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarProvider,
  SidebarInset,
} from "@/components/ui/sidebar"
import { DashboardHeader } from "@/components/dashboard-header"
import { Logo } from "@/components/icons"
import { useUser } from "@/firebase/auth/use-user"
import { Box } from "lucide-react"
import { useOfflineNotice } from "@/hooks/use-offline-notice"
import { SectionErrorBoundary } from "@/components/section-error-boundary"

function DashboardContent({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()
  const { user, loading: userLoading } = useUser()
  const isMobile = useIsMobile()
  const [sidebarOpen, setSidebarOpen] = React.useState(true)
  const { userRole, roleLoading } = useUserRole()
  const [redirected, setRedirected] = React.useState(false)
  useOfflineNotice()

  React.useEffect(() => {
    if (!userLoading && !user) {
      router.replace("/login")
    }
  }, [userLoading, user, router])

  // Redirigir a /dashboard/forms si es INVITADO y está en otra página
  React.useEffect(() => {
    if (!userLoading && !roleLoading && userRole?.role === 'INVITADO') {
      if (!pathname.startsWith('/dashboard/forms')) {
        setRedirected(true)
        router.replace('/dashboard/forms')
      } else {
        setRedirected(false)
      }
    }
  }, [userLoading, userRole?.role, pathname, router, roleLoading])

  // Auto-collapse sidebar on mobile
  React.useEffect(() => {
    if (isMobile) {
      setSidebarOpen(false)
    } else {
      setSidebarOpen(true)
    }
  }, [isMobile])

  // Mientras carga el usuario o aún no tenemos sesión, o está cargando el rol, o está redirigiendo, mostrar pantalla de espera
  if (userLoading || roleLoading || (!user && typeof window !== "undefined") || redirected) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <p className="text-sm text-muted-foreground">Verificando sesión...</p>
      </div>
    )
  }

  // Filtrar elementos de navegación según el rol
  const navItems = userRole?.role === 'INVITADO'
    ? [
        {
          href: "/dashboard/forms",
          icon: ClipboardList,
          label: "Formularios",
        },
      ]
    : [
        {
          href: "/dashboard/tasks",
          icon: LayoutGrid,
          label: "Cronogramas",
        },
        {
          href: "/dashboard/forms",
          icon: ClipboardList,
          label: "Formularios",
        },
        {
          href: "/dashboard/equipos",
          icon: Wrench,
          label: "Equipos",
        },
        {
          href: "/dashboard/zonas",
          icon: MapPin,
          label: "Locativo",
        },
        {
          href: "/dashboard/inventario",
          icon: Box,
          label: "Inventario",
        },
      ]

  return (
    <SidebarProvider open={sidebarOpen} onOpenChange={setSidebarOpen}>
      <Sidebar>
        <SidebarHeader className="overflow-hidden">
          <div className="flex items-center gap-2 min-w-0">
            <Logo width={36} height={36} className="shrink-0" />
            <span className="text-lg font-semibold text-foreground truncate">
              Area de Mantenimiento
            </span>
          </div>
        </SidebarHeader>
        <SidebarContent>
          <SidebarMenu>
            {navItems.map((item) => (
              <SidebarMenuItem key={item.href}>
                <SidebarMenuButton
                  asChild
                  isActive={pathname.startsWith(item.href)}
                  tooltip={item.label}
                >
                  <Link href={item.href}>
                    <item.icon />
                    <span>{item.label}</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            ))}
          </SidebarMenu>
        </SidebarContent>
      </Sidebar>
      <SidebarInset>
         <DashboardSearchProvider>
          <GlobalSearchSuggestions />
          <DashboardHeader />
          <main className="p-4 sm:p-6 lg:p-8">
            <SectionErrorBoundary title="Error en esta sección del panel">
              {children}
            </SectionErrorBoundary>
          </main>
        </DashboardSearchProvider>
      </SidebarInset>
    </SidebarProvider>
  )
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <UserRoleProvider>
      <DashboardContent>{children}</DashboardContent>
    </UserRoleProvider>
  )
}
