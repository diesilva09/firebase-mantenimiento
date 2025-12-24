"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";


import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { MoreHorizontal } from "lucide-react";
import { useUser } from "@/firebase/auth/use-user";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useDashboardSearch, SearchSuggestion } from "@/context/dashboard-search-context";

const AREAS_PARTES_ALTAS = [
  "Planta (Primer Piso)",
  "Planta (Segundo Piso)",
  "Planta",
  "Bodegas",
  "Bodegas y Muelles",
  "Muelles",
  "Fachada",
  "General / Sin área específica",
] as const;

const AREAS_LOCATIVO = [
  "Ingreso a Planta",
  "Envasado Frutos",
  "Encajado",
  "Envasado Salsas",
  "Ingreso Preparación",
  "Preparación",
  "Materia Prima",
  "Producto Terminado",
  "Producción",
  "Áreas Comunes Producción",
  "PTAR",
  "Administración",
  "Vestier",
  "Casino",
  "Servicios de Apoyo",
  "Lagarde",
  "General / Sin área específica"
] as const;

type ZonaTipo = "PARTES_ALTAS" | "LOCATIVO";

interface Zona {
  id: string;
  tipo: ZonaTipo;
  area: string | null;
  codigo: string | null;
  nombre: string;
}

export function ZonasPageClient() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const selectedZonaCodigoFromQuery = searchParams.get("selectedZonaCodigo") || null;

  const [tipo, setTipo] = useState<ZonaTipo>("PARTES_ALTAS");
  const [area, setArea] = useState<string | null>(null);

  const { toast } = useToast();
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const [codigo, setCodigo] = useState("");
  const [nombre, setNombre] = useState("");
  const [areaInput, setAreaInput] = useState("");
  const [saving, setSaving] = useState(false);
  const [zonas, setZonas] = useState<Zona[]>([]);
  const [loadingZonas, setLoadingZonas] = useState(false);
  const [editingZona, setEditingZona] = useState<Zona | null>(null);

  const { user } = useUser();

  const [isAdmin, setIsAdmin] = useState(false);
  const [userEmail, setUserEmail] = useState<string | null>(null);

  const { setSuggestions } = useDashboardSearch();

  const [deleteTarget, setDeleteTarget] = useState<Zona | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [checkingAdmin, setCheckingAdmin] = useState(true);

  const [codigoDuplicado, setCodigoDuplicado] = useState(false);

  // Estado para mantener el resaltado de la zona buscada
  const [highlightedZonaCodigo, setHighlightedZonaCodigo] = useState<string | null>(null);

  useEffect(() => {
    const fetchZonas = async () => {
      try {
        setLoadingZonas(true);

        // Cargar TODAS las zonas para poder validar códigos duplicados globalmente
        const res = await fetch(`/api/zonas`);
        if (!res.ok) {
          console.warn("Error cargando zonas");
          setZonas([]);
          return;
        }

        const json = await res.json();
        const data = Array.isArray(json?.data) ? json.data : [];
        setZonas(data);
      } catch (e) {
        console.error("Error cargando zonas", e);
        setZonas([]);
      } finally {
        setLoadingZonas(false);
      }
    };

    fetchZonas();
  }, []); // Se ejecuta solo al montar el componente

  // Registrar sugerencias globales para zonas con rutas de navegación
  useEffect(() => {
    const items: SearchSuggestion[] = zonas.map((z) => {
      const areaPart = z.area ? ` - ${z.area}` : "";
      const tipoPart = z.tipo === "PARTES_ALTAS" ? " (Partes Altas)" : " (Locativo)";
      const label = `${z.codigo || "SIN-COD"}${areaPart} - ${z.nombre}${tipoPart}`;

      return {
        id: z.id,
        label,
        type: "zona",
        route: `/dashboard/zonas?selectedZonaCodigo=${encodeURIComponent(z.codigo || z.id)}`,
      };
    });
    
    setSuggestions((prev) => {
      const others = prev.filter((s) => s.type !== "zona");
      return [...others, ...items];
    });
  }, [zonas, setSuggestions]);

  useEffect(() => {
    let mounted = true;

    async function checkAdmin() {
      setCheckingAdmin(true);
      const email = user?.email?.toLowerCase().trim();
      setUserEmail(email || null);

      try {
        if (user) {
          // Validar rol desde backend para mayor seguridad
          const response = await fetch('/api/auth/role', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              email: user.email,
              uid: user.uid,
            }),
          });

          if (response.ok) {
            const roleData = await response.json();
            if (mounted) setIsAdmin(roleData.isAdmin);
          } else {
            // Fallback a verificación local si la API falla
            if (email) {
              const adminEnv = (process.env.NEXT_PUBLIC_ADMIN_EMAILS || '')
                .split(',')
                .map((s) => s.trim().toLowerCase())
                .filter(Boolean);

              const isEnvAdmin = adminEnv.includes(email);
              if (mounted) setIsAdmin(isEnvAdmin);
            } else {
              if (mounted) setIsAdmin(false);
            }
          }
        } else {
          if (mounted) setIsAdmin(false);
        }
      } catch (error) {
        console.error('Error verificando rol de usuario:', error);
        // Fallback seguro
        if (email) {
          const adminEnv = (process.env.NEXT_PUBLIC_ADMIN_EMAILS || '')
            .split(',')
            .map((s) => s.trim().toLowerCase())
            .filter(Boolean);

          const isEnvAdmin = adminEnv.includes(email);
          if (mounted) setIsAdmin(isEnvAdmin);
        } else {
          if (mounted) setIsAdmin(false);
        }
      } finally {
        if (mounted) setCheckingAdmin(false);
      }
    }

    checkAdmin();
    return () => {
      mounted = false;
    };
  }, [user]);

  // Si venimos desde el buscador global con una zona seleccionada,
  // expandir el tipo y área correctos para que la zona sea visible
  useEffect(() => {
    if (!selectedZonaCodigoFromQuery) return;
    if (!zonas || zonas.length === 0) return;

    const target = zonas.find((z) => z.codigo === selectedZonaCodigoFromQuery || z.id === selectedZonaCodigoFromQuery);
    if (!target) return;

    // Cambiar al tipo correcto (PARTES_ALTAS o LOCATIVO)
    setTipo(target.tipo);

    // Seleccionar el área correspondiente si existe
    if (target.area) {
      setArea(target.area);
    }

    // Marcar esta zona como resaltada
    setHighlightedZonaCodigo(target.codigo || target.id);
  }, [selectedZonaCodigoFromQuery, zonas]);

  // Hacer scroll automático hasta la fila de la zona buscada
  useEffect(() => {
    if (!selectedZonaCodigoFromQuery) return;
    if (typeof document === 'undefined' || typeof window === 'undefined') return;

    const elementId = `zona-${selectedZonaCodigoFromQuery}`;

    const tryScroll = () => {
      const el = document.getElementById(elementId);

      if (!el) return false;

      el.scrollIntoView({ behavior: 'smooth', block: 'center' });

      // Limpiar selectedZonaCodigo de la URL usando replaceState para no perder el scroll
      const params = new URLSearchParams(window.location.search);
      params.delete('selectedZonaCodigo');
      const queryString = params.toString();
      const newUrl = queryString ? `/dashboard/zonas?${queryString}` : '/dashboard/zonas';
      window.history.replaceState(null, '', newUrl);

      return true;
    };

    // Intentar inmediatamente y, si aún no está montado, reintentar después de un delay
    if (!tryScroll()) {
      const timeout = setTimeout(() => {
        tryScroll();
      }, 300);

      return () => clearTimeout(timeout);
    }
  }, [selectedZonaCodigoFromQuery, zonas]);

  // Validación en vivo: evitar códigos de zona duplicados
  useEffect(() => {
    const raw = (codigo || "").toString().trim().toLowerCase();

    if (!raw) {
      setCodigoDuplicado(false);
      return;
    }

    const hasDuplicate = zonas.some((z) => {
      const zCodigo = (z.codigo || "").toString().trim().toLowerCase();
      if (editingZona && z.id === editingZona.id) return false;
      return zCodigo === raw;
    });

    setCodigoDuplicado(hasDuplicate);
  }, [codigo, zonas, editingZona]);

  const areasForTipo =
    tipo === "PARTES_ALTAS" ? AREAS_PARTES_ALTAS : AREAS_LOCATIVO;

  // Filtramos las zonas en el cliente para la visualización, pero mantenemos 'zonas' con todo para validación
  const filteredZonas = zonas.filter((z) => {
    if (z.tipo !== tipo) return false;
    if (area && z.area !== area) return false;
    return true;
  });

  const handleOpenDialog = () => {
    setEditingZona(null);
    setCodigo("");
    setNombre("");
    setAreaInput(area ?? ""); // si hay área seleccionada, la sugerimos
    setIsDialogOpen(true);
  };

  const handleSaveZona = async () => {
    if (codigoDuplicado) {
      toast({
        title: "Código duplicado",
        description: "El código ingresado ya existe en esta lista.",
        variant: "destructive",
      });
      return;
    }

    if (!nombre.trim()) {
      toast({
        title: "Falta nombre",
        description: "El nombre de la zona es obligatorio.",
        variant: "destructive",
      });
      return;
    }

    setSaving(true);
    try {
      const body = {
        id: editingZona?.id,
        tipo, // PARTES_ALTAS o LOCATIVO (según tab)
        area: areaInput || null,
        codigo: codigo || null,
        nombre: nombre.trim(),
      };

      const method = editingZona ? "PUT" : "POST";

      const res = await fetch("/api/zonas", {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        throw new Error(
          json?.error || (editingZona ? "Error actualizando zona" : "Error creando zona")
        );
      }

      const json = await res.json().catch(() => ({}));
      const updated = json?.data;

      if (updated) {
        if (editingZona) {
          setZonas((prev) => prev.map((z) => (z.id === updated.id ? updated : z)));
        } else {
          setZonas((prev) => [...prev, updated]);
        }
      }

      toast({
        title: editingZona ? "Zona actualizada" : "Zona registrada",
        description: editingZona
          ? "La zona se ha actualizado correctamente."
          : "La zona se ha guardado correctamente.",
      });

      setIsDialogOpen(false);
      setEditingZona(null);

      // opcional: sincronizar el filtro de área con lo que se guardó
      setArea(areaInput || null);
    } catch (e: any) {
      toast({
        title: "Error al registrar zona",
        description: e?.message || "No se pudo crear la zona.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleEditZona = (zona: Zona) => {
    setEditingZona(zona);
    setCodigo(zona.codigo || "");
    setNombre(zona.nombre || "");
    setAreaInput(zona.area || "");
    setTipo(zona.tipo); // cambia la pestaña si hace falta
    setIsDialogOpen(true);
  };

  const performDeleteZona = async () => {
  if (!deleteTarget) return;

  try {
    setDeleteLoading(true);

    const res = await fetch(`/api/zonas?id=${deleteTarget.id}`, {
      method: "DELETE",
    });
    if (!res.ok) {
      const json = await res.json().catch(() => ({}));
      throw new Error(json?.error || "Error eliminando zona");
    }

    setZonas((prev) => prev.filter((z) => z.id !== deleteTarget.id));

    toast({
      title: "Zona eliminada",
      description: "La zona se ha eliminado correctamente.",
    });

    setDeleteTarget(null);
  } catch (e: any) {
    toast({
      title: "Error al eliminar zona",
      description: e?.message || "No se pudo eliminar la zona.",
      variant: "destructive",
    });
  } finally {
    setDeleteLoading(false);
  }
};

  const handleOpenMantenimientos = (zona: Zona) => {
    if (!zona.codigo) {
      toast({
        title: "Sin código de zona",
        description:
          "Esta zona no tiene código asignado. Asigna un código para ver su historial de mantenimientos.",
        variant: "destructive",
      });
      return;
    }

    router.push(`/dashboard/zonas/${encodeURIComponent(zona.codigo)}`);
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-2">
        <h1 className="text-2xl font-bold">Locativo</h1>
        {isAdmin && (
          <Button onClick={handleOpenDialog}>Registrar zona</Button>
        )}
      </div>

      <Tabs
        value={tipo}
        onValueChange={(v) => {
          setTipo(v as ZonaTipo)
          // Al cambiar de tipo (Partes Altas / Locativo) reiniciamos el filtro de área
          // para que siempre empiece en "Todas las áreas" y evitar estados raros.
          setArea(null)
        }}
      >
        <TabsList>
          <TabsTrigger value="PARTES_ALTAS">Partes Altas</TabsTrigger>
          <TabsTrigger value="LOCATIVO">Mantenimiento Locativo</TabsTrigger>
        </TabsList>

        <div className="mt-4 flex items-center gap-4">
          <div className="w-60">
            <select
              className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm focus-visible:outline-none"
              value={area ?? "ALL"}
              onChange={(e) => {
                const value = e.target.value
                if (value === "ALL") {
                  setArea(null)
                } else {
                  setArea(value)
                }
              }}
            >
              <option value="ALL">Todas las áreas</option>
              {areasForTipo.map((a) => (
                <option key={a} value={a}>
                  {a}
                </option>
              ))}
            </select>
          </div>
        </div>

        <TabsContent value="PARTES_ALTAS" className="mt-4">
          {loadingZonas ? (
            <p className="text-sm text-muted-foreground">Cargando zonas...</p>
          ) : filteredZonas.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No hay zonas registradas para este tipo/área.
            </p>
          ) : (
            <div className="rounded-md border bg-blue-50 max-h-[500px] overflow-y-auto overscroll-contain scroll-smooth">
              <table className="w-full text-sm">
                <thead className="bg-blue-50 text-blue-700">
                  <tr>
                    <th className="px-3 py-2 text-left">Área</th>
                    <th className="px-3 py-2 text-left">Código</th>
                    <th className="px-3 py-2 text-left">Nombre</th>
                    {isAdmin && <th className="px-3 py-2 text-right">Acciones</th>}
                  </tr>
                </thead>
                <tbody>
                  {filteredZonas.map((z) => {
                    const isHighlighted = highlightedZonaCodigo && (z.codigo === highlightedZonaCodigo || z.id === highlightedZonaCodigo);
                    return (
                      <tr
                        key={z.id}
                        id={`zona-${z.codigo || z.id}`}
                        className={`border-t ${
                          isHighlighted
                            ? "bg-blue-100 ring-2 ring-blue-400"
                            : "bg-white hover:bg-gray-50"
                        }`}
                        onClick={(e) => {
                          // Limpiar el resaltado al hacer clic en cualquier zona
                          if (highlightedZonaCodigo) setHighlightedZonaCodigo(null);
                          e.stopPropagation(); // Evitar propagación de eventos de clic
                        }}
                        style={{ contain: 'layout style paint' }}
                      >
                        <td className="px-3 py-2">{z.area || "—"}</td>
                        <td className="px-3 py-2">{z.codigo || "—"}</td>
                        <td className="px-3 py-2">{z.nombre}</td>

                      {isAdmin ? (
                        <td className="px-3 py-2 text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={(e) => e.stopPropagation()} // Prevenir propagación
                              >
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => handleEditZona(z)}>
                                Editar
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => setDeleteTarget(z)}>
                                Eliminar
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleOpenMantenimientos(z)}>
                                Mantenimientos
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </td>
                      ) : (
                        <td className="px-3 py-2 text-right">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation(); // Prevenir propagación
                              handleOpenMantenimientos(z);
                            }}
                          >
                            Mantenimientos
                          </Button>
                        </td>
                      )}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </TabsContent>

        <TabsContent value="LOCATIVO" className="mt-4">
          {loadingZonas ? (
            <p className="text-sm text-muted-foreground">Cargando zonas...</p>
          ) : filteredZonas.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No hay zonas registradas para este tipo/área.
            </p>
          ) : (
            <div className="rounded-md border bg-green-50 max-h-[600px] overflow-y-auto overscroll-contain scroll-smooth">
              <table className="w-full text-sm">
                <thead className="bg-green-50 text-green-700">
                  <tr>
                    <th className="px-3 py-2 text-left">Área</th>
                    <th className="px-3 py-2 text-left">Código</th>
                    <th className="px-3 py-2 text-left">Nombre</th>
                    {isAdmin && <th className="px-3 py-2 text-right">Acciones</th>}
                  </tr>
                </thead>
                <tbody>
                  {filteredZonas.map((z) => {
                    const isHighlighted = highlightedZonaCodigo && (z.codigo === highlightedZonaCodigo || z.id === highlightedZonaCodigo);
                    return (
                      <tr
                        key={z.id}
                        id={`zona-${z.codigo || z.id}`}
                        className={`border-t ${
                          isHighlighted
                            ? "bg-green-100 ring-2 ring-green-400"
                            : "bg-white hover:bg-gray-50"
                        }`}
                        onClick={(e) => {
                          // Limpiar el resaltado al hacer clic en cualquier zona
                          if (highlightedZonaCodigo) setHighlightedZonaCodigo(null);
                          e.stopPropagation(); // Evitar propagación de eventos de clic
                        }}
                        style={{ contain: 'layout style paint' }}
                      >
                        <td className="px-3 py-2">{z.area || "—"}</td>
                        <td className="px-3 py-2">{z.codigo || "—"}</td>
                        <td className="px-3 py-2">{z.nombre}</td>

                        {isAdmin ? (
                          <td className="px-3 py-2 text-right">
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={(e) => e.stopPropagation()} // Prevenir propagación
                                >
                                  <MoreHorizontal className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => handleEditZona(z)}>
                                  Editar
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => setDeleteTarget(z)}>
                                  Eliminar
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => handleOpenMantenimientos(z)}>
                                  Mantenimientos
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </td>
                        ) : (
                          <td className="px-3 py-2 text-right">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation(); // Prevenir propagación
                                handleOpenMantenimientos(z);
                              }}
                            >
                              Mantenimientos
                            </Button>
                          </td>
                        )}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </TabsContent> 
      </Tabs>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>
              {editingZona ? "Editar zona" : "Registrar nueva zona"}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="zona-tipo">Tipo</Label>
              <Select
                value={tipo}
                onValueChange={(value) => {
                  setTipo(value as ZonaTipo);
                  // When changing the type, reset the area selection to avoid conflicts
                  // between areas that exist in one type but not the other
                  if (!editingZona) {
                    setAreaInput("");
                  }
                }}
                disabled={!!editingZona}
              >
                <SelectTrigger id="zona-tipo">
                  <SelectValue placeholder="Selecciona el tipo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="PARTES_ALTAS">Partes Altas</SelectItem>
                  <SelectItem value="LOCATIVO">Mantenimiento Locativo</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="zona-area">Área</Label>
              <Select
                value={areaInput || "NONE"}
                onValueChange={(value) => {
                  if (value === "NONE") {
                    setAreaInput("");
                  } else {
                    setAreaInput(value);
                  }
                }}
              >
                <SelectTrigger id="zona-area">
                  <SelectValue placeholder="Selecciona un área" />
                </SelectTrigger>
                <SelectContent position="popper" side="bottom" className="max-h-[300px]">
                  <SelectItem value="NONE">Seleccionar área</SelectItem>
                  {areasForTipo.map((a) => (
                    <SelectItem key={a} value={a}>
                      {a}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="zona-codigo">Código</Label>
              <Input
                id="zona-codigo"
                placeholder=""
                value={codigo}
                onChange={(e) => setCodigo(e.target.value)}
                className={codigoDuplicado ? "border-red-500 focus-visible:ring-red-500" : ""}
              />
              {codigoDuplicado && (
                <p className="text-xs text-red-500">Ya existe una zona con este código.</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="zona-nombre">Nombre de la zona</Label>
              <Input
                id="zona-nombre"
                placeholder="Ej: techos"
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
                required
              />
            </div>
          </div>

          <DialogFooter className="mt-4">
            <Button
              variant="outline"
              type="button"
              onClick={() => setIsDialogOpen(false)}
              disabled={saving}
            >
              Cancelar
            </Button>
            <Button type="button" onClick={handleSaveZona} disabled={saving || codigoDuplicado}>
              {saving ? "Guardando..." : codigoDuplicado ? "Código duplicado" : "Guardar zona"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      {deleteTarget && (
        <Dialog
          open={!!deleteTarget}
          onOpenChange={(open) => !open && setDeleteTarget(null)}
        >
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Eliminar zona</DialogTitle>
            </DialogHeader>
            <p className="text-sm text-muted-foreground">
              ¿Seguro que deseas eliminar la zona{" "}
              <span className="font-semibold">"{deleteTarget.nombre}"</span>?
              Esta acción no se puede deshacer.
            </p>
            <DialogFooter className="mt-4">
              <Button
                variant="outline"
                type="button"
                onClick={() => setDeleteTarget(null)}
                disabled={deleteLoading}
              >
                Cancelar
              </Button>
              <Button
                variant="destructive"
                type="button"
                onClick={performDeleteZona}
                disabled={deleteLoading}
              >
                {deleteLoading ? "Eliminando..." : "Eliminar"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
      
    </div>
  );
}
