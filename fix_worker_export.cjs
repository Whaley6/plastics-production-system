const fs = require('fs');
let code = fs.readFileSync('src/pages/WorkerManagement.tsx', 'utf8');

// Update Export
const oldExportMatch = /const handleExport = async \(\) => \{[\s\S]*?URL\.revokeObjectURL\(url\);\n  \};/;

const newExport = `const handleExport = async () => {
    logAction('Data Exported', \`Exported worker database.\`, 'info');
    
    // Find maximum length of action history to define dynamic columns
    const maxActions = Math.max(1, ...workers.map(w => (w.actionHistory || []).length));
    
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Workers');

    const baseColumns = [
      { header: 'Workers Code', key: 'ID', width: 15 },
      { header: 'Full Name', key: 'Name', width: 25 },
      { header: 'Job Title', key: 'JobTitle', width: 20 },
      { header: 'Shift', key: 'Shift', width: 10 },
      { header: 'Status', key: 'Status', width: 15 },
      { header: 'Alerts', key: 'Alerts', width: 10 },
      { header: 'Absences', key: 'Absences', width: 10 },
      { header: 'Mobile', key: 'Mobile', width: 20 },
      { header: 'Start Date', key: 'StartDate', width: 15 },
      { header: 'Marital Status', key: 'MaritalStatus', width: 15 },
      { header: 'Address', key: 'Address', width: 35 },
      { header: 'Education', key: 'Education', width: 20 },
      { header: 'PPE Shirt', key: 'PPE_Shirt', width: 15 },
      { header: 'PPE Shoes', key: 'PPE_Shoes', width: 15 }
    ];

    const actionColumns = Array.from({ length: maxActions }).map((_, i) => ({
      header: \`Action History \${i + 1}\`, key: \`ActionHistory_\${i + 1}\`, width: 45
    }));

    worksheet.columns = [...baseColumns, ...actionColumns];

    workers.forEach(w => {
      const rowData: any = {
        ID: w.id,
        Name: w.name,
        JobTitle: w.jobTitle,
        Shift: w.shift,
        Status: w.status,
        Alerts: w.alerts,
        Absences: w.absences || 0,
        Mobile: w.mobile,
        StartDate: w.startDate,
        MaritalStatus: w.maritalStatus || '',
        Address: w.address || '',
        Education: w.education || '',
        PPE_Shirt: w.ppe?.shirt || '',
        PPE_Shoes: w.ppe?.shoes || '',
      };
      
      const history = w.actionHistory || [];
      for (let i = 0; i < maxActions; i++) {
        if (i < history.length) {
           const a = history[i];
           rowData[\`ActionHistory_\${i + 1}\`] = \`[\${a.date || ''}] \${a.type || ''}: \${a.reason || ''}\`;
        } else {
           rowData[\`ActionHistory_\${i + 1}\`] = '';
        }
      }
      
      worksheet.addRow(rowData);
    });

    // Merge Action History Headers
    worksheet.mergeCells(1, baseColumns.length + 1, 1, baseColumns.length + maxActions);
    worksheet.getCell(1, baseColumns.length + 1).value = 'Action History';

    // Instead of using the first row which we merged, we need to add a secondary header or just let the data be there.
    // ExcelJS merging means the first cell of the merge holds the value. The subsequent cells are invisible.
    // If we want "EACH WARNING SHOW IN AN INDIVIDUAL CELL but under action history", we can create a two-row header, or just use naming "Action History 1", "Action History 2" etc in the first row. 
    // Let's do a single row with "Action History 1", "Action History 2"... without merge so user can see it clearly, or with a second row.
    // Actually the user said "MAKE EACH WARNING SHOW IN AN INDIVIDUAL CELL but under action history"
    // We already named them Action History 1, Action History 2. Let's just don't merge them.
    worksheet.unmergeCells(1, baseColumns.length + 1, 1, baseColumns.length + maxActions); // undo merge if we don't want it. Actually let's just NOT merge and leave the labels.
    
    // Actually let's do a proper 2-level header to make it look really good:
    
    // First, let's insert a row ABOVE the current row 1.
    worksheet.spliceRows(1, 0, []); 
    
    // Now row 2 has the actual column names: "Workers Code", "Full Name", etc.
    // Row 1 will be empty except for the "Action History" merged block at the top.
    worksheet.mergeCells(1, baseColumns.length + 1, 1, baseColumns.length + maxActions);
    const topHeader = worksheet.getCell(1, baseColumns.length + 1);
    topHeader.value = 'Action History';
    topHeader.alignment = { horizontal: 'center', vertical: 'middle' };
    topHeader.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    topHeader.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FF3B82F6' } // blue color to distinguish
    };

    // Style headers on row 2
    worksheet.getRow(2).eachCell((cell) => {
      cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FF1F2937' } // dark gray
      };
      cell.alignment = { vertical: 'middle', horizontal: 'center' };
      cell.border = {
        top: { style: 'thin', color: { argb: 'FFD1D5DB' } },
        left: { style: 'thin', color: { argb: 'FFD1D5DB' } },
        bottom: { style: 'thin', color: { argb: 'FFD1D5DB' } },
        right: { style: 'thin', color: { argb: 'FFD1D5DB' } }
      };
    });

    // Optional: merge the top header cells for the base columns too
    for (let c = 1; c <= baseColumns.length; c++) {
      worksheet.mergeCells(1, c, 2, c);
      const cell = worksheet.getCell(1, c);
      cell.alignment = { vertical: 'middle', horizontal: 'center' };
      cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FF1F2937' }
      };
    }

    // Style all data cells
    worksheet.eachRow((row, rowNumber) => {
      if (rowNumber > 2) { // Skip header rows
        row.eachCell((cell) => {
          cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
          cell.border = {
            top: { style: 'thin', color: { argb: 'FFD1D5DB' } },
            left: { style: 'thin', color: { argb: 'FFD1D5DB' } },
            bottom: { style: 'thin', color: { argb: 'FFD1D5DB' } },
            right: { style: 'thin', color: { argb: 'FFD1D5DB' } }
          };
        });
      }
    });

    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = \`Workers_\${new Date().toISOString().split('T')[0]}.xlsx\`;
    a.click();
    URL.revokeObjectURL(url);
  };`;

code = code.replace(oldExportMatch, newExport);


const oldImportMatch = /let actionHistory = \[\];\s*try \{[\s\S]*?\} catch\(e\) \{\}/m;

const newImport = `let actionHistory: any[] = [];
              try { 
                // Read from all ActionHistory_1, ActionHistory_2 ... fields
                const keys = Object.keys(row).filter(k => k.startsWith('ActionHistory_') || k === 'Action History');
                for (const k of keys) {
                  const val = String(row[k]);
                  if (val && val.trim() !== '') {
                    // Try to parse JSON format just in case it was exported in old format
                    if (val.trim().startsWith('[')) {
                      try {
                        const parsed = JSON.parse(val);
                        if (Array.isArray(parsed)) {
                           actionHistory.push(...parsed);
                           continue;
                        }
                      } catch(e) {}
                    }
                    
                    // Otherwise parse string format: "[YYYY-MM-DD] Type: Reason"
                    const match = val.match(/^\\[(.*?)\\] (.*?): (.*)$/);
                    if (match) {
                      actionHistory.push({ date: match[1], type: match[2], reason: match[3] });
                    } else {
                      actionHistory.push({ date: new Date().toISOString().split('T')[0], type: 'System Note', reason: val });
                    }
                  }
                }
              } catch(e) {}
`;

code = code.replace(oldImportMatch, newImport);

fs.writeFileSync('src/pages/WorkerManagement.tsx', code);
