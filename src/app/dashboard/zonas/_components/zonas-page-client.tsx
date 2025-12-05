"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

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
  "General / sin area específica"
] as const;

function toTitleCase(text: string) {
  return text
    .toLowerCase()
    .split(" ")
    .map((word) =>
      word.length === 0 ? "" : word[0].toUpperCase() + word.slice(1)
    )
    .join(" ");
}

type ZonaTipo = "PARTES_ALTAS" | "LOCATIVO";

export function ZonasPageClient() {
  const [tipo, setTipo] = useState<ZonaTipo>("PARTES_ALTAS");
  const [area, setArea] = useState<string | null>(null);

  const { toast } = useToast();
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const [codigo, setCodigo] = useState("");
  const [nombre, setNombre] = useState("");
  const [areaInput, setAreaInput] = useState("");
  const [saving, setSaving] = useState(false);
  const [zonas, setZonas] = useState<any[]>([]);
  const [loadingZonas, setLoadingZonas] = useState(false);
  const [editingZona, setEditingZona] = useState<any | null>(null);

  const { user } = useUser();
  const router = useRouter();

  const [isAdmin, setIsAdmin] = useState(false);
  const [userEmail, setUserEmail] = useState<string | null>(null);

  const { setSuggestions } = useDashboardSearch();

  useEffect(() => {
    const fetchZonas = async () => {
      try {
        setLoadingZonas(true);

        const params = new URLSearchParams();
        params.set("tipo", tipo);
        if (area) {
          params.set("area", area);
        }

        const res = await fetch(`/api/zonas?${params.toString()}`);
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
  }, [tipo, area]);

  useEffect(() => {
    const items: SearchSuggestion[] = zonas.map((z) => ({
      id: z.id,
      label: `Zona: ${z.nombre} (${z.area || "Sin área"})`,
      type: "task", // reutilizamos el tipo existente
    }));
    setSuggestions(items);
  }, [zonas, setSuggestions]);

  useEffect(() => {
    const rawEmail =
      user?.email ||
      (typeof window !== "undefined" ? localStorage.getItem("userEmail") : null);
    const normalizedEmail = rawEmail ? rawEmail.toLowerCase().trim() : null;
    setUserEmail(normalizedEmail);

    let envSaysAdmin = false;
    if (normalizedEmail) {
      const adminEnv = (process.env.NEXT_PUBLIC_ADMIN_EMAILS || "")
        .split(",")
        .map((s) => s.trim().toLowerCase())
        .filter(Boolean);

      envSaysAdmin = adminEnv.includes(normalizedEmail);
    }

    if (envSaysAdmin) {
      setIsAdmin(true);
      if (typeof window !== "undefined") {
        localStorage.setItem("isAdmin", "true");
        localStorage.setItem("userEmail", normalizedEmail || "");
      }
      return;
    }

    if (typeof window !== "undefined") {
      const localFlag = localStorage.getItem("isAdmin");
      if (localFlag === "true") {
        setIsAdmin(true);
        return;
      }
      if (localFlag === "false") {
        setIsAdmin(false);
        return;
      }
    }

    setIsAdmin(false);
  }, [user]);

  const areasForTipo =
    tipo === "PARTES_ALTAS" ? AREAS_PARTES_ALTAS : AREAS_LOCATIVO;

  const handleOpenDialog = () => {
    setEditingZona(null);
    setCodigo("");
    setNombre("");
    setAreaInput(area ?? ""); // si hay área seleccionada, la sugerimos
    setIsDialogOpen(true);
  };

  const handleSaveZona = async () => {
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

  const handleEditZona = (zona: any) => {
    setEditingZona(zona);
    setCodigo(zona.codigo || "");
    setNombre(zona.nombre || "");
    setAreaInput(zona.area || "");
    setTipo(zona.tipo); // cambia la pestaña si hace falta
    setIsDialogOpen(true);
  };

  const handleDeleteZona = async (zona: any) => {
    if (!window.confirm(`¿Eliminar la zona "${zona.nombre}"?`)) return;

    try {
      const res = await fetch(`/api/zonas?id=${zona.id}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        throw new Error(json?.error || "Error eliminando zona");
      }

      setZonas((prev) => prev.filter((z) => z.id !== zona.id));

      toast({
        title: "Zona eliminada",
        description: "La zona se ha eliminado correctamente.",
      });
    } catch (e: any) {
      toast({
        title: "Error al eliminar zona",
        description: e?.message || "No se pudo eliminar la zona.",
        variant: "destructive",
      });
    }
  };

  const handleOpenMantenimientos = (zona: any) => {
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
        <h1 className="text-2xl font-bold">Zonas</h1>
        <Button onClick={handleOpenDialog}>Registrar zona</Button>
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
                  {tipo === "LOCATIVO" ? toTitleCase(a) : a}
                </option>
              ))}
            </select>
          </div>
        </div>

        <TabsContent value="PARTES_ALTAS" className="mt-4">
          {loadingZonas ? (
            <p className="text-sm text-muted-foreground">Cargando zonas...</p>
          ) : zonas.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No hay zonas registradas para este tipo/área.
            </p>
          ) : (
            <div className="rounded-md border bg-blue-50">
              <table className="w-full text-sm">
                <thead className="bg-blue-50 -blue-700">
                  <tr>
                    <th className="px-3 py-2 text-left">Área</th>
                    <th className="px-3 py-2 text-left">Código</th>
                    <th className="px-3 py-2 text-left">Nombre</th>
                    {isAdmin && <th className="px-3 py-2 text-right">Acciones</th>}
                  </tr>
                </thead>
                <tbody>
                  {zonas.map((z) => (
                    <tr key={z.id} className="border-t bg-white">
                      <td className="px-3 py-2">{z.area || "—"}</td>
                      <td className="px-3 py-2">{z.codigo || "—"}</td>
                      <td className="px-3 py-2">{z.nombre}</td>

                      {isAdmin ? (
                        <td className="px-3 py-2 text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => handleEditZona(z)}>
                                Editar
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleDeleteZona(z)}>
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
                            onClick={() => handleOpenMantenimientos(z)}
                          >
                            Mantenimientos
                          </Button>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </TabsContent>

        <TabsContent value="LOCATIVO" className="mt-4">
          {loadingZonas ? (
            <p className="text-sm text-muted-foreground">Cargando zonas...</p>
          ) : zonas.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No hay zonas registradas para este tipo/área.
            </p>
          ) : (
            <div className="rounded-md border bg-green-50">
              <table className="w-full text-sm">
                <thead className="bg-green-50 -green-700">
                  <tr>
                    <th className="px-3 py-2 text-left">Área</th>
                    <th className="px-3 py-2 text-left">Código</th>
                    <th className="px-3 py-2 text-left">Nombre</th>
                    {isAdmin && <th className="px-3 py-2 text-right">Acciones</th>}
                  </tr>
                </thead>
                <tbody>
                  {zonas.map((z) => (
                    <tr key={z.id} className="border-t bg-white">
                      <td className="px-3 py-2">{z.area || "—"}</td>
                      <td className="px-3 py-2">{z.codigo || "—"}</td>
                      <td className="px-3 py-2">{z.nombre}</td>

                      {isAdmin ? (
                        <td className="px-3 py-2 text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => handleEditZona(z)}>
                                Editar
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleDeleteZona(z)}>
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
                            onClick={() => handleOpenMantenimientos(z)}
                          >
                            Mantenimientos
                          </Button>
                        </td>
                      )}
                    </tr>
                  ))}
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
                onValueChange={(value) => setTipo(value as ZonaTipo)}
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
                  <SelectValue placeholder="Selecciona un área (o déjalo vacío)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="NONE">Seleccionar área</SelectItem>
                  {areasForTipo.map((a) => (
                    <SelectItem key={a} value={a}>
                      {tipo === "LOCATIVO" ? toTitleCase(a) : a}
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
              />
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
            <Button type="button" onClick={handleSaveZona} disabled={saving}>
              {saving ? "Guardando..." : "Guardar zona"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}