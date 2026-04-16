"use client"
import * as React from "react"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { ClipboardList, LayoutGrid, Wrench, MapPin } from "lucide-react"
import { DashboardSearchProvider } from "@/context/dashboard-search-context";
import { GlobalSearchSuggestions } from "@/components/global-search-suggestions"
import { useIsMobile } from "@/hooks/use-mobile"


import { cn } from "@/lib/utils"
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

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const pathname = usePathname()
  const router = useRouter()
  const { user, loading } = useUser()
  const isMobile = useIsMobile()
  const [sidebarOpen, setSidebarOpen] = React.useState(true)

  React.useEffect(() => {
    if (!loading && !user) {
      router.replace("/login")
    }
  }, [loading, user, router])

  // Auto-collapse sidebar on mobile
  React.useEffect(() => {
    if (isMobile) {
      setSidebarOpen(false)
    } else {
      setSidebarOpen(true)
    }
  }, [isMobile])

  // Mientras carga el usuario o aún no tenemos sesión, mostrar pantalla de espera
  if (loading || (!user && typeof window !== "undefined")) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <p className="text-sm text-muted-foreground">Verificando sesión...</p>
      </div>
    )
  }

  const navItems = [
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
            {children}
          </main>
        </DashboardSearchProvider>
      </SidebarInset>
    </SidebarProvider>
  )
}