/**
 * PDF Export Utility
 * Generates PDF reports with cashflow statements and Sankey diagrams
 */

import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

/**
 * Format currency for display
 */
const formatCurrency = (value) => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(Number(value) || 0);
};

/**
 * Format month string (YYYY-MM) to readable format
 */
const formatMonth = (monthStr) => {
  if (!monthStr) return '';
  const [year, month] = monthStr.split('-');
  const date = new Date(year, parseInt(month) - 1);
  return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
};

/**
 * Generate cashflow statement page (Page 1)
 */
const generateCashflowStatementPage = (doc, plStructure, bvaCategories, grandTotalIncome, grandTotalExpense, startDate, endDate) => {
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 20;
  const lineHeight = 6;
  let yPos = margin;

  // Header (smaller to save space)
  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.text('Cashflow Statement', pageWidth / 2, yPos, { align: 'center' });
  yPos += 8;

  // Date range
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  const dateRange = `${startDate} to ${endDate}`;
  doc.text(`Period: ${dateRange}`, pageWidth / 2, yPos, { align: 'center' });
  yPos += 10;

  // Build category hierarchy for detailed display
  const buildCategoryHierarchy = (categories, rootType) => {
    const rootMap = new Map();
    const childMap = new Map();

    categories.forEach(cat => {
      if (!cat.root_id || cat.root_type !== rootType) return;
      
      if (cat.level === 0 || !cat.parent_category_id) {
        // Root category
        if (!rootMap.has(cat.root_id)) {
          rootMap.set(cat.root_id, {
            ...cat,
            children: []
          });
        }
      } else {
        // Child category
        if (!childMap.has(cat.root_id)) {
          childMap.set(cat.root_id, []);
        }
        childMap.get(cat.root_id).push(cat);
      }
    });

    // Attach children to roots
    rootMap.forEach((root, rootId) => {
      const children = childMap.get(rootId) || [];
      root.children = children.sort((a, b) => a.category_name.localeCompare(b.category_name));
    });

    return Array.from(rootMap.values()).sort((a, b) => a.root_name.localeCompare(b.root_name));
  };

  const incomeHierarchy = buildCategoryHierarchy(bvaCategories || [], 'income');
  const expenseHierarchy = buildCategoryHierarchy(bvaCategories || [], 'expense');

  // Calculate available space for content
  const availableHeight = pageHeight - (margin * 2);
  const headerHeight = 25; // Space for header and date
  const sectionHeaderHeight = 8; // Space for section headers
  const footerHeight = 15; // Space for totals
  const usableHeight = availableHeight - headerHeight - (sectionHeaderHeight * 2) - footerHeight;

  // Calculate how much space we need and scale accordingly
  let totalIncomeItems = 0;
  incomeHierarchy.forEach(root => {
    totalIncomeItems += 1; // Root
    if (root.children) {
      totalIncomeItems += root.children.filter(c => (c.total_income || 0) > 0).length;
    }
  });
  
  let totalExpenseItems = 0;
  expenseHierarchy.forEach(root => {
    totalExpenseItems += 1; // Root
    if (root.children) {
      totalExpenseItems += root.children.filter(c => (c.total_expense || 0) > 0).length;
    }
  });
  
  const totalItems = totalIncomeItems + totalExpenseItems;
  const itemsPerLine = usableHeight / lineHeight;
  const needsScaling = totalItems > itemsPerLine;
  
  // Adjust font sizes if needed
  let rootFontSize = 9.5;
  let childFontSize = 8.5;
  let currentLineHeight = lineHeight;
  
  if (needsScaling) {
    const scaleFactor = itemsPerLine / totalItems;
    rootFontSize = Math.max(8, rootFontSize * scaleFactor);
    childFontSize = Math.max(7.5, childFontSize * scaleFactor);
    currentLineHeight = Math.max(4.5, lineHeight * scaleFactor);
  }

  // Income Section
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(0, 128, 0); // Green
  doc.text('INCOME', margin, yPos);
  yPos += currentLineHeight + 2;

  doc.setFontSize(rootFontSize);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(0, 0, 0); // Black

  // Income roots and child categories
  incomeHierarchy.forEach(root => {
    // Root category name
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(rootFontSize);
    doc.text(root.root_name, margin + 3, yPos);
    const rootTotal = root.total_income || 0;
    doc.text(formatCurrency(rootTotal), pageWidth - margin - 40, yPos, { align: 'right' });
    yPos += currentLineHeight;

    // Child categories (only show if there's space)
    if (root.children && root.children.length > 0 && yPos < pageHeight - margin - 40) {
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(childFontSize);
      root.children.forEach(child => {
        if (yPos > pageHeight - margin - 30) return; // Stop if running out of space
        const childTotal = child.total_income || 0;
        if (childTotal > 0) {
          doc.text(`  ${child.category_name}`, margin + 6, yPos);
          doc.text(formatCurrency(childTotal), pageWidth - margin - 40, yPos, { align: 'right' });
          yPos += currentLineHeight * 0.9; // Slightly tighter spacing for children
        }
      });
      doc.setFontSize(rootFontSize);
    }
    yPos += 1;
  });

  // Total Income
  yPos += 2;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text('Total Income', margin, yPos);
  doc.text(formatCurrency(grandTotalIncome), pageWidth - margin - 40, yPos, { align: 'right' });
  yPos += currentLineHeight + 5;

  // Expense Section
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(200, 0, 0); // Red
  doc.text('EXPENSES', margin, yPos);
  yPos += currentLineHeight + 2;

  doc.setFontSize(rootFontSize);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(0, 0, 0); // Black

  // Expense roots and child categories
  expenseHierarchy.forEach(root => {
    // Root category name
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(rootFontSize);
    doc.text(root.root_name, margin + 3, yPos);
    const rootTotal = root.total_expense || 0;
    doc.text(formatCurrency(rootTotal), pageWidth - margin - 40, yPos, { align: 'right' });
    yPos += currentLineHeight;

    // Child categories (only show if there's space)
    if (root.children && root.children.length > 0 && yPos < pageHeight - margin - 40) {
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(childFontSize);
      root.children.forEach(child => {
        if (yPos > pageHeight - margin - 30) return; // Stop if running out of space
        const childTotal = child.total_expense || 0;
        if (childTotal > 0) {
          doc.text(`  ${child.category_name}`, margin + 6, yPos);
          doc.text(formatCurrency(childTotal), pageWidth - margin - 40, yPos, { align: 'right' });
          yPos += currentLineHeight * 0.9; // Slightly tighter spacing for children
        }
      });
      doc.setFontSize(rootFontSize);
    }
    yPos += 1;
  });

  // Total Expenses
  yPos += 2;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text('Total Expenses', margin, yPos);
  doc.text(formatCurrency(grandTotalExpense), pageWidth - margin - 40, yPos, { align: 'right' });
  yPos += currentLineHeight + 5;

  // Net Income
  const netIncome = grandTotalIncome - grandTotalExpense;
  doc.setFontSize(13);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(netIncome >= 0 ? 0 : 200, netIncome >= 0 ? 128 : 0, 0);
  doc.text('Net Income', margin, yPos);
  doc.text(formatCurrency(netIncome), pageWidth - margin - 40, yPos, { align: 'right' });
};

/**
 * Capture Sankey diagram as image for a specific month
 * Returns a high-resolution image optimized for landscape PDF
 */
const captureSankeyForMonth = async (month, startDate, endDate, transactionStore, categoryStore) => {
  // Calculate month start and end dates
  const [year, monthNum] = month.split('-');
  const monthStart = `${year}-${monthNum}-01`;
  const lastDay = new Date(parseInt(year), parseInt(monthNum), 0).getDate();
  const monthEnd = `${year}-${monthNum}-${String(lastDay).padStart(2, '0')}`;

  // Generate Sankey data for this month
  const { generateSankeyData } = await import('./sankeyGenerator.js');
  const sankeyData = await generateSankeyData(monthStart, monthEnd, transactionStore, categoryStore);

  if (!sankeyData || sankeyData.nodes.length === 0) {
    return null;
  }

  // Create a temporary container for the Sankey diagram
  // Use landscape dimensions optimized for A4 landscape (297mm x 210mm)
  // At 2x scale for high quality: ~2240px x 1584px (approximate)
  const tempContainer = document.createElement('div');
  tempContainer.style.position = 'absolute';
  tempContainer.style.left = '-9999px';
  tempContainer.style.width = '1600px'; // Landscape width
  tempContainer.style.height = '1100px'; // Landscape height
  tempContainer.style.backgroundColor = 'white';
  document.body.appendChild(tempContainer);

  try {
    // Create Plotly Sankey diagram in temporary container
    const Plotly = (await import('plotly.js-dist-min')).default;
    const plotDiv = document.createElement('div');
    plotDiv.style.width = '100%';
    plotDiv.style.height = '100%';
    tempContainer.appendChild(plotDiv);

    // Prepare Plotly data
    const nodeLabels = sankeyData.nodes.map(node => node.name);
    const nodeColors = sankeyData.nodes.map(node => {
      if (node.id === 'net') {
        return node.isProfit ? '#10b981' : '#ef4444';
      }
      if (node.rootCategoryType === 'income') {
        return '#10b981';
      }
      return '#ef4444';
    });

    const sources = sankeyData.links.map(link => link.source);
    const targets = sankeyData.links.map(link => link.target);
    const values = sankeyData.links.map(link => link.value);

    const linkColors = sankeyData.links.map(link => {
      const targetNode = sankeyData.nodes[link.target];
      if (targetNode.rootCategoryType === 'income') {
        return 'rgba(16, 185, 129, 0.4)';
      }
      return 'rgba(239, 68, 68, 0.4)';
    });

    const data = {
      type: 'sankey',
      orientation: 'h',
      arrangement: 'snap',
      node: {
        pad: 20,
        thickness: 25,
        line: { color: 'black', width: 0.5 },
        label: nodeLabels,
        color: nodeColors
      },
      link: {
        source: sources,
        target: targets,
        value: values,
        color: linkColors
      }
    };

    // Landscape layout optimized for PDF
    const layout = {
      font: { size: 14, color: 'black' },
      paper_bgcolor: 'white',
      plot_bgcolor: 'white',
      height: 1100,
      width: 1600,
      margin: { l: 80, r: 80, t: 40, b: 40 }
    };

    // Render Plotly diagram
    await Plotly.newPlot(plotDiv, [data], layout, { displayModeBar: false });

    // Wait for rendering to complete
    await new Promise(resolve => setTimeout(resolve, 1500));

    // Capture as image using html2canvas with high quality
    const canvas = await html2canvas(tempContainer, {
      backgroundColor: '#ffffff',
      scale: 2, // High resolution for PDF
      logging: false,
      useCORS: true,
      width: 1600,
      height: 1100
    });

    return canvas.toDataURL('image/png');
  } finally {
    // Clean up temporary container
    document.body.removeChild(tempContainer);
  }
};

/**
 * Generate Sankey diagrams page (Page 2) - Landscape orientation, one per page
 */
const generateSankeyDiagramsPage = async (doc, months, startDate, endDate, transactionStore, categoryStore) => {
  // Capture and add Sankey diagram for each month (one per page, landscape)
  for (const month of months) {
    // Create a new landscape page for each month
    doc.addPage('landscape', 'a4');
    
    const pageWidth = doc.internal.pageSize.getWidth(); // Will be longer in landscape
    const pageHeight = doc.internal.pageSize.getHeight(); // Will be shorter in landscape
    const margin = 15;
    
    try {
      // Capture Sankey diagram for this month
      const imageData = await captureSankeyForMonth(month, startDate, endDate, transactionStore, categoryStore);
      
      if (imageData) {
        // Calculate dimensions to fit page (with margins)
        const maxWidth = pageWidth - (margin * 2);
        const maxHeight = pageHeight - (margin * 2) - 20; // Reserve space for title
        
        // Add month label at top
        doc.setFontSize(14);
        doc.setFont('helvetica', 'bold');
        doc.text(`Income & Expense Flow - ${formatMonth(month)}`, pageWidth / 2, margin + 8, { align: 'center' });
        
        // Calculate scaling to fit the image on the page
        // Get image dimensions from the data URL
        const img = new Image();
        await new Promise((resolve, reject) => {
          img.onload = resolve;
          img.onerror = reject;
          img.src = imageData;
        });
        
        const imgWidth = img.width;
        const imgHeight = img.height;
        
        // Calculate scale to fit within page bounds
        const scaleX = maxWidth / imgWidth;
        const scaleY = maxHeight / imgHeight;
        const scale = Math.min(scaleX, scaleY, 1); // Don't scale up, only down
        
        const scaledWidth = imgWidth * scale;
        const scaledHeight = imgHeight * scale;
        
        // Center the image
        const xPos = (pageWidth - scaledWidth) / 2;
        const yPos = margin + 15; // Below title
        
        // Add Sankey diagram image (scaled to fit)
        doc.addImage(imageData, 'PNG', xPos, yPos, scaledWidth, scaledHeight);
      } else {
        // Add error message if no image
        doc.setFontSize(12);
        doc.setFont('helvetica', 'normal');
        doc.text(`No data available for ${formatMonth(month)}`, pageWidth / 2, pageHeight / 2, { align: 'center' });
      }
    } catch (error) {
      console.error(`Error capturing Sankey for month ${month}:`, error);
      // Add error message
      doc.setFontSize(12);
      doc.setFont('helvetica', 'normal');
      doc.text(`Error generating diagram for ${formatMonth(month)}`, pageWidth / 2, pageHeight / 2, { align: 'center' });
    }
  }
};

/**
 * Export PDF report
 * @param {Object} options - Export options
 * @param {Object} options.plStructure - P&L structure with income/expense roots
 * @param {number} options.grandTotalIncome - Total income
 * @param {number} options.grandTotalExpense - Total expense
 * @param {string} options.startDate - Start date (YYYY-MM-DD)
 * @param {string} options.endDate - End date (YYYY-MM-DD)
 * @param {Array<string>} options.months - Array of month strings (YYYY-MM)
 * @param {Object} options.transactionStore - Transaction store instance
 * @param {Object} options.categoryStore - Category store instance
 */
export const exportPDFReport = async ({
  plStructure,
  bvaCategories,
  grandTotalIncome,
  grandTotalExpense,
  startDate,
  endDate,
  months = [],
  transactionStore,
  categoryStore
}) => {
  // Create PDF document (A4 size)
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });

  // Page 1: Cashflow Statement
  generateCashflowStatementPage(doc, plStructure, bvaCategories, grandTotalIncome, grandTotalExpense, startDate, endDate);

  // Sankey Diagrams (one landscape page per month)
  // Note: generateSankeyDiagramsPage adds its own pages, so we don't add one here
  if (months.length > 0 && transactionStore && categoryStore) {
    await generateSankeyDiagramsPage(doc, months, startDate, endDate, transactionStore, categoryStore);
  }

  // Generate filename
  const start = startDate ? new Date(startDate).toISOString().split('T')[0] : 'all';
  const end = endDate ? new Date(endDate).toISOString().split('T')[0] : 'all';
  const filename = `cashflow-report-${start}-to-${end}.pdf`;

  // Save PDF
  doc.save(filename);
};

