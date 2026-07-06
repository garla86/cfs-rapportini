import jsPDF from 'jspdf';
import autoTable, { RowInput } from 'jspdf-autotable';
import { DailyReport } from '../types';

interface PdfOptions {
  returnBlob?: boolean;
}

interface GeneratedPdf {
  blob: Blob;
  fileName: string;
}

// Brand Colors
const CFS_ORANGE = [243, 125, 32];
const CFS_BLUE = [72, 122, 150];
const CFS_GREY = [90, 89, 84];

// A4 Definitions
const A4_HEIGHT = 297;
const A4_WIDTH = 210;
const MARGIN = 10;
const PRINT_WIDTH = A4_WIDTH - (MARGIN * 2);

/**
 * Draws the CFS Logo at a specific x,y coordinate with a specific size.
 */
const drawLogo = (doc: jsPDF, x: number, y: number, s: number) => {
  // Logo Drawing Logic (Vector paths based on the Logo component)
  const px = (val: number) => x + (val * s / 100);
  const py = (val: number) => y + (val * s / 100);

  // Orange Arrow
  doc.setFillColor(CFS_ORANGE[0], CFS_ORANGE[1], CFS_ORANGE[2]);
  doc.lines([
    [px(20) - px(50), py(20) - py(20)],
    [px(20) - px(20), py(80) - py(20)],
    [px(0) - px(20),  py(80) - py(80)],
    [px(25) - px(0),  py(100) - py(80)],
    [px(50) - px(25), py(80) - py(100)],
    [px(42) - px(50), py(80) - py(80)],
    [px(42) - px(42), py(50) - py(80)],
    [px(50) - px(42), py(40) - py(50)],
  ], px(50), py(20), [1, 1], 'F', true);

  // Blue Arrow
  doc.setFillColor(CFS_BLUE[0], CFS_BLUE[1], CFS_BLUE[2]);
  doc.lines([
    [px(80) - px(50), py(80) - py(80)],
    [px(80) - px(80), py(20) - py(80)],
    [px(100) - px(80), py(20) - py(20)],
    [px(75) - px(100), py(0) - py(20)],
    [px(50) - px(75), py(20) - py(0)],
    [px(58) - px(50), py(20) - py(20)],
    [px(58) - px(58), py(50) - py(20)],
    [px(50) - px(58), py(60) - py(50)],
  ], px(50), py(80), [1, 1], 'F', true);
  
  // Logo Text
  const textX = x + s * 1.1;
  const textY = y + s * 0.55;
  doc.setFontSize(s * 1.8);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(CFS_GREY[0], CFS_GREY[1], CFS_GREY[2]);
  doc.text('CFS', textX, textY);
  
  doc.setFontSize(s * 0.55);
  doc.setFont('helvetica', 'normal');
  doc.setCharSpace(2);
  doc.text('FACILITY', textX, textY + (s * 0.4));
  doc.setCharSpace(0);
};

export const generateDailyPdf = (
  reports: DailyReport[], 
  date: string, 
  technicianName: string, 
  options: PdfOptions = {}
): GeneratedPdf[] | void => {

  // ==========================================
  // 1. GENERATE MAIN PDF (Summary List)
  // ==========================================
  const docMain = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  
  // Header Main
  drawLogo(docMain, MARGIN, 8, 12); // Smaller logo top left
  
  // Info Box Top Right
  docMain.setDrawColor(0);
  docMain.setLineWidth(0.1);
  const mBoxWidth = 60;
  const mBoxX = A4_WIDTH - MARGIN - mBoxWidth;
  
  docMain.rect(mBoxX, 6, mBoxWidth, 18);
  docMain.setFontSize(8);
  docMain.setFont('helvetica', 'bold');
  docMain.text('DATA:', mBoxX + 2, 11);
  docMain.setFont('helvetica', 'normal');
  docMain.text(date, mBoxX + 15, 11);
  docMain.setFont('helvetica', 'bold');
  docMain.text('TECNICO:', mBoxX + 2, 18);
  docMain.setTextColor(CFS_BLUE[0], CFS_BLUE[1], CFS_BLUE[2]);
  docMain.text(technicianName.substring(0, 25), mBoxX + 2, 22);
  docMain.setTextColor(0, 0, 0);

  // Title Box (Centered - Moved down to avoid overlap)
  docMain.setFontSize(14); 
  docMain.setFont('helvetica', 'bold');
  docMain.text('FOGLIO GIORNALIERO INTERVENTI', A4_WIDTH / 2, 32, { align: 'center' }); 
  docMain.setFontSize(9);
  docMain.setFont('helvetica', 'normal');
  docMain.text('M-FGI-01-IT', A4_WIDTH / 2, 37, { align: 'center' });


  // Data Preparation for Main PDF
  let totalOrdinaryCol = 0;
  let totalRepInt = 0;
  let totalRepTravel = 0;
  const mainDataRows: any[] = [];

  reports.forEach(report => {
    const isRep = report.workType === 'on_call';
    const isExtra = report.workType === 'extraordinary';
    
    const descriptionText = isExtra ? "Vedi foglio interventi straordinari" : report.description;

    if (isRep) {
      totalRepInt += report.interventionHours;
      totalRepTravel += report.travelHours;
    } else {
      totalOrdinaryCol += report.interventionHours;
    }

    mainDataRows.push([
      report.location,                  
      descriptionText,               
      (!isRep && report.interventionHours > 0) ? report.interventionHours.toString() : '', 
      (isRep && report.interventionHours > 0) ? report.interventionHours.toString() : '',  
      (isRep && report.travelHours > 0) ? report.travelHours.toString() : '',              
      '', '', '', '', '', ''            
    ]);
  });

  // Fill empty rows to fill page nicely
  // Standard A4 can comfortably fit ~20-25 rows with this font size
  while (mainDataRows.length < 20) {
    mainDataRows.push(['', '', '', '', '', '', '', '', '', '', '']);
  }

  const extraTotalInt = reports.filter(r => r.workType === 'extraordinary').reduce((acc, curr) => acc + curr.interventionHours, 0);

  const mainTotalRow = [
    { content: 'TOTALI', styles: { fontStyle: 'bold', halign: 'right' } },
    { content: '', styles: { fillColor: [240, 240, 240] } },
    { content: totalOrdinaryCol > 0 ? totalOrdinaryCol.toFixed(1) : '', styles: { fontStyle: 'bold', halign: 'center' } },
    { content: totalRepInt > 0 ? totalRepInt.toFixed(1) : '', styles: { fontStyle: 'bold', halign: 'center' } },
    { content: totalRepTravel > 0 ? totalRepTravel.toFixed(1) : '', styles: { fontStyle: 'bold', halign: 'center', textColor: [200, 0, 0] } },
    '', '', '', '', '', ''
  ];

  // @ts-ignore
  autoTable(docMain, {
    startY: 42, // Adjusted start Y due to header shift
    head: [[
      { content: 'Intervento', colSpan: 2, styles: { halign: 'center', valign: 'middle', fontStyle: 'bold' } },
      { content: 'ORE', rowSpan: 2, styles: { valign: 'middle', halign: 'center', fontStyle: 'bold' } },
      { content: 'REP.', colSpan: 2, styles: { halign: 'center', valign: 'middle', fontStyle: 'bold', textColor: [200, 0, 0] } }, 
      { content: 'CC', rowSpan: 2, styles: { valign: 'middle', halign: 'center' } },
      { content: 'PRC', rowSpan: 2, styles: { valign: 'middle', halign: 'center' } },
      { content: 'CG / GRC', rowSpan: 2, styles: { valign: 'middle', halign: 'center' } },
      { content: 'LE', rowSpan: 2, styles: { valign: 'middle', halign: 'center' } },
      { content: 'FERIE', rowSpan: 2, styles: { valign: 'middle', halign: 'center' } },
      { content: 'ROL', rowSpan: 2, styles: { valign: 'middle', halign: 'center' } },
    ],
    [
      { content: 'Luogo intervento', styles: { halign: 'left' } },
      { content: 'Descrizione intervento', styles: { halign: 'left' } },
      { content: 'Ore\nint.', styles: { halign: 'center', fontSize: 7, textColor: [200, 0, 0] } },
      { content: 'Ore\nviag.\nrep.', styles: { halign: 'center', fontSize: 7, textColor: [200, 0, 0] } },
    ]],
    body: [...mainDataRows, mainTotalRow],
    theme: 'grid',
    styles: { fontSize: 8, lineColor: [0, 0, 0], lineWidth: 0.1, cellPadding: 1.5, textColor: [0, 0, 0], valign: 'middle' },
    headStyles: { fillColor: [255, 255, 255], textColor: [0, 0, 0], lineWidth: 0.2, lineColor: [0, 0, 0] },
    margin: { left: MARGIN, right: MARGIN },
    columnStyles: {
      0: { cellWidth: 40 },
      1: { cellWidth: 'auto' }, // Expands to fill width
      2: { cellWidth: 10, halign: 'center' },
      3: { cellWidth: 10, halign: 'center' },
      4: { cellWidth: 10, halign: 'center' },
      5: { cellWidth: 8 }, 6: { cellWidth: 8 }, 7: { cellWidth: 12 }, 8: { cellWidth: 8 }, 9: { cellWidth: 10 }, 10: { cellWidth: 8 },
    },
    tableWidth: 'auto', // Uses margin settings to fill page width
    didDrawCell: (data) => {
      // Produce form input fields for CC through ROL columns
      if (data.section === 'body' && data.column.index >= 5 && data.column.index <= 10) {
        const docAny = docMain as any;
        const rect = data.cell;
        const textField = new docAny.AcroFormTextField();
        textField.Rect = [rect.x + 0.5, rect.y + 0.5, rect.width - 1, rect.height - 1];
        textField.fieldName = `Field_${data.row.index}_${data.column.index}`;
        textField.value = '';
        textField.maxFontSize = 8;
        textField.textAlign = 'center';
        textField.showWhenPrinted = true;
        // Most PDF readers highlight form fields automatically
        docAny.addField(textField);
      }
    }
  });

  // Footer Main (Fixed at bottom of A4)
  const footerY = 275; // Approx 22mm from bottom
  docMain.setDrawColor(0);
  docMain.rect(MARGIN, footerY, PRINT_WIDTH, 10);
  docMain.setFont('helvetica', 'bold');
  docMain.setFontSize(9);
  docMain.text('RIEPILOGO:', MARGIN + 2, footerY + 6);
  docMain.setFont('helvetica', 'normal');
  docMain.text('ORE INT. REP.:', MARGIN + 40, footerY + 6);
  docMain.text(totalRepInt.toFixed(1), MARGIN + 70, footerY + 6);
  docMain.text('ORE VIAG. REP.:', MARGIN + 85, footerY + 6);
  docMain.text(totalRepTravel.toFixed(1), MARGIN + 115, footerY + 6);
  docMain.text('ORE STRAORD.:', MARGIN + 130, footerY + 6);
  docMain.text(extraTotalInt.toFixed(1), MARGIN + 160, footerY + 6);


  // ==========================================
  // 2. GENERATE EXTRAORDINARY PDF (Form Style - Single Page Optimized)
  // ==========================================
  const extraReports = reports.filter(r => r.workType === 'extraordinary');
  const extraDocs: { doc: jsPDF, index: number }[] = [];
  
  extraReports.forEach((extraReport, index) => {
    const docExtra = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    
    // -- HEADER (Shifted up to save space) --
    drawLogo(docExtra, MARGIN, 8, 15);
    
    // Grey Header Box
    docExtra.setFillColor(230, 230, 230); // Light Grey
    docExtra.setDrawColor(0);
    docExtra.setLineWidth(0.3);
    
    // Header Info
    const headerBoxX = 80;
    const headerBoxW = A4_WIDTH - headerBoxX - MARGIN;
    docExtra.roundedRect(headerBoxX, 8, headerBoxW, 15, 2, 2, 'FD'); 
    
    docExtra.setFont('helvetica', 'bold');
    docExtra.setFontSize(11);
    docExtra.setTextColor(0);
    const headerCenterX = headerBoxX + (headerBoxW / 2);
    docExtra.text('INTERVENTI TECNICI', headerCenterX, 13, { align: 'center' });
    docExtra.text('ASSISTENZA - MANUTENZIONE', headerCenterX, 18, { align: 'center' });
    docExtra.setFontSize(8);
    docExtra.setFont('helvetica', 'normal');
    docExtra.text('MT-INT-23-01', headerCenterX, 22, { align: 'center' });

    // -- INFO SECTION (Compressed) --
    const startY = 28; // Shifted up
    docExtra.setDrawColor(0);
    docExtra.setLineWidth(0.1);
    
    // Left side: Data
    docExtra.setFontSize(9);
    docExtra.text('DATA :', MARGIN, startY + 8);
    docExtra.line(MARGIN + 15, startY + 8, 70, startY + 8);
    docExtra.text(date, MARGIN + 18, startY + 7);

    // Right Box: Cliente / Indirizzo
    const clientText = extraReport.location || '';
    const boxX = 100;
    const boxW = A4_WIDTH - boxX - MARGIN;

    docExtra.rect(boxX, startY, boxW, 20); // Height reduced
    docExtra.text('CLIENTE:', boxX + 2, startY + 5);
    docExtra.line(boxX + 20, startY + 5, A4_WIDTH - MARGIN - 2, startY + 5);
    docExtra.setFont('helvetica', 'bold');
    docExtra.text(clientText, boxX + 22, startY + 4); // Fill client
    docExtra.setFont('helvetica', 'normal');

    docExtra.text('INDIRIZZO:', boxX + 2, startY + 12);
    docExtra.line(boxX + 22, startY + 12, A4_WIDTH - MARGIN - 2, startY + 12);
    docExtra.line(boxX + 22, startY + 18, A4_WIDTH - MARGIN - 2, startY + 18);

    // -- TECHNICIAN SECTION --
    const techY = 52;
    docExtra.setFontSize(9);
    docExtra.text('PERSONALE TECNICO:', MARGIN, techY);
    
    const extraHours = extraReport.interventionHours;

    // Line 1
    docExtra.text('Sig. :', MARGIN, techY + 6);
    docExtra.line(MARGIN + 12, techY + 6, 80, techY + 6);
    docExtra.text(technicianName, MARGIN + 15, techY + 5);
    docExtra.text('Ore:', 82, techY + 6);
    docExtra.line(90, techY + 6, 105, techY + 6);
    docExtra.text(`${extraHours > 0 ? extraHours : 0}`, 92, techY + 5);

    // Line 2
    docExtra.text('Sig. :', MARGIN, techY + 12);
    docExtra.line(MARGIN + 12, techY + 12, 80, techY + 12);
    docExtra.text('Ore:', 82, techY + 12);
    docExtra.line(90, techY + 12, 105, techY + 12);

    // -- MAINTENANCE TYPE --
    docExtra.text('MANUTENZIONE ORDINARIA   :', 115, techY + 6);
    docExtra.rect(173, techY + 3, 4, 4); // Checkbox Ordinaria
    
    docExtra.text('MANUTENZIONE STRAORDINARIA :', 115, techY + 12);
    docExtra.rect(173, techY + 9, 4, 4); // Checkbox Straordinaria
    docExtra.text('X', 174, techY + 12.5); // Segna la straordinaria
    docExtra.text(`(${extraHours > 0 ? extraHours : 0} h)`, 180, techY + 12.5); // Riporta chiaramente le ore qui


    // -- DESCRIPTION TABLE --
    // Header Bar
    const descHeaderY = 75;
    docExtra.setFillColor(220, 220, 220);
    docExtra.rect(MARGIN, descHeaderY, PRINT_WIDTH, 5, 'F');
    docExtra.rect(MARGIN, descHeaderY, PRINT_WIDTH, 5, 'S');
    docExtra.setFont('helvetica', 'bold');
    docExtra.setFontSize(9);
    docExtra.text('DESCRIZIONE LAVORI ESEGUITI', A4_WIDTH / 2, descHeaderY + 4, { align: 'center' });

    const combinedDesc = `${extraReport.location ? `[${extraReport.location}] ` : ''}${extraReport.description}`;

    const descRows: string[][] = [];
    const splitDesc = docExtra.splitTextToSize(combinedDesc, PRINT_WIDTH);
    splitDesc.forEach((line: string) => { descRows.push([line]); });
    
    // Reduced filler rows to ensure single page fit
    // 12 rows * 7mm = 84mm height
    while(descRows.length < 12) {
        descRows.push(['']);
    }

    // Body
    // @ts-ignore
    autoTable(docExtra, {
        startY: descHeaderY + 5,
        body: descRows,
        theme: 'plain',
        styles: {
            fontSize: 9, // Slightly smaller font
            cellPadding: 1.5,
            minCellHeight: 7, // Tighter rows
            valign: 'bottom',
            lineWidth: { bottom: 0.1 },
            lineColor: [0, 0, 0]
        },
        columnStyles: {
            0: { cellWidth: PRINT_WIDTH }
        },
        margin: { left: MARGIN, right: MARGIN }
    });

    // NOTE Section
    // @ts-ignore
    let currentY = docExtra.lastAutoTable.finalY;
    
    docExtra.setFont('helvetica', 'normal');
    docExtra.text('NOTE:', MARGIN, currentY + 5);
    docExtra.rect(MARGIN, currentY, PRINT_WIDTH, 6); // Slightly smaller box

    // -- MATERIALS TABLE --
    currentY += 10;
    docExtra.setFillColor(220, 220, 220);
    docExtra.rect(MARGIN, currentY, PRINT_WIDTH, 5, 'F');
    docExtra.rect(MARGIN, currentY, PRINT_WIDTH, 5, 'S');
    docExtra.setFont('helvetica', 'bold');
    docExtra.text('MATERIALI IMPIEGATI', A4_WIDTH / 2, currentY + 4, { align: 'center' });

    // Reduced Materials Rows
    const matRows = [[''],[''],['']]; // 3 rows
    // @ts-ignore
    autoTable(docExtra, {
        startY: currentY + 5,
        body: matRows,
        theme: 'plain',
        styles: {
            minCellHeight: 7,
            lineWidth: { bottom: 0.1 },
            lineColor: [0, 0, 0]
        },
        margin: { left: MARGIN, right: MARGIN }
    });

    // NOTE Section Materials
    // @ts-ignore
    currentY = docExtra.lastAutoTable.finalY;
    docExtra.setFont('helvetica', 'normal');
    docExtra.text('NOTE:', MARGIN, currentY + 5);
    docExtra.rect(MARGIN, currentY, PRINT_WIDTH, 6);

    // -- FOOTER (Fixed at Bottom of A4) --
    const footerStart = 255; 
    
    docExtra.rect(MARGIN, footerStart, PRINT_WIDTH, 15);
    docExtra.line(A4_WIDTH / 2, footerStart, A4_WIDTH / 2, footerStart + 15);

    if (extraReport.technicianSignature) {
      try {
        docExtra.addImage(extraReport.technicianSignature, 'PNG', MARGIN + 2, footerStart + 1, (PRINT_WIDTH / 2) - 4, 10);
      } catch (e) { console.error('Error drawing technician signature', e); }
    }
    if (extraReport.clientSignature) {
      try {
        docExtra.addImage(extraReport.clientSignature, 'PNG', (A4_WIDTH / 2) + 2, footerStart + 1, (PRINT_WIDTH / 2) - 4, 10);
      } catch (e) { console.error('Error drawing client signature', e); }
    }

    docExtra.setFontSize(8);
    docExtra.text('FIRMA DEL TECNICO', MARGIN + 25, footerStart + 13);
    docExtra.text('FIRMA DEL CLIENTE', (A4_WIDTH / 2) + 25, footerStart + 13);

    // PROD-IT Box
    const prodY = footerStart + 18;
    const prodW = 83;
    const prodX = (A4_WIDTH - prodW) / 2;
    
    docExtra.rect(prodX, prodY, prodW, 10);
    
    docExtra.setFillColor(220, 220, 220);
    docExtra.rect(prodX, prodY, prodW, 4, 'F');
    docExtra.rect(prodX, prodY, prodW, 4, 'S');
    docExtra.setFont('helvetica', 'bold');
    docExtra.text('PROD-IT', A4_WIDTH / 2, prodY + 3, { align: 'center' });
    
    docExtra.line(prodX + 31, prodY + 4, prodX + 31, prodY + 10);
    docExtra.setFont('helvetica', 'normal');
    docExtra.setFontSize(7);
    docExtra.text('Data', prodX + 15, prodY + 7, { align: 'center' });
    docExtra.text('Firma', prodX + 57, prodY + 7, { align: 'center' });

    // -- ALLEGATI FOTOGRAFICI --
    if (extraReport.photos && extraReport.photos.length > 0) {
      docExtra.addPage();
      docExtra.setFont('helvetica', 'bold');
      docExtra.setFontSize(14);
      docExtra.text('ALLEGATI FOTOGRAFICI', A4_WIDTH / 2, 20, { align: 'center' });
      docExtra.setFont('helvetica', 'normal');
      docExtra.setFontSize(10);
      docExtra.text(`Rif: ${extraReport.location}`, A4_WIDTH / 2, 26, { align: 'center' });

      let photoY = 35;
      extraReport.photos.forEach((photoDataUrl) => {
        try {
          const props = docExtra.getImageProperties(photoDataUrl);
          let photoWidth = PRINT_WIDTH;
          let photoHeight = (props.height * photoWidth) / props.width;

          // Se l'immagine è troppo alta (es. portrait) riduciamo le dimensioni
          const maxAvailableHeight = A4_HEIGHT - (MARGIN * 2);
          if (photoHeight > maxAvailableHeight) {
            photoHeight = maxAvailableHeight;
            photoWidth = (props.width * photoHeight) / props.height;
          }

          if (photoY + photoHeight > A4_HEIGHT - MARGIN) {
             docExtra.addPage();
             photoY = MARGIN; // start from top margin on new page
          }
          
          // Center the image horizontally if it was scaled down
          const xPos = MARGIN + (PRINT_WIDTH - photoWidth) / 2;
          
          docExtra.addImage(photoDataUrl, 'JPEG', xPos, photoY, photoWidth, photoHeight, undefined, 'FAST');
          photoY += photoHeight + 10;
        } catch (e) {
          console.error("Failed to add image to PDF", e);
        }
      });
    }
    
    extraDocs.push({ doc: docExtra, index: index + 1 });
  });


  // --- RETURN LOGIC ---
  const result: GeneratedPdf[] = [];
  const mainName = `Rapportino_${technicianName.replace(/\s+/g, '_')}_${date}.pdf`;
  
  result.push({
    blob: docMain.output('blob'),
    fileName: mainName
  });

  extraDocs.forEach(({ doc, index }) => {
    const suffix = extraDocs.length > 1 ? `_${index}` : '';
    result.push({
      blob: doc.output('blob'),
      fileName: `Straordinario_${technicianName.replace(/\s+/g, '_')}_${date}${suffix}.pdf`
    });
  });

  if (options.returnBlob) {
    return result;
  } else {
    // Direct Download Trigger
    docMain.save(mainName);
    extraDocs.forEach(({ doc, index }, i) => {
      setTimeout(() => {
        const suffix = extraDocs.length > 1 ? `_${index}` : '';
        doc.save(`Straordinario_${technicianName.replace(/\s+/g, '_')}_${date}${suffix}.pdf`);
      }, 500 * (i + 1));
    });
  }
};