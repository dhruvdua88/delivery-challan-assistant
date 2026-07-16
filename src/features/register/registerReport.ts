// Excel export of the issued-challan register (a running DC register / MIS).
import type { RegisterEntry } from "../../storage/localStorage";
import { MOVEMENT_BY_ID } from "../../gst/movementRules";
import { stateNameForCode } from "../../gst/states";
import { isoToDdmmyyyy } from "../../exports/filenames";

const NAVY = "FF12304A";
const PALE = "FFEAF1F8";

export async function buildRegisterWorkbook(entries: RegisterEntry[]): Promise<Blob> {
  const ExcelJS = (await import("exceljs")).default;
  const wb = new ExcelJS.Workbook();
  wb.creator = "Delivery Challan Assistant";
  const ws = wb.addWorksheet("DC Register", {
    pageSetup: { orientation: "landscape", fitToPage: true, fitToWidth: 1, fitToHeight: 0 },
  });

  const headers = ["#", "DC No.", "Date", "Movement", "Bill From", "Consignee", "Consignee GSTIN", "Place of Supply", "Items", "Value (INR)", "EWB No.", "Issued"];
  ws.columns = [
    { width: 5 }, { width: 16 }, { width: 12 }, { width: 26 }, { width: 28 }, { width: 28 },
    { width: 18 }, { width: 20 }, { width: 8 }, { width: 15 }, { width: 15 }, { width: 20 },
  ];
  const head = ws.addRow(headers);
  head.eachCell((cell) => {
    cell.font = { bold: true, color: { argb: "FFFFFFFF" } };
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: NAVY } };
    cell.alignment = { vertical: "middle", wrapText: true };
  });

  entries.forEach((e, i) => {
    const row = ws.addRow([
      i + 1,
      e.number,
      isoToDdmmyyyy(e.date) || "",
      MOVEMENT_BY_ID[e.movementType as keyof typeof MOVEMENT_BY_ID]?.label ?? e.movementType,
      e.billFromName,
      e.consigneeName,
      e.consigneeGstin,
      `${stateNameForCode(e.placeOfSupply) || ""}${e.placeOfSupply ? ` (${e.placeOfSupply})` : ""}`,
      e.itemCount,
      e.value,
      e.ewbNumber || "PENDING",
      e.issuedAt ? isoToDdmmyyyy(e.issuedAt.slice(0, 10)) : "",
    ]);
    row.getCell(10).numFmt = "#,##0.00";
    if (!e.ewbNumber) row.getCell(11).font = { color: { argb: "FFB42318" }, bold: true };
  });

  const firstData = 2;
  const lastData = entries.length + 1;
  const totalRow = ws.addRow(["", "", "", "", "", "", "", "TOTAL", { formula: `SUM(I${firstData}:I${lastData})` } as any, { formula: `SUM(J${firstData}:J${lastData})` } as any, "", ""]);
  totalRow.getCell(8).font = { bold: true };
  totalRow.getCell(10).numFmt = "#,##0.00";
  [9, 10].forEach((col) => {
    totalRow.getCell(col).font = { bold: true };
    totalRow.getCell(col).fill = { type: "pattern", pattern: "solid", fgColor: { argb: PALE } };
  });

  ws.views = [{ state: "frozen", ySplit: 1 }];
  const buf = await wb.xlsx.writeBuffer();
  return new Blob([buf], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
}
