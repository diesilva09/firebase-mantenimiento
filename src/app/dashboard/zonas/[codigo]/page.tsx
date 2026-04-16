"use client";

import React, { useEffect, useState, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Eye, Trash2, ExternalLink, Image as ImageIcon, FileText } from "lucide-react";
import { useUser } from "@/firebase/auth/use-user";
import { checkUserRole, UserRole } from "@/lib/role-service";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";

interface ZonaHistorialRow {
  id: number;
  fecha: string;
  descripcion: string;
  responsable: string;
  repuestos: string;
  tipo: string;
  observaciones: string;
  imagenAntesUrl?: string | null;
  imagenDespuesUrl?: string | null;
  anexoUrl?: string | null;
}

export default function ZonaDetallePage() {
  const router = useRouter();
  const params = useParams();
  const codigo = params.codigo as string;
  const { user } = useUser();

  const [rows, setRows] = useState<ZonaHistorialRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null);

  // Filtros
  const [tipoFilter, setTipoFilter] = useState<string>("");
  const [startDateFilter, setStartDateFilter] = useState<string>("");
  const [endDateFilter, setEndDateFilter] = useState<string>("");

  // Rol de usuario
  const [userRole, setUserRole] = useState<UserRole | null>(null);
  const [isJefe, setIsJefe] = useState(false);

  // Diálogo de confirmación de eliminación
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteTargetId, setDeleteTargetId] = useState<number | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Verificar rol del usuario
  useEffect(() => {
    const checkRole = async () => {
      if (user) {
        const role = await checkUserRole(user);
        setUserRole(role);
        setIsJefe(role.role === 'JEFE');
      } else {
        setUserRole(null);
        setIsJefe(false);
      }
    };
    checkRole();
  }, [user]);

  const openDeleteDialog = (id: number) => {
    setDeleteTargetId(id);
    setDeleteDialogOpen(true);
  };

  const cancelDelete = () => {
    setDeleteDialogOpen(false);
    setDeleteTargetId(null);
  };

  const confirmDelete = async () => {
    if (!deleteTargetId) return;
    setIsDeleting(true);
    try {
      const res = await fetch(`/api/zonas/historial?id=${deleteTargetId}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        setRows(prev => prev.filter(row => row.id !== deleteTargetId));
        setDeleteDialogOpen(false);
        setDeleteTargetId(null);
      } else {
        console.error('Error eliminando registro');
      }
    } catch (error) {
      console.error('Error eliminando registro:', error);
    } finally {
      setIsDeleting(false);
    }
  };

  useEffect(() => {
    const fetchHistorial = async () => {
      try {
        setLoading(true);
        const res = await fetch(
          `/api/zonas/historial?codigoZona=${encodeURIComponent(codigo)}`,
        );
        if (!res.ok) {
          console.warn("Error cargando historial de zona");
          setRows([]);
          return;
        }

        const json = await res.json().catch(() => ({ data: [] }));
        const data: any[] = Array.isArray(json?.data) ? json.data : [];

        const mapped: ZonaHistorialRow[] = data.map((r) => ({
          id: r.id,
          fecha:
            typeof r.fecha_evento === "string"
              ? r.fecha_evento.slice(0, 10)
              : "",
          descripcion: r.labor ?? "",
          responsable: r.ejecutado_por ?? "",
          repuestos: r.repuestos_usados ?? "",
          tipo: r.tipo_mantenimiento ?? "",
          observaciones: r.observaciones ?? "",
          imagenAntesUrl: r.imagen_antes_url ?? null,
          imagenDespuesUrl: r.imagen_despues_url ?? null,
          anexoUrl: r.anexo_url ?? null,
        }));

        // Deduplicar por contenido (fecha + descripcion + responsable)
        // Si hay duplicados, conservar el que tenga los links completos
        const uniqueByContent = new Map<string, ZonaHistorialRow>();
        for (const item of mapped) {
          const key = `${item.fecha}|${item.descripcion}|${item.responsable}`;
          const existing = uniqueByContent.get(key);
          if (!existing) {
            uniqueByContent.set(key, item);
          } else {
            // Conservar el que tenga los links
            const existingHasLinks = existing.imagenAntesUrl || existing.imagenDespuesUrl || existing.anexoUrl;
            const newHasLinks = item.imagenAntesUrl || item.imagenDespuesUrl || item.anexoUrl;
            if (!existingHasLinks && newHasLinks) {
              uniqueByContent.set(key, item);
            }
          }
        }
        setRows(Array.from(uniqueByContent.values()));
      } catch (e) {
        console.warn("No se pudo cargar zonas_historial", e);
        setRows([]);
      } finally {
        setLoading(false);
      }
    };

    if (codigo) {
      fetchHistorial();
    }
  }, [codigo]);

  // Filtrar registros según los filtros seleccionados
  const filteredRows = useMemo(() => {
    return rows.filter((row) => {
      const normalizedTipo = (row.tipo || "").toLowerCase().trim();

      // Filtro por tipo de mantenimiento (comparación normalizada)
      if (tipoFilter && normalizedTipo !== tipoFilter) return false;

      // Filtros por fecha (row.fecha está en formato yyyy-mm-dd)
      if (startDateFilter && row.fecha && row.fecha < startDateFilter) return false;
      if (endDateFilter && row.fecha && row.fecha > endDateFilter) return false;

      return true
    });
  }, [rows, tipoFilter, startDateFilter, endDateFilter]);

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Mantenimientos de la zona</h1>
          <p className="text-sm text-muted-foreground">
            Historial de trabajos realizados para la zona con código: {codigo}
          </p>
        </div>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="flex items-center gap-1 text-sm shrink-0"
          onClick={() => router.push("/dashboard/zonas")}
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Volver</span>
        </Button>
      </div>

      <div className="space-y-2">
        <h2 className="text-lg font-medium">Hoja de vida de la zona</h2>

        <div className="flex flex-wrap gap-2 text-[11px] sm:text-xs">
          <div className="flex flex-col gap-1">
            <span className="text-[10px] font-medium text-muted-foreground">Tipo mantenimiento</span>
            <select
              className="h-8 rounded-md border border-input bg-background px-2 text-[11px] focus-visible:outline-none"
              value={tipoFilter}
              onChange={(e) => setTipoFilter(e.target.value)}
            >
              <option value="">Todos</option>
              <option value="correctivo">Correctivo</option>
              <option value="preventivo">Preventivo</option>
              <option value="rutinario">Rutinario</option>
            </select>
          </div>
          <div className="flex flex-col gap-1">
            <span className="text-[10px] font-medium text-muted-foreground">Desde</span>
            <input
              type="date"
              className="h-8 rounded-md border border-input bg-background px-2 text-[11px]"
              value={startDateFilter}
              onChange={(e) => setStartDateFilter(e.target.value)}
            />
          </div>
          <div className="flex flex-col gap-1">
            <span className="text-[10px] font-medium text-muted-foreground">Hasta</span>
            <input
              type="date"
              className="h-8 rounded-md border border-input bg-background px-2 text-[11px]"
              value={endDateFilter}
              onChange={(e) => setEndDateFilter(e.target.value)}
            />
          </div>
        </div>

        <div className="overflow-x-auto rounded-md border bg-card">
          <table className="min-w-full text-[11px] sm:text-xs">
            <thead className="bg-muted text-left">
              <tr>
                <th className="px-2 py-1 sm:px-3 sm:py-2 font-semibold">Fecha</th>
                <th className="px-2 py-1 sm:px-3 sm:py-2 font-semibold">
                  Descripción del trabajo
                </th>
                <th className="px-2 py-1 sm:px-3 sm:py-2 font-semibold">
                  Responsable
                </th>
                <th className="px-2 py-1 sm:px-3 sm:py-2 font-semibold">
                  Repuestos usados
                </th>
                <th className="px-2 py-1 sm:px-3 sm:py-2 font-semibold">Tipo</th>
                <th className="px-2 py-1 sm:px-3 sm:py-2 font-semibold hidden sm:table-cell">
                  Observaciones
                </th>
                <th className="px-2 py-1 sm:px-3 sm:py-2 font-semibold text-right">
                  Ver
                </th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td
                    colSpan={7}
                    className="px-2 py-4 sm:px-3 text-center text-muted-foreground"
                  >
                    Cargando historial...
                  </td>
                </tr>
              ) : rows.length === 0 ? (
                <tr>
                  <td
                    colSpan={7}
                    className="px-2 py-4 sm:px-3 text-center text-muted-foreground"
                  >
                    No hay registros de mantenimiento aún para esta zona.
                  </td>
                </tr>
              ) : filteredRows.length === 0 ? (
                <tr>
                  <td
                    colSpan={7}
                    className="px-2 py-4 sm:px-3 text-center text-muted-foreground"
                  >
                    No hay registros que coincidan con los filtros seleccionados.
                  </td>
                </tr>
              ) : (
                filteredRows.map((row, idx) => (
                  <React.Fragment key={`zhv-${row.id}`}>
                    <tr className="border-t">
                      <td className="px-2 py-1 sm:px-3 sm:py-2 align-top whitespace-nowrap">
                        {row.fecha}
                      </td>
                      <td
                        className="px-2 py-1 sm:px-3 sm:py-2 align-top max-w-[140px] sm:max-w-xs truncate"
                        title={row.descripcion}
                      >
                        {row.descripcion}
                      </td>
                      <td className="px-2 py-1 sm:px-3 sm:py-2 align-top whitespace-nowrap">
                        {row.responsable}
                      </td>
                      <td
                        className="px-2 py-1 sm:px-3 sm:py-2 align-top max-w-[140px] sm:max-w-xs truncate"
                        title={row.repuestos}
                      >
                        {row.repuestos}
                      </td>
                      <td className="px-2 py-1 sm:px-3 sm:py-2 align-top whitespace-nowrap">
                        {row.tipo}
                      </td>
                      <td
                        className="px-2 py-1 sm:px-3 sm:py-2 align-top max-w-[140px] sm:max-w-xs truncate hidden sm:table-cell"
                        title={row.observaciones}
                      >
                        {row.observaciones}
                      </td>
                      <td className="px-2 py-1 sm:px-3 sm:py-2 align-top text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            type="button"
                            size="icon"
                            variant="ghost"
                            className="h-7 w-7"
                            onClick={() =>
                              setExpandedIndex((prev) => (prev === idx ? null : idx))
                            }
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          {isJefe && (
                            <Button
                              type="button"
                              size="icon"
                              variant="ghost"
                              className="h-7 w-7 text-red-600 hover:text-red-700 hover:bg-red-50"
                              onClick={() => openDeleteDialog(row.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                    {expandedIndex === idx && (
                      <tr className="border-t bg-muted/30">
                        <td colSpan={7} className="px-2 py-3 sm:px-3">
                          <div className="grid gap-2 text-[11px] sm:text-xs sm:grid-cols-2">
                            <div className="flex gap-2">
                              <span className="font-medium text-muted-foreground shrink-0">
                                Descripción:
                              </span>
                              <span className="whitespace-pre-wrap break-all">
                                {row.descripcion || "-"}
                              </span>
                            </div>
                            <div className="flex gap-2">
                              <span className="font-medium text-muted-foreground shrink-0">
                                Repuestos usados:
                              </span>
                              <span className="whitespace-pre-wrap break-all">
                                {row.repuestos || "-"}
                              </span>
                            </div>
                            <div className="flex gap-2 sm:col-span-2">
                              <span className="font-medium text-muted-foreground shrink-0">
                                Observaciones:
                              </span>
                              <span className="whitespace-pre-wrap break-all">
                                {row.observaciones || "-"}
                              </span>
                            </div>
                            {(row.imagenAntesUrl || row.imagenDespuesUrl || row.anexoUrl) && (
                              <div className="flex flex-wrap gap-2 sm:col-span-2 pt-2 border-t mt-2">
                                <span className="font-medium text-muted-foreground shrink-0">
                                  Adjuntos:
                                </span>
                                <div className="flex flex-wrap gap-2">
                                  {row.imagenAntesUrl && (
                                    <a
                                      href={row.imagenAntesUrl}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="inline-flex items-center gap-1 px-2 py-1 bg-blue-50 text-blue-700 rounded hover:bg-blue-100 transition-colors"
                                    >
                                      <ImageIcon className="h-3 w-3" />
                                      Imagen Antes
                                      <ExternalLink className="h-3 w-3" />
                                    </a>
                                  )}
                                  {row.imagenDespuesUrl && (
                                    <a
                                      href={row.imagenDespuesUrl}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="inline-flex items-center gap-1 px-2 py-1 bg-green-50 text-green-700 rounded hover:bg-green-100 transition-colors"
                                    >
                                      <ImageIcon className="h-3 w-3" />
                                      Imagen Después
                                      <ExternalLink className="h-3 w-3" />
                                    </a>
                                  )}
                                  {row.anexoUrl && (
                                    <a
                                      href={row.anexoUrl}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="inline-flex items-center gap-1 px-2 py-1 bg-orange-50 text-orange-700 rounded hover:bg-orange-100 transition-colors"
                                    >
                                      <FileText className="h-3 w-3" />
                                      Archivo Anexo
                                      <ExternalLink className="h-3 w-3" />
                                    </a>
                                  )}
                                </div>
                              </div>
                            )}
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Diálogo de confirmación de eliminación */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600">
              <Trash2 className="h-5 w-5" />
              Eliminar Registro de Hoja de Vida
            </DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <p className="text-sm text-muted-foreground">
              ¿Estás seguro de que deseas eliminar este registro de la hoja de vida? Esta acción no se puede deshacer.
            </p>
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={cancelDelete}
              disabled={isDeleting}
            >
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={confirmDelete}
              disabled={isDeleting}
              className="gap-2"
            >
              {isDeleting ? (
                <>
                  <div className="h-4 w-4 animate-spin rounded-full border border-current border-t-transparent" />
                  Eliminando...
                </>
              ) : (
                <>
                  <Trash2 className="h-4 w-4" />
                  Eliminar
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
