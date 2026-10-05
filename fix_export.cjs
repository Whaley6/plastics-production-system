const fs = require('fs');
let content = fs.readFileSync('src/pages/AuxiliaryMaintenance.tsx', 'utf-8');

// The columns we want
const columnsSnippet = `
    const columns = [
      { header: 'CATEGORY', key: 'category', width: 20 },
      { header: 'EQUIPMENT / SUBJECT NAME', key: 'machineName', width: 40 },
      { header: 'DATE', key: 'dateReported', width: 15 },
      { header: 'WORK / DETAILS', key: 'workDetails', width: 60 }
    ];
`;

const replaceExportAllRegex = /const handleExportAll = async \(\) => \{[\s\S]*?(?=return \()/;

const newExportLogic = `
  const handleExportAll = async () => {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Utilities Equipment');

    const columns = [
      { header: 'CATEGORY', key: 'category', width: 20 },
      { header: 'EQUIPMENT / SUBJECT NAME', key: 'machineName', width: 40 },
      { header: 'DATE', key: 'dateReported', width: 15 },
      { header: 'WORK / DETAILS', key: 'workDetails', width: 60 }
    ];

    worksheet.columns = columns;

    // Add big title row in row 1
    worksheet.spliceRows(1, 0, []);
    const titleRow = worksheet.getRow(1);
    titleRow.height = 42;
    worksheet.mergeCells(1, 1, 1, columns.length);
    const titleCell = worksheet.getCell(1, 1);
    titleCell.value = 'UTILITIES EQUIPMENT REPORT';
    titleCell.font = { bold: true, size: 16, name: 'Arial', color: { argb: 'FFFFFFFF' } };
    titleCell.alignment = { vertical: 'middle', horizontal: 'center' };
    titleCell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF002060' } // Dark blue from image
    };

    // Header row is now row 2
    const headerRow = worksheet.getRow(2);
    headerRow.eachCell((cell) => {
      cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
      cell.alignment = { vertical: 'middle', horizontal: 'center' };
      cell.border = {
        top: { style: 'thin' },
        left: { style: 'thin' },
        bottom: { style: 'thin' },
        right: { style: 'thin' }
      };

      const text = cell.value?.toString().toUpperCase() || '';
      let argbStr = 'FF00B050'; // Default Green for CATEGORY, EQUIPMENT, DATE
      if (text.includes('WORK')) {
        argbStr = 'FF00B0F0'; // Light Blue for WORK / DETAILS
      }

      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: argbStr }
      };
    });

    // Populate all sorted by category, then date
    const categoryOrder = ['GENERATORS', 'COMPRESSORS', 'DRYERS', 'RO', 'UPS', 'OTHER'];
    const sortedOrders = [...workOrders].sort((a, b) => {
      const catA = a.category || 'GENERATORS';
      const catB = b.category || 'GENERATORS';
      const catIdxA = categoryOrder.indexOf(catA);
      const catIdxB = categoryOrder.indexOf(catB);
      if (catIdxA !== catIdxB) return catIdxA - catIdxB;
      
      const dateA = a.dateReported || '';
      const dateB = b.dateReported || '';
      return dateB.localeCompare(dateA); // Newest first
    });

    sortedOrders.forEach(wo => {
      const newRow = worksheet.addRow({
        category: wo.category || 'GENERATORS',
        machineName: wo.machineName || '-',
        dateReported: wo.dateReported || '-',
        workDetails: wo.workDetails || '-'
      });

      newRow.eachCell((cell) => {
        cell.alignment = { vertical: 'middle', horizontal: 'left', wrapText: true };
        cell.border = {
          top: { style: 'thin', color: { argb: 'FF000000' } },
          left: { style: 'thin', color: { argb: 'FF000000' } },
          bottom: { style: 'thin', color: { argb: 'FF000000' } },
          right: { style: 'thin', color: { argb: 'FF000000' } }
        };
      });
    });

    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = \`Utilities_Equipment_Report_\${new Date().toISOString().split('T')[0]}.xlsx\`;
    a.click();
    URL.revokeObjectURL(url);
  };
  
`;

// I also need to replace the single category export, let's just make it the same for now, or just leave it alone?
// If the user expects the "Export" button to export this layout, we should probably change handleExport too.
// Let's replace both. Wait, there's a button "Export All" and "Export to Excel" in the UI. 
// "Export to Excel" uses handleExport. "Export All" uses handleExportAll.
// I will just make handleExport do the same thing but filter for activeCategory.

const handleExportLogic = `
  const handleExport = async () => {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet(activeCategory);

    const columns = [
      { header: 'CATEGORY', key: 'category', width: 20 },
      { header: 'EQUIPMENT / SUBJECT NAME', key: 'machineName', width: 40 },
      { header: 'DATE', key: 'dateReported', width: 15 },
      { header: 'WORK / DETAILS', key: 'workDetails', width: 60 }
    ];

    worksheet.columns = columns;

    // Add big title row in row 1
    worksheet.spliceRows(1, 0, []);
    const titleRow = worksheet.getRow(1);
    titleRow.height = 42;
    worksheet.mergeCells(1, 1, 1, columns.length);
    const titleCell = worksheet.getCell(1, 1);
    titleCell.value = 'UTILITIES EQUIPMENT REPORT';
    titleCell.font = { bold: true, size: 16, name: 'Arial', color: { argb: 'FFFFFFFF' } };
    titleCell.alignment = { vertical: 'middle', horizontal: 'center' };
    titleCell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF002060' }
    };

    const headerRow = worksheet.getRow(2);
    headerRow.eachCell((cell) => {
      cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
      cell.alignment = { vertical: 'middle', horizontal: 'center' };
      cell.border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } };

      const text = cell.value?.toString().toUpperCase() || '';
      let argbStr = 'FF00B050';
      if (text.includes('WORK')) argbStr = 'FF00B0F0';

      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: argbStr } };
    });

    const currentOrders = workOrders.filter(wo => (wo.category || 'GENERATORS') === activeCategory);
    const sortedOrders = [...currentOrders].sort((a, b) => {
      const dateA = a.dateReported || '';
      const dateB = b.dateReported || '';
      return dateB.localeCompare(dateA);
    });

    sortedOrders.forEach(wo => {
      const newRow = worksheet.addRow({
        category: wo.category || 'GENERATORS',
        machineName: wo.machineName || '-',
        dateReported: wo.dateReported || '-',
        workDetails: wo.workDetails || '-'
      });

      newRow.eachCell((cell) => {
        cell.alignment = { vertical: 'middle', horizontal: 'left', wrapText: true };
        cell.border = { top: { style: 'thin', color: { argb: 'FF000000' } }, left: { style: 'thin', color: { argb: 'FF000000' } }, bottom: { style: 'thin', color: { argb: 'FF000000' } }, right: { style: 'thin', color: { argb: 'FF000000' } } };
      });
    });

    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = \`\${activeCategory}_Utilities_Equipment_\${new Date().toISOString().split('T')[0]}.xlsx\`;
    a.click();
    URL.revokeObjectURL(url);
  };
`;

// Replace handleExport and handleExportAll
const exportRegex = /const handleExport = async \(\) => \{[\s\S]*?(?=return \()/;
content = content.replace(exportRegex, handleExportLogic + '\n' + newExportLogic + '\n  ');

fs.writeFileSync('src/pages/AuxiliaryMaintenance.tsx', content);
