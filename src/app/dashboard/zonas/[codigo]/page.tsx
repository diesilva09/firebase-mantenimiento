"use client";

import React, { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Eye } from "lucide-react";

interface ZonaHistorialRow {
  fecha: string;
  descripcion: string;
  responsable: string;
  repuestos: string;
  tipo: string;
  observaciones: string;
}

export default function ZonaDetallePage() {
  const router = useRouter();
  const params = useParams();
  const codigo = params.codigo as string;

  const [rows, setRows] = useState<ZonaHistorialRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null);

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
          fecha:
            typeof r.fecha_evento === "string"
              ? r.fecha_evento.slice(0, 10)
              : "",
          descripcion: r.labor ?? "",
          responsable: r.ejecutado_por ?? "",
          repuestos: r.repuestos_usados ?? "",
          tipo: r.tipo_mantenimiento ?? "",
          observaciones: r.observaciones ?? "",
        }));

        setRows(mapped);
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
              ) : (
                rows.map((row, idx) => (
                  <React.Fragment key={`zhv-${idx}`}>
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
                        <Button
                          type="button"
                          size="icon"
                          variant="ghost"
                          className="h-7 w-7 ml-auto"
                          onClick={() =>
                            setExpandedIndex((prev) => (prev === idx ? null : idx))
                          }
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
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
    </div>
  );
}
