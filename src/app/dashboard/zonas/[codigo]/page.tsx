"use client";

import React, { useEffect, useState, useMemo, useCallback } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ArrowLeft, Eye, Trash2, Folder } from "lucide-react";
import { MultiFileSection, MultiFileViewer } from "@/components/multi-file-viewer";
import { MultiFileUploader } from "@/components/multi-file-uploader";
import { useUser } from "@/firebase/auth/use-user";
import { checkUserRole } from "@/lib/role-service";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { emitLiveUpdate, useLiveRefresh } from "@/hooks/use-live-refresh";
import { useToast } from "@/hooks/use-toast";
import { getDisplayFileName, getStoredFileId } from "@/lib/file-display";

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
  esSolicitada?: boolean;
  solicitudId?: number | null;
}

interface ZonaApiRow {
  id: number;
  tipo: string;
  area?: string | null;
  codigo?: string | null;
  nombre: string;
  imagenes_folder_url?: string | null;
  attachments_url?: string | null;
}

function parseAttachmentUrls(value: string | null | undefined) {
  if (!value) return [];

  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function isGoogleDriveFolderUrl(url: string) {
  return url.includes("drive.google.com/drive/folders/");
}

function buildAttachmentValue(urls: string[]) {
  return Array.from(new Set(urls.map((url) => url.trim()).filter(Boolean))).join(",");
}

export default function ZonaDetallePage() {
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();
  const codigo = params.codigo as string;
  const { user } = useUser();
  const { toast } = useToast();
  const view = (searchParams.get("view") || "hoja-vida") as "hoja-vida" | "anexos";

  const [rows, setRows] = useState<ZonaHistorialRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null);
  const [attachmentsUrl, setAttachmentsUrl] = useState<string>("");
  const [zonaRecord, setZonaRecord] = useState<ZonaApiRow | null>(null);
  const [loadingAttachments, setLoadingAttachments] = useState(false);
  const [savingAttachments, setSavingAttachments] = useState(false);
  const [deletingAttachmentUrl, setDeletingAttachmentUrl] = useState<string | null>(null);
  const [attachmentSearch, setAttachmentSearch] = useState("");
  const [attachmentFileNames, setAttachmentFileNames] = useState<Record<string, string>>({});

  // Filtros
  const [tipoFilter, setTipoFilter] = useState<string>("");
  const [startDateFilter, setStartDateFilter] = useState<string>("");
  const [endDateFilter, setEndDateFilter] = useState<string>("");

  // Rol de usuario
  const [isJefe, setIsJefe] = useState(false);

  // Diálogo de confirmación de eliminación
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteTargetId, setDeleteTargetId] = useState<number | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const loadAttachmentsUrl = useCallback(async (options?: { silent?: boolean }) => {
    if (!options?.silent) {
      setLoadingAttachments(true);
    }

    try {
      const res = await fetch("/api/zonas", { cache: "no-store" });
      if (!res.ok) return;

      const json = await res.json().catch(() => ({ data: [] }));
      const data: ZonaApiRow[] = Array.isArray(json?.data) ? json.data : [];
      const row = data.find((item) => item && item.codigo === codigo);

      setZonaRecord(row ?? null);
      setAttachmentsUrl(row?.attachments_url ?? "");
    } catch (error) {
      console.warn("No se pudo cargar attachments_url de la zona", error);
    } finally {
      if (!options?.silent) {
        setLoadingAttachments(false);
      }
    }
  }, [codigo]);

  // Verificar rol del usuario
  useEffect(() => {
    const checkRole = async () => {
      if (user) {
        const role = await checkUserRole(user);
        setIsJefe(role.role === 'JEFE');
      } else {
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
        emitLiveUpdate(["zone-history"]);
      } else {
        console.error('Error eliminando registro');
      }
    } catch (error) {
      console.error('Error eliminando registro:', error);
    } finally {
      setIsDeleting(false);
    }
  };

  const fetchHistorial = useCallback(async (options?: { silent?: boolean }) => {
    try {
      if (!options?.silent) {
        setLoading(true);
      }

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
        esSolicitada: Boolean(r.es_solicitada),
        solicitudId: r.solicitud_id ?? null,
      }));

      const uniqueByContent = new Map<string, ZonaHistorialRow>();
      for (const item of mapped) {
        const key = `${item.fecha}|${item.descripcion}|${item.responsable}`;
        const existing = uniqueByContent.get(key);
        if (!existing) {
          uniqueByContent.set(key, item);
        } else {
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
      if (!options?.silent) {
        setLoading(false);
      }
    }
  }, [codigo]);

  useEffect(() => {
    if (codigo) {
      void fetchHistorial();
    }
  }, [codigo, fetchHistorial]);

  useEffect(() => {
    if (codigo) {
      void loadAttachmentsUrl();
    }
  }, [codigo, loadAttachmentsUrl]);

  useLiveRefresh({
    callback: async () => {
      await Promise.all([
        fetchHistorial({ silent: true }),
        loadAttachmentsUrl({ silent: true }),
      ]);
    },
    scopes: ["zone-history", "maintenance-orders", "tasks", "zonas"],
    intervalMs: 20000,
    enabled: Boolean(codigo),
    immediate: false,
  })

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

  const attachmentEntries = useMemo(() => parseAttachmentUrls(attachmentsUrl), [attachmentsUrl]);
  const legacyDriveFolders = useMemo(
    () => attachmentEntries.filter((url) => isGoogleDriveFolderUrl(url)),
    [attachmentEntries]
  );
  const storedAttachmentFiles = useMemo(
    () => attachmentEntries.filter((url) => !isGoogleDriveFolderUrl(url)),
    [attachmentEntries]
  );
  const normalizedAttachmentSearch = attachmentSearch.trim().toLowerCase();

  useEffect(() => {
    let isMounted = true;

    const resolveStoredAttachmentNames = async () => {
      const pendingUrls = storedAttachmentFiles.filter((url) => {
        const directName = getDisplayFileName(url);
        const storedFileId = getStoredFileId(url);

        return !directName && Boolean(storedFileId) && !attachmentFileNames[url];
      });

      if (pendingUrls.length === 0) return;

      const resolvedEntries = await Promise.all(
        pendingUrls.map(async (url) => {
          const storedFileId = getStoredFileId(url);
          if (!storedFileId) return null;

          try {
            const response = await fetch(`/api/archivos?id=${storedFileId}&metadata=1`);
            if (!response.ok) return null;

            const data = await response.json();
            return [url, data.nombre as string] as const;
          } catch {
            return null;
          }
        })
      );

      if (!isMounted) return;

      const nextNames = Object.fromEntries(
        resolvedEntries.filter((entry): entry is readonly [string, string] => Boolean(entry))
      );

      if (Object.keys(nextNames).length > 0) {
        setAttachmentFileNames((prev) => ({ ...prev, ...nextNames }));
      }
    };

    void resolveStoredAttachmentNames();

    return () => {
      isMounted = false;
    };
  }, [attachmentFileNames, storedAttachmentFiles]);

  const filteredStoredAttachmentFiles = useMemo(() => {
    if (!normalizedAttachmentSearch) return storedAttachmentFiles;

    return storedAttachmentFiles.filter((url) => {
      const fileName =
        attachmentFileNames[url] ||
        getDisplayFileName(url) ||
        `archivo ${getStoredFileId(url) ?? ""}`;

      return fileName.toLowerCase().includes(normalizedAttachmentSearch);
    });
  }, [attachmentFileNames, normalizedAttachmentSearch, storedAttachmentFiles]);

  const persistAttachments = useCallback(
    async (nextAttachmentsUrl: string) => {
      if (!zonaRecord) {
        toast({
          title: "No se pudo guardar los anexos",
          description: "Todavia no se ha cargado la informacion de la zona.",
          variant: "destructive",
        });
        return false;
      }

      setSavingAttachments(true);

      try {
        const response = await fetch("/api/zonas", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            id: zonaRecord.id,
            tipo: zonaRecord.tipo,
            area: zonaRecord.area ?? null,
            codigo: zonaRecord.codigo ?? null,
            nombre: zonaRecord.nombre,
            imagenes_folder_url: zonaRecord.imagenes_folder_url ?? null,
            attachments_url: nextAttachmentsUrl || null,
          }),
        });

        if (!response.ok) {
          throw new Error("No se pudo actualizar la zona");
        }

        const payload = await response.json().catch(() => ({}));
        const updatedZona = payload?.data as ZonaApiRow | undefined;
        const normalizedAttachmentsUrl = updatedZona?.attachments_url ?? nextAttachmentsUrl;

        if (updatedZona) {
          setZonaRecord(updatedZona);
        }
        setAttachmentsUrl(normalizedAttachmentsUrl);
        emitLiveUpdate(["zonas"]);
        return true;
      } catch (error) {
        await loadAttachmentsUrl({ silent: true });
        toast({
          title: "Error al guardar anexos",
          description: error instanceof Error ? error.message : "No se pudieron guardar los anexos de la zona.",
          variant: "destructive",
        });
        return false;
      } finally {
        setSavingAttachments(false);
      }
    },
    [loadAttachmentsUrl, toast, zonaRecord]
  );

  const handleStoredAttachmentsChange = useCallback(
    (value: string) => {
      const nextAttachmentsUrl = buildAttachmentValue([
        ...legacyDriveFolders,
        ...parseAttachmentUrls(value),
      ]);

      setAttachmentsUrl(nextAttachmentsUrl);
      void persistAttachments(nextAttachmentsUrl);
    },
    [legacyDriveFolders, persistAttachments]
  );

  const handleDeleteStoredAttachment = useCallback(
    async (urlToDelete: string) => {
      const nextStoredFiles = storedAttachmentFiles.filter((url) => url !== urlToDelete);
      const nextAttachmentsUrl = buildAttachmentValue([
        ...legacyDriveFolders,
        ...nextStoredFiles,
      ]);

      setDeletingAttachmentUrl(urlToDelete);

      try {
        const saved = await persistAttachments(nextAttachmentsUrl);
        if (!saved) {
          throw new Error("No se pudo actualizar el listado de anexos de la zona");
        }

        const storedFileId = getStoredFileId(urlToDelete);
        if (storedFileId) {
          const idToken = user ? await user.getIdToken() : null;
          const deleteResponse = await fetch(`/api/archivos?id=${storedFileId}`, {
            method: "DELETE",
            headers: idToken
              ? {
                  Authorization: `Bearer ${idToken}`,
                }
              : undefined,
          });

          if (!deleteResponse.ok) {
            const errorPayload = await deleteResponse.json().catch(() => null);
            const errorMessage =
              errorPayload?.error || "No se pudo eliminar el archivo de la base de datos";

            if (deleteResponse.status !== 404) {
              throw new Error(errorMessage);
            }
          }
        }

        setAttachmentFileNames((prev) => {
          const next = { ...prev };
          delete next[urlToDelete];
          return next;
        });

        toast({
          title: "Anexo eliminado",
          description: "El archivo se elimino correctamente.",
          variant: "success",
        });
      } catch (error) {
        await loadAttachmentsUrl({ silent: true });
        toast({
          title: "Error al eliminar anexo",
          description: error instanceof Error ? error.message : "No se pudo eliminar el anexo.",
          variant: "destructive",
        });
      } finally {
        setDeletingAttachmentUrl(null);
      }
    },
    [legacyDriveFolders, loadAttachmentsUrl, persistAttachments, storedAttachmentFiles, toast, user]
  );

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">
            {view === "anexos" ? "Anexos de la zona" : "Mantenimientos de la zona"}
          </h1>
          <p className="text-sm text-muted-foreground">
            {view === "anexos"
              ? `Gestiona los documentos y archivos de la zona con código: ${codigo}`
              : `Historial de trabajos realizados para la zona con código: ${codigo}`}
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

      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          variant={view === "hoja-vida" ? "default" : "outline"}
          onClick={() => router.push(`/dashboard/zonas/${encodeURIComponent(codigo)}`)}
        >
          Hoja de vida
        </Button>
        <Button
          type="button"
          variant={view === "anexos" ? "default" : "outline"}
          onClick={() => router.push(`/dashboard/zonas/${encodeURIComponent(codigo)}?view=anexos`)}
        >
          Anexos
        </Button>
      </div>

      {view === "hoja-vida" && (
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
                      <div className="flex items-center justify-center gap-2">
                        <div className="h-4 w-4 animate-spin rounded-full border border-current border-t-transparent"></div>
                        <span>Cargando historial...</span>
                      </div>
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
                          <div className="truncate">{row.descripcion}</div>
                          {row.esSolicitada && (
                            <span className="mt-1 inline-flex rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-medium text-amber-800">
                              Solicitada
                            </span>
                          )}
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
                              <MultiFileSection
                                imagenAntesUrl={row.imagenAntesUrl}
                                imagenDespuesUrl={row.imagenDespuesUrl}
                                anexoUrl={row.anexoUrl}
                              />
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
      )}

      {view === "anexos" && (
        <div className="space-y-2">
          <h2 className="text-lg font-medium">Anexos</h2>
          <div className="rounded-md border bg-card p-4 text-sm text-muted-foreground space-y-4">
            {loadingAttachments ? (
              <div className="flex items-center gap-2">
                <div className="h-4 w-4 animate-spin rounded-full border border-current border-t-transparent"></div>
                <span>Cargando anexos...</span>
              </div>
            ) : (
              <>
                <div className="space-y-3 rounded-md border bg-background p-4">
                  <div>
                    <p className="font-medium text-foreground">Adjuntar anexos de la zona</p>
                    <p className="text-xs text-muted-foreground">
                      Sube manuales, planos y otros documentos despues de crear la zona. No hay limite de cantidad.
                    </p>
                  </div>

                  <MultiFileUploader
                    value={storedAttachmentFiles.join(",")}
                    onChange={handleStoredAttachmentsChange}
                    accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv,.zip,.rar,.7z,.jpg,.jpeg,.png,.webp,.gif"
                    label="Anexos de la zona"
                    maxFiles={null}
                    showCamera={false}
                    uploadMode="manual"
                    uploadButtonLabel="Adjuntar"
                  />

                  {savingAttachments && (
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <div className="h-3.5 w-3.5 animate-spin rounded-full border border-current border-t-transparent"></div>
                      <span>Guardando cambios en los anexos...</span>
                    </div>
                  )}
                </div>

                <div className="space-y-3 rounded-md border bg-background p-4">
                  <div className="space-y-2">
                    <p className="font-medium text-foreground">Buscar archivos</p>
                    <Input
                      value={attachmentSearch}
                      onChange={(e) => setAttachmentSearch(e.target.value)}
                      placeholder="Buscar por nombre de archivo..."
                      className="h-9"
                    />
                  </div>

                  {storedAttachmentFiles.length === 0 ? (
                    <p className="text-xs text-muted-foreground">
                      Esta zona aun no tiene archivos adjuntos para buscar.
                    </p>
                  ) : filteredStoredAttachmentFiles.length > 0 ? (
                    <MultiFileViewer
                      urls={filteredStoredAttachmentFiles.join(",")}
                      label="Archivos de la zona"
                      variant="orange"
                      isImage={false}
                      onDeleteFile={isJefe ? handleDeleteStoredAttachment : undefined}
                      deletingUrl={deletingAttachmentUrl}
                    />
                  ) : (
                    <p className="text-xs text-muted-foreground">
                      No hay archivos que coincidan con la busqueda realizada.
                    </p>
                  )}
                </div>

                {legacyDriveFolders.length > 0 && (
                  <div className="space-y-3">
                    <div>
                      <p className="font-medium text-foreground">Links legacy de Drive</p>
                      <p className="text-xs text-muted-foreground">
                        Estos enlaces antiguos se mantienen disponibles para no perder el acceso historico.
                      </p>
                    </div>
                    {legacyDriveFolders.map((url, index) => (
                      <button
                        key={`${url}-${index}`}
                        type="button"
                        className="flex w-full items-center gap-3 rounded-md border bg-background px-4 py-3 text-left hover:bg-accent/60"
                        onClick={() => window.open(url, "_blank")}
                      >
                        <div className="flex h-10 w-10 items-center justify-center rounded-md bg-muted">
                          <Folder className="h-5 w-5" />
                        </div>
                        <div className="flex min-w-0 flex-col">
                          <span className="font-medium text-foreground">Carpeta de anexos en Drive</span>
                          <span className="text-xs text-muted-foreground break-words [overflow-wrap:anywhere]">
                            {url}
                          </span>
                        </div>
                      </button>
                    ))}
                  </div>
                )}

                {attachmentEntries.length === 0 && (
                  <p className="text-xs text-muted-foreground">
                    Esta zona aun no tiene anexos cargados.
                  </p>
                )}
              </>
            )}
          </div>
        </div>
      )}

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
