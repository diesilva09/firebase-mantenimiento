// src/lib/export-utils.ts

// --- EXCEL ---
export const exportToExcel = async (data: any[], fileName: string) => {
  const XLSX = await import('xlsx');
  const worksheet = XLSX.utils.json_to_sheet(data);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Datos");
  XLSX.writeFile(workbook, `${fileName}.xlsx`);
};

// --- PDF ---
export const exportToPDF = async (data: any[], columns: string[], title: string, fileName: string) => {
  const [{ default: jsPDF }, { default: autoTable }] = await Promise.all([
    import('jspdf'),
    import('jspdf-autotable'),
  ]);
  const doc = new jsPDF();
  
  // Título
  doc.setFontSize(16);
  doc.text(title, 14, 15);
  doc.setFontSize(10);
  doc.text(`Generado: ${new Date().toLocaleDateString()}`, 14, 22);
  
  // Preparar datos para la tabla
  const tableData = data.map(item => columns.map(col => item[col] || ''));
  
  autoTable(doc, {
    head: [columns],
    body: tableData,
    startY: 25,
    styles: { fontSize: 8 },
    headStyles: { fillColor: [41, 128, 185] }, // Azul corporativo
  });

  doc.save(`${fileName}.pdf`);
};

// --- WORD ---
export const exportToWord = async (data: any[], columns: string[], title: string, fileName: string) => {
  const [{ Document, Packer, Paragraph, Table, TableCell, TableRow, WidthType, HeadingLevel, TextRun }, { saveAs }] =
    await Promise.all([
      import('docx'),
      import('file-saver'),
    ]);

  // Crear filas de la tabla
  const tableRows = [
    // Encabezado
    new TableRow({
      children: columns.map(col => new TableCell({
        children: [new Paragraph({ children: [new TextRun({ text: col, bold: true })] })],
        width: { size: 100 / columns.length, type: WidthType.PERCENTAGE },
        shading: { fill: "E0E0E0" }
      }))
    }),
    // Datos
    ...data.map(item => new TableRow({
      children: columns.map(col => new TableCell({
        children: [new Paragraph(String(item[col] || ''))],
        width: { size: 100 / columns.length, type: WidthType.PERCENTAGE }
      }))
    }))
  ];

  const doc = new Document({
    sections: [{
      children: [
        new Paragraph({
          text: title,
          heading: HeadingLevel.HEADING_1,
        }),
        new Paragraph({ text: `Fecha: ${new Date().toLocaleDateString()}` }),
        new Paragraph({ text: "" }), // Espacio
        new Table({
          rows: tableRows,
          width: { size: 100, type: WidthType.PERCENTAGE },
        }),
      ],
    }],
  });

  

  const blob = await Packer.toBlob(doc);
  saveAs(blob, `${fileName}.docx`);
};


