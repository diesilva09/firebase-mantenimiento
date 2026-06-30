'use client';

import { useState } from 'react';
import { exportToExcel, exportToPDF, exportToWord } from '@/lib/export-utils';
import { useToast } from "@/hooks/use-toast";

export default function ExportButtons() {
  const [isExporting, setIsExporting] = useState(false);
  const { toast } = useToast();

  const handleExport = async (format: 'excel' | 'pdf' | 'word') => {
    try {
      setIsExporting(true);
      
      // 1. Consumir la API para obtener los datos frescos
      const response = await fetch('/api/repuestos/exportar');
      
      if (!response.ok) {
        throw new Error('Error al obtener los datos del inventario');
      }
      
      const rawData = await response.json();

      if (!rawData || rawData.length === 0) {
        toast({
          title: "Sin datos",
          description: "No hay datos para exportar",
          variant: "destructive",
        });
        return;
      }

      // 2. Formatear los datos con encabezados legibles para el reporte
      const dataToExport = rawData.map((item: any) => ({
        'Código': item.codigo,
        'Nombre': item.nombre,
        'Categoría': item.categoria,
        'Cantidad': item.cantidad,
        'Ubicación': item.ubicacion,
        'Stock Mínimo': item.stockMinimo,
        'Unidad': item.unidad,
        'Proveedor': item.proveedor
      }));

      // Definir las columnas que queremos mostrar en los documentos (PDF/Word)
      const columns = ['Código', 'Nombre', 'Categoría', 'Cantidad', 'Ubicación', 'Stock Mínimo'];
      const fileName = 'Inventario_Repuestos';
      const title = 'Reporte de Inventario de Repuestos';

      // 3. Generar el archivo correspondiente
      if (format === 'excel') {
        exportToExcel(dataToExport, fileName);
      } else if (format === 'pdf') {
        exportToPDF(dataToExport, columns, title, fileName);
      } else if (format === 'word') {
        await exportToWord(dataToExport, columns, title, fileName);
      }

    } catch (error) {
      console.error('Error exportando:', error);
      toast({
        title: "Error",
        description: "Ocurrió un error al generar la exportación.",
        variant: "destructive",
      });
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="flex gap-2 items-center">
      <span className="text-sm text-gray-500 mr-2 font-medium">Exportar:</span>
      
      <button onClick={() => handleExport('pdf')} disabled={isExporting} className="px-3 py-1.5 bg-red-600 text-white text-sm rounded hover:bg-red-700 transition-colors disabled:opacity-50 shadow-sm">
        PDF
      </button>

      <button onClick={() => handleExport('excel')} disabled={isExporting} className="px-3 py-1.5 bg-green-600 text-white text-sm rounded hover:bg-green-700 transition-colors disabled:opacity-50 shadow-sm">
        Excel
      </button>

      <button onClick={() => handleExport('word')} disabled={isExporting} className="px-3 py-1.5 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 transition-colors disabled:opacity-50 shadow-sm">
        Word
      </button>
    </div>
  );
}