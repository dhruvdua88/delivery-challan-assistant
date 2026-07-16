// ITC-04 preparation helper: an Excel worksheet of goods sent to job workers
// (Sec 143), an aid for filing FORM GST ITC-04 Table 4. Not the official JSON.
import type { JobWorkRow } from "./jobWork";
import { statusLabel } from "./jobWork";
import { isoToDdmmyyyy } from "../../exports/filenames";

const NAVY = "FF12304A";
const PALE = "FFEAF1F8";
const RED = "FFB42318";
const AMBER = "FFB76E00";

export async function buildItc04Workbook(rows: JobWorkRow[]): Promise<Blob> {
  const ExcelJS = (await import("exceljs")).default;
  const wb = new ExcelJS.Workbook();
  wb.creator = "Delivery Challan Assistant";
  const ws = wb.addWorksheet("ITC-04 helper", { pageSetup: { orientation: "landscape", fitToPage: true, fitToWidth: 1, fitToHeight: 0 } });

  ws.mergeCells("A1:K1");
  const title = ws.getCell("A1");
  title.value = "ITC-04 helper — goods sent to job worker (Sec 143, Rule 45). Not the official return JSON.";
  title.font = { italic: true, color: { argb: "FF5B6B7A" } };

  const headers = ["#", "Challan No.", "Challan Date", "Job Worker", "JW GSTIN", "Goods Type", "Items", "Value (INR)", "Return by (Sec 143)", "Expected Return", "Status"];
  const head = ws.addRow(headers);
  head.eachCell((cell) => {
    cell.font = { bold: true, color: { argb: "FFFFFFFF" } };
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: NAVY } };
    cell.alignment = { vertical: "middle", wrapText: true };
  });
  ws.columns = [{ width: 5 }, { width: 16 }, { width: 13 }, { width: 26 }, { width: 18 }, { width: 14 }, { width: 8 }, { width: 15 }, { width: 18 }, { width: 16 }, { width: 22 }];

  rows.forEach((r, i) => {
    const row = ws.addRow([
      i + 1,
      r.entry.number,
      isoToDdmmyyyy(r.entry.date) || "",
      r.entry.consigneeName,
      r.entry.consigneeGstin,
      r.entry.jobWorkGoodsType === "CAPITAL_GOODS" ? "Capital goods" : "Inputs",
      r.entry.itemCount,
      r.entry.value,
      isoToDdmmyyyy(r.deadline) || "",
      isoToDdmmyyyy(r.expectedReturn) || "",
      statusLabel(r.status),
    ]);
    row.getCell(8).numFmt = "#,##0.00";
    if (r.status === "OVERDUE") row.getCell(11).font = { color: { argb: RED }, bold: true };
    else if (r.status === "DUE_SOON") row.getCell(11).font = { color: { argb: AMBER }, bold: true };
  });

  const first = 3;
  const last = rows.length + 2;
  const total = ws.addRow(["", "", "", "", "", "", { formula: `SUM(G${first}:G${last})` } as any, { formula: `SUM(H${first}:H${last})` } as any, "", "", ""]);
  total.getCell(8).numFmt = "#,##0.00";
  [7, 8].forEach((col) => { total.getCell(col).font = { bold: true }; total.getCell(col).fill = { type: "pattern", pattern: "solid", fgColor: { argb: PALE } }; });

  ws.views = [{ state: "frozen", ySplit: 2 }];
  const buf = await wb.xlsx.writeBuffer();
  return new Blob([buf], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
}
