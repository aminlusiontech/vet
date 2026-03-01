import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import { applyPlugin } from 'jspdf-autotable';

// Register autoTable plugin so doc.autoTable() is available (required for jspdf-autotable v5)
applyPlugin(jsPDF);

/**
 * Export data to Excel format
 * @param {Array} rows - Array of row data objects
 * @param {Array} columns - Array of column definitions with field and headerName
 * @param {String} filename - Name of the file (without extension)
 * @param {Object} pageInfo - Optional page information to include (title, description, etc.)
 */
export const exportToExcel = (rows, columns, filename, pageInfo = {}) => {
  try {
    // Create a new workbook
    const wb = XLSX.utils.book_new();

    // Prepare data for export
    const exportData = [];

    // Add page information as header rows
    if (pageInfo.title) {
      exportData.push(['Page Information']);
      exportData.push(['Title:', pageInfo.title]);
      if (pageInfo.description) {
        exportData.push(['Description:', pageInfo.description]);
      }
      if (pageInfo.exportDate) {
        exportData.push(['Export Date:', pageInfo.exportDate]);
      }
      exportData.push([]); // Empty row separator
    }

    // Add column headers
    const headers = columns
      .filter(col => col.field !== 'actions' && col.field !== 'Preview' && col.field !== 'preview')
      .map(col => col.headerName || col.field);
    exportData.push(headers);

    // Add row data
    rows.forEach(row => {
      const rowData = columns
        .filter(col => col.field !== 'actions' && col.field !== 'Preview' && col.field !== 'preview')
        .map(col => {
          const value = row[col.field];
          // Handle special rendering cases
          if (col.renderCell && typeof col.renderCell === 'function') {
            // For rendered cells, try to extract text value
            if (value === null || value === undefined) return '';
            if (typeof value === 'object') {
              // If it's an object, try to get a meaningful string representation
              return JSON.stringify(value);
            }
            return String(value);
          }
          // Handle null/undefined
          if (value === null || value === undefined) return '';
          // Handle objects/arrays
          if (typeof value === 'object') {
            return JSON.stringify(value);
          }
          return String(value);
        });
      exportData.push(rowData);
    });

    // Create worksheet
    const ws = XLSX.utils.aoa_to_sheet(exportData);

    // Set column widths
    const colWidths = columns
      .filter(col => col.field !== 'actions' && col.field !== 'Preview' && col.field !== 'preview')
      .map(col => ({ wch: Math.max(col.headerName?.length || col.field.length || 10, 15) }));
    ws['!cols'] = colWidths;

    // Add worksheet to workbook
    XLSX.utils.book_append_sheet(wb, ws, 'Data');

    // Generate Excel file and download
    XLSX.writeFile(wb, `${filename}.xlsx`);
  } catch (error) {
    console.error('Error exporting to Excel:', error);
    throw error;
  }
};

/**
 * Export data to PDF format
 * @param {Array} rows - Array of row data objects
 * @param {Array} columns - Array of column definitions with field and headerName
 * @param {String} filename - Name of the file (without extension)
 * @param {Object} pageInfo - Optional page information to include (title, description, etc.)
 */
export const exportToPDF = (rows, columns, filename, pageInfo = {}) => {
  try {
    // Create new PDF document
    const doc = new jsPDF();
    let yPosition = 20;

    // Add page information
    if (pageInfo.title) {
      doc.setFontSize(16);
      doc.setFont(undefined, 'bold');
      doc.text('Page Information', 14, yPosition);
      yPosition += 10;

      doc.setFontSize(11);
      doc.setFont(undefined, 'normal');
      doc.text(`Title: ${pageInfo.title}`, 14, yPosition);
      yPosition += 7;

      if (pageInfo.description) {
        const splitDescription = doc.splitTextToSize(`Description: ${pageInfo.description}`, 180);
        doc.text(splitDescription, 14, yPosition);
        yPosition += splitDescription.length * 7;
      }

      if (pageInfo.exportDate) {
        doc.text(`Export Date: ${pageInfo.exportDate}`, 14, yPosition);
        yPosition += 10;
      }

      yPosition += 5; // Extra spacing
    }

    // Prepare table data
    const tableColumns = columns
      .filter(col => col.field !== 'actions' && col.field !== 'Preview' && col.field !== 'preview')
      .map(col => ({
        header: col.headerName || col.field,
        dataKey: col.field,
      }));

    const tableRows = rows.map(row => {
      return columns
        .filter(col => col.field !== 'actions' && col.field !== 'Preview' && col.field !== 'preview')
        .map(col => {
          const value = row[col.field];
          // Handle null/undefined
          if (value === null || value === undefined) return '';
          // Handle objects/arrays
          if (typeof value === 'object') {
            return JSON.stringify(value);
          }
          return String(value);
        });
    });

    // Prepare headers
    const headers = tableColumns.map(col => col.header);

    // Add table to PDF
    doc.autoTable({
      head: [headers],
      body: tableRows,
      startY: yPosition,
      styles: {
        fontSize: 9,
        cellPadding: 3,
      },
      headStyles: {
        fillColor: [30, 41, 59], // Dark slate color matching admin theme
        textColor: [255, 255, 255],
        fontStyle: 'bold',
      },
      alternateRowStyles: {
        fillColor: [248, 250, 252], // Light slate background
      },
      margin: { top: yPosition, left: 14, right: 14 },
      columnStyles: tableColumns.reduce((acc, col, index) => {
        acc[index] = { cellWidth: 'auto' };
        return acc;
      }, {}),
    });

    // Save PDF
    doc.save(`${filename}.pdf`);
  } catch (error) {
    console.error('Error exporting to PDF:', error);
    throw error;
  }
};

/**
 * Export data to both Excel and PDF
 * @param {Array} rows - Array of row data objects
 * @param {Array} columns - Array of column definitions with field and headerName
 * @param {String} filename - Name of the file (without extension)
 * @param {Object} pageInfo - Optional page information to include (title, description, etc.)
 */
export const exportToBoth = (rows, columns, filename, pageInfo = {}) => {
  const exportDate = new Date().toLocaleString();
  const pageInfoWithDate = { ...pageInfo, exportDate };
  
  exportToExcel(rows, columns, filename, pageInfoWithDate);
  // Small delay to ensure Excel export completes
  setTimeout(() => {
    exportToPDF(rows, columns, filename, pageInfoWithDate);
  }, 500);
};

/**
 * Export data with related/nested data to Excel (multi-sheet)
 * @param {Array} mainRows - Main table rows
 * @param {Array} mainColumns - Main table columns
 * @param {Array} relatedData - Array of { name, rows, columns } for related data sheets
 * @param {String} filename - Name of the file (without extension)
 * @param {Object} pageInfo - Optional page information
 */
export const exportToExcelWithRelated = (mainRows, mainColumns, relatedData = [], filename, pageInfo = {}) => {
  try {
    const wb = XLSX.utils.book_new();
    const exportDate = new Date().toLocaleString();

    // Helper function to create a worksheet from data
    const createWorksheet = (rows, columns, sheetName, includePageInfo = false) => {
      const exportData = [];

      // Add page information if this is the main sheet
      if (includePageInfo && pageInfo.title) {
        exportData.push(['Page Information']);
        exportData.push(['Title:', pageInfo.title]);
        if (pageInfo.description) {
          exportData.push(['Description:', pageInfo.description]);
        }
        exportData.push(['Export Date:', exportDate]);
        exportData.push([]);
      }

      // Add column headers
      const headers = columns
        .filter(col => col.field !== 'actions' && col.field !== 'Preview' && col.field !== 'preview')
        .map(col => col.headerName || col.field);
      exportData.push(headers);

      // Add row data
      rows.forEach(row => {
        const rowData = columns
          .filter(col => col.field !== 'actions' && col.field !== 'Preview' && col.field !== 'preview')
          .map(col => {
            const value = row[col.field];
            if (value === null || value === undefined) return '';
            if (typeof value === 'object') {
              return JSON.stringify(value);
            }
            return String(value);
          });
        exportData.push(rowData);
      });

      const ws = XLSX.utils.aoa_to_sheet(exportData);
      const colWidths = columns
        .filter(col => col.field !== 'actions' && col.field !== 'Preview' && col.field !== 'preview')
        .map(col => ({ wch: Math.max(col.headerName?.length || col.field.length || 10, 15) }));
      ws['!cols'] = colWidths;

      return ws;
    };

    // Add main data sheet
    const mainSheet = createWorksheet(mainRows, mainColumns, 'Main Data', true);
    XLSX.utils.book_append_sheet(wb, mainSheet, 'Main Data');

    // Add related data sheets
    relatedData.forEach(({ name, rows, columns }) => {
      if (rows && rows.length > 0 && columns && columns.length > 0) {
        const relatedSheet = createWorksheet(rows, columns, name, false);
        XLSX.utils.book_append_sheet(wb, relatedSheet, name.substring(0, 31)); // Excel sheet name limit
      }
    });

    XLSX.writeFile(wb, `${filename}.xlsx`);
  } catch (error) {
    console.error('Error exporting to Excel with related data:', error);
    throw error;
  }
};

/**
 * Export data with related/nested data to PDF (multi-page)
 * @param {Array} mainRows - Main table rows
 * @param {Array} mainColumns - Main table columns
 * @param {Array} relatedData - Array of { name, rows, columns } for related data sections
 * @param {String} filename - Name of the file (without extension)
 * @param {Object} pageInfo - Optional page information
 */
export const exportToPDFWithRelated = (mainRows, mainColumns, relatedData = [], filename, pageInfo = {}) => {
  try {
    const doc = new jsPDF();
    const exportDate = new Date().toLocaleString();
    let yPosition = 20;

    // Helper function to add a table section
    const addTableSection = (rows, columns, sectionTitle, isFirstSection = false) => {
      if (!isFirstSection) {
        doc.addPage();
        yPosition = 20;
      }

      // Add section title
      if (sectionTitle) {
        doc.setFontSize(14);
        doc.setFont(undefined, 'bold');
        doc.text(sectionTitle, 14, yPosition);
        yPosition += 10;
      }

      // Add page information only on first section
      if (isFirstSection && pageInfo.title) {
        doc.setFontSize(11);
        doc.setFont(undefined, 'normal');
        doc.text(`Title: ${pageInfo.title}`, 14, yPosition);
        yPosition += 7;
        if (pageInfo.description) {
          const splitDesc = doc.splitTextToSize(`Description: ${pageInfo.description}`, 180);
          doc.text(splitDesc, 14, yPosition);
          yPosition += splitDesc.length * 7;
        }
        doc.text(`Export Date: ${exportDate}`, 14, yPosition);
        yPosition += 10;
      }

      if (rows.length === 0) {
        doc.setFontSize(10);
        doc.text('No data available', 14, yPosition);
        yPosition += 10;
        return yPosition;
      }

      // Prepare table data
      const headers = columns
        .filter(col => col.field !== 'actions' && col.field !== 'Preview' && col.field !== 'preview')
        .map(col => col.headerName || col.field);

      const tableRows = rows.map(row => {
        return columns
          .filter(col => col.field !== 'actions' && col.field !== 'Preview' && col.field !== 'preview')
          .map(col => {
            const value = row[col.field];
            if (value === null || value === undefined) return '';
            if (typeof value === 'object') {
              return JSON.stringify(value);
            }
            return String(value);
          });
      });

      doc.autoTable({
        head: [headers],
        body: tableRows,
        startY: yPosition,
        styles: { fontSize: 9, cellPadding: 3 },
        headStyles: {
          fillColor: [30, 41, 59],
          textColor: [255, 255, 255],
          fontStyle: 'bold',
        },
        alternateRowStyles: {
          fillColor: [248, 250, 252],
        },
        margin: { top: yPosition, left: 14, right: 14 },
      });

      return doc.lastAutoTable.finalY + 10;
    };

    // Add main data section
    yPosition = addTableSection(mainRows, mainColumns, 'Main Data', true);

    // Add related data sections
    relatedData.forEach(({ name, rows, columns }) => {
      if (rows && rows.length > 0 && columns && columns.length > 0) {
        yPosition = addTableSection(rows, columns, name, false);
      }
    });

    doc.save(`${filename}.pdf`);
  } catch (error) {
    console.error('Error exporting to PDF with related data:', error);
    throw error;
  }
};
