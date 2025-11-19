import { Response } from "express";
import ExcelJS from "exceljs";
import { toZonedTime, format as fmt } from "date-fns-tz";
import PdfPrinter from "pdfmake";
import pdfMakeVfs from "pdfmake/build/vfs_fonts";

const NP_ZONE = "Asia/Kathmandu";
export function formatDateTime(input?: string | Date, zone = NP_ZONE) {
  const d = input ? new Date(input) : new Date();
  const zoned = toZonedTime(d, zone);
  return fmt(zoned, "yyyy-MM-dd hh:mm a", { timeZone: zone });
}

const pdfVfs =
  (pdfMakeVfs as { pdfMake?: { vfs: Record<string, string> } }).pdfMake?.vfs ??
  (pdfMakeVfs as unknown as Record<string, string>);

const toFontBuffer = (name: string) => {
  const font = pdfVfs[name];
  if (!font) {
    throw new Error(`Missing font '${name}' in pdfmake vfs.`);
  }
  return Buffer.from(font, "base64");
};

const ROBOTO_FONTS = {
  Roboto: {
    normal: toFontBuffer("Roboto-Regular.ttf"),
    bold: toFontBuffer("Roboto-Medium.ttf"),
    italics: toFontBuffer("Roboto-Italic.ttf"),
    bolditalics: toFontBuffer("Roboto-MediumItalic.ttf"),
  },
};

const thinBorder = (argb: string): Partial<ExcelJS.Border> => ({
  style: "thin" as ExcelJS.BorderStyle,
  color: { argb },
});

const mediumBorder = (argb: string): Partial<ExcelJS.Border> => ({
  style: "medium" as ExcelJS.BorderStyle,
  color: { argb },
});

type ExcelColumn = {
  header: string;
  key: string;
  width?: number;
  alignment?: Partial<ExcelJS.Alignment>;
};

export async function writeExcelResponse(
  res: Response,
  fileBaseName: string,
  columns: ExcelColumn[],
  rows: Record<string, any>[],
  title = "Report"
) {
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet(title);

  ws.columns = columns.map((c) => ({
    key: c.key,
    width: c.width,
  }));

  const tableColumnCount = columns.length;
  const neutralBorder = thinBorder("FFE5E7EB");

  const titleRow = ws.addRow([title]);
  ws.mergeCells(1, 1, 1, tableColumnCount);
  titleRow.height = 30;
  titleRow.font = { size: 18, bold: true, color: { argb: "FF111827" } };
  titleRow.alignment = { vertical: "middle", horizontal: "center" };
  titleRow.fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FFF3F4F6" },
  };
  titleRow.border = {
    bottom: mediumBorder("FFD1D5DB"),
  };

  ws.addRow([]);

  const headerRow = ws.addRow(columns.map((c) => c.header));
  headerRow.height = 24;
  headerRow.eachCell((cell, columnNumber) => {
    cell.font = { bold: true, color: { argb: "FFFFFFFF" } };
    cell.alignment = {
      vertical: "middle",
      horizontal: "center",
      wrapText: true,
    };
    cell.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FF1F2937" },
    };
    cell.border = {
      top: mediumBorder("FF1F2937"),
      left: neutralBorder,
      right: neutralBorder,
      bottom: neutralBorder,
    };
    if (columnNumber === 1) {
      cell.border.left = mediumBorder("FF1F2937");
    }
    if (columnNumber === tableColumnCount) {
      cell.border.right = mediumBorder("FF1F2937");
    }
  });

  rows.forEach((rowData, rowIndex) => {
    const values = columns.map((column) => {
      const value = rowData[column.key];
      return value === undefined || value === "" ? "-" : value;
    });
    const row = ws.addRow(values);
    row.height = 22;

    const isStriped = rowIndex % 2 === 0;
    if (isStriped) {
      row.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "FFF9FAFB" },
      };
    }

    row.eachCell((cell, columnNumber) => {
      const columnConfig = columns[columnNumber - 1];
      const baseAlignment: Partial<ExcelJS.Alignment> = {
        vertical: "middle",
        horizontal: "left",
        wrapText: true,
      };
      cell.alignment = { ...baseAlignment, ...(columnConfig.alignment ?? {}) };
      cell.border = {
        left: columnNumber === 1 ? mediumBorder("FFCBD5F5") : neutralBorder,
        right:
          columnNumber === tableColumnCount
            ? mediumBorder("FFCBD5F5")
            : neutralBorder,
        top: neutralBorder,
        bottom: neutralBorder,
      };
      if (!isStriped) {
        cell.fill = {
          type: "pattern",
          pattern: "solid",
          fgColor: { argb: "FFFFFFFF" },
        };
      }
    });
  });

  const tableStartRow = headerRow.number;
  const tableEndRow = tableStartRow + rows.length;

  for (let colIndex = 1; colIndex <= tableColumnCount; colIndex += 1) {
    const topCell = ws.getCell(tableStartRow, colIndex);
    topCell.border = { ...topCell.border, top: mediumBorder("FF1F2937") };

    const bottomCell = ws.getCell(tableEndRow, colIndex);
    bottomCell.border = {
      ...bottomCell.border,
      bottom: mediumBorder("FF1F2937"),
    };
  }

  ws.columns.forEach((column, columnIndex) => {
    const config = columns[columnIndex];
    if (!config?.width) {
      const max = Math.max(
        ...ws.getColumn(columnIndex + 1).values.map((value) =>
          value
            ? String(value)
                .split("\n")
                .reduce((acc, part) => Math.max(acc, part.length), 0)
            : 0
        )
      );
      column.width = Math.min(Math.max(12, max + 2), 50);
    }
  });

  ws.views = [{ state: "frozen", ySplit: headerRow.number }];

  ws.addRow([]);
  const tsRow = ws.addRow([
    `Generated: ${formatDateTime(new Date())} (Asia/Kathmandu)`,
  ]);
  ws.mergeCells(tsRow.number, 1, tsRow.number, tableColumnCount);
  tsRow.alignment = { horizontal: "right", vertical: "middle" };
  tsRow.font = { italic: true, color: { argb: "FF6B7280" } };
  tsRow.border = { top: thinBorder("FFE5E7EB") };

  const fileName = `${fileBaseName}-${new Date()
    .toISOString()
    .slice(0, 10)}.xlsx`;
  res.setHeader("Content-Disposition", `attachment; filename="${fileName}"`);
  res.setHeader(
    "Content-Type",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
  );
  await wb.xlsx.write(res);
  res.end();
}

type PdfColumn = {
  header: string;
  key: string;
  width?: number | "*" | "auto";
};

export async function writePdfResponse(
  res: Response,
  fileBaseName: string,
  title: string,
  columns: PdfColumn[],
  rows: Record<string, any>[]
) {
  const printer = new PdfPrinter(ROBOTO_FONTS as any);
  const manyColumns = columns.length > 6;
  const tableWidths = columns.map((column) => column.width ?? "*");

  const headerRow = columns.map((c) => ({
    text: c.header,
    bold: true,
    color: "#ffffff",
  }));

  const body = [
    headerRow,
    ...rows.map((r) =>
      columns.map((c) => ({
        text:
          r[c.key] === undefined || r[c.key] === null || r[c.key] === ""
            ? "-"
            : String(r[c.key]),
      }))
    ),
  ];

  const cellPadding = manyColumns ? 4 : 6;

  const tableLayout: any = {
    fillColor: (rowIndex: number) => {
      if (rowIndex === 0) return "#111827";
      return rowIndex % 2 === 0 ? "#F9FAFB" : null;
    },
    hLineColor: () => "#E5E7EB",
    vLineColor: () => "#E5E7EB",
    paddingLeft: () => cellPadding,
    paddingRight: () => cellPadding,
    paddingTop: () => cellPadding,
    paddingBottom: () => cellPadding,
  };

  const docDefinition: any = {
    content: [
      {
        text: title,
        fontSize: 14,
        bold: true,
        alignment: "center",
        margin: [0, 0, 0, 14],
      },
      {
        table: {
          headerRows: 1,
          widths: tableWidths,
          body,
        },
        layout: tableLayout,
      },
      {
        text: `Generated: ${formatDateTime(new Date())} (Asia/Kathmandu)`,
        alignment: "right",
        margin: [0, 12, 0, 0],
        color: "#6B7280",
        italics: true,
        fontSize: 9,
      },
    ],
    footer: (currentPage: number, pageCount: number) => ({
      columns: [
        { text: "", width: "*" },
        {
          text: `Page ${currentPage} of ${pageCount}`,
          alignment: "right",
          margin: [0, 0, 24, 0],
          fontSize: 9,
          color: "#6B7280",
        },
      ],
    }),
    pageOrientation: manyColumns ? "landscape" : "portrait",
    pageMargins: manyColumns ? [24, 60, 24, 60] : [36, 60, 36, 60],
    defaultStyle: { font: "Roboto", fontSize: 9 },
  };

  const pdfDoc = printer.createPdfKitDocument(docDefinition);

  const fileName = `${fileBaseName}-${new Date()
    .toISOString()
    .slice(0, 10)}.pdf`;
  res.setHeader("Content-Type", "application/pdf");
  res.setHeader("Content-Disposition", `attachment; filename="${fileName}"`);

  pdfDoc.pipe(res);
  pdfDoc.end();
}
