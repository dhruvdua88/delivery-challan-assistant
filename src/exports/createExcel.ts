import ExcelJS from "exceljs";
import type { DeliveryChallan } from "../models/deliveryChallan";
import { declarationFor, MOVEMENT_BY_ID } from "../gst/movementRules";
import { PALETTE, DRAFT_WATERMARK, FOOTER_LINE } from "./templates";
import { isoToDdmmyyyy } from "./filenames";
import { stateNameForCode } from "../gst/states";

const navy = { argb: "FF" + PALETTE.navy };
const teal = { argb: "FF" + PALETTE.teal };
const pale = { argb: "FF" + PALETTE.paleBlue };
const red = { argb: "FF" + PALETTE.red };
const white = { argb: "FFFFFFFF" };

function border(ws: ExcelJS.Worksheet, range: string) {
  const thin: Partial<ExcelJS.Borders> = {
    top: { style: "thin", color: { argb: "FF9AB0C4" } },
    left: { style: "thin", color: { argb: "FF9AB0C4" } },
    bottom: { style: "thin", color: { argb: "FF9AB0C4" } },
    right: { style: "thin", color: { argb: "FF9AB0C4" } },
  };
  const [start, end] = range.split(":");
  const s = ws.getCell(start);
  const e = ws.getCell(end);
  for (let r = Number(s.row); r <= Number(e.row); r++) {
    for (let col = Number((s as any).col); col <= Number((e as any).col); col++) {
      ws.getCell(r, col).border = thin;
    }
  }
}

function addr(a: {
  locationName: string; line1: string; line2?: string; city: string; district?: string; pinCode: string; stateName: string; stateCode: string;
}): string {
  return [
    a.locationName,
    a.line1,
    a.line2,
    [a.city, a.district].filter(Boolean).join(", "),
    `${stateNameForCode(a.stateCode) || a.stateName || ""}${a.stateCode ? ` (${a.stateCode})` : ""}`,
    a.pinCode ? `PIN ${a.pinCode}` : "",
  ].filter(Boolean).join("\n");
}

export async function createExcel(
  c: DeliveryChallan,
  opts: { draft: boolean; companyName?: string }
): Promise<Blob> {
  const wb = new ExcelJS.Workbook();
  wb.creator = "Delivery Challan Assistant";

  buildChallanSheet(wb, c, opts);
  buildEwbGuideSheet(wb);
  buildChecklistSheet(wb);

  const buf = await wb.xlsx.writeBuffer();
  return new Blob([buf], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
}

function buildChallanSheet(wb: ExcelJS.Workbook, c: DeliveryChallan, opts: { draft: boolean; companyName?: string }) {
  const ws = wb.addWorksheet("Delivery Challan", {
    pageSetup: { orientation: "landscape", paperSize: 9, fitToPage: true, fitToWidth: 1, fitToHeight: 0, margins: { left: 0.3, right: 0.3, top: 0.4, bottom: 0.4, header: 0.2, footer: 0.2 } },
  });
  ws.columns = [
    { width: 5 }, { width: 26 }, { width: 12 }, { width: 8 }, { width: 8 }, { width: 8 }, { width: 14 }, { width: 14 },
  ];

  const move = MOVEMENT_BY_ID[c.movementType];
  let r = 1;

  ws.mergeCells(`A${r}:H${r}`);
  const title = ws.getCell(`A${r}`);
  title.value = (opts.companyName || "DELIVERY CHALLAN").toUpperCase();
  title.font = { bold: true, size: 16, color: white };
  title.alignment = { horizontal: "center", vertical: "middle" };
  title.fill = { type: "pattern", pattern: "solid", fgColor: navy };
  ws.getRow(r).height = 26;
  r++;

  ws.mergeCells(`A${r}:H${r}`);
  const sub = ws.getCell(`A${r}`);
  sub.value = "DELIVERY CHALLAN (Rule 55 — not a tax invoice)";
  sub.font = { bold: true, size: 10, color: white };
  sub.alignment = { horizontal: "center" };
  sub.fill = { type: "pattern", pattern: "solid", fgColor: teal };
  r++;

  if (opts.draft) {
    ws.mergeCells(`A${r}:H${r}`);
    const w = ws.getCell(`A${r}`);
    w.value = DRAFT_WATERMARK;
    w.font = { bold: true, size: 11, color: white };
    w.alignment = { horizontal: "center" };
    w.fill = { type: "pattern", pattern: "solid", fgColor: red };
    ws.getRow(r).height = 20;
    r++;
  }
  r++;

  const meta: [string, string][] = [
    ["DC Number", c.challanNumber || "-"],
    ["Date", isoToDdmmyyyy(c.challanDate) || "-"],
    ["Copy", c.copyType],
    ["Movement", move?.label || c.movementType],
    ["Place of Supply", `${stateNameForCode(c.placeOfSupplyStateCode) || "-"}${c.placeOfSupplyStateCode ? ` (${c.placeOfSupplyStateCode})` : ""}`],
    ["Approval Ref", c.approvalReference || "-"],
  ];
  meta.forEach(([k, v], i) => {
    const col = i % 2 === 0 ? 1 : 5;
    const row = r + Math.floor(i / 2);
    const kc = ws.getCell(row, col);
    kc.value = k; kc.font = { bold: true }; kc.fill = { type: "pattern", pattern: "solid", fgColor: pale };
    ws.mergeCells(row, col + 1, row, col + 3);
    ws.getCell(row, col + 1).value = v;
  });
  r += Math.ceil(meta.length / 2) + 1;

  // Parties
  const partyRow = r;
  ws.mergeCells(`A${partyRow}:D${partyRow}`);
  ws.mergeCells(`E${partyRow}:H${partyRow}`);
  hdr(ws, `A${partyRow}`, "BILL FROM / CONSIGNOR");
  hdr(ws, `E${partyRow}`, "CONSIGNEE / JOB WORKER");
  r++;
  ws.mergeCells(`A${r}:D${r + 4}`);
  ws.mergeCells(`E${r}:H${r + 4}`);
  const bf = ws.getCell(`A${r}`);
  bf.value = `${c.billFrom.legalName}\nGSTIN: ${c.billFrom.gstinOrUrp}\n${addr(c.billFrom.address)}`;
  bf.alignment = { wrapText: true, vertical: "top" };
  const cn = ws.getCell(`E${r}`);
  cn.value = `${c.consignee.legalName}\nGSTIN: ${c.consignee.gstinOrUrp}\n${addr(c.consignee.address)}`;
  cn.alignment = { wrapText: true, vertical: "top" };
  r += 5;

  // Dispatch From (full width)
  ws.mergeCells(`A${r}:H${r}`);
  hdr(ws, `A${r}`, "ACTUAL DISPATCH FROM");
  r++;
  ws.mergeCells(`A${r}:H${r + 1}`);
  const df = ws.getCell(`A${r}`);
  df.value = addr(c.dispatchFrom);
  df.alignment = { wrapText: true, vertical: "top" };
  r += 2;

  if (!c.shipToSameAsConsignee) {
    ws.mergeCells(`A${r}:H${r}`);
    hdr(ws, `A${r}`, "SHIP TO / DELIVERY ADDRESS");
    r++;
    ws.mergeCells(`A${r}:H${r + 1}`);
    const st = ws.getCell(`A${r}`);
    st.value = addr(c.shipTo);
    st.alignment = { wrapText: true, vertical: "top" };
    r += 2;
  }

  // Transport
  const t = c.transport, e = c.ewayBill;
  const transport: [string, string][] = [
    ["Mode", t.mode || "-"], ["Transporter", t.transporterName || "-"],
    ["Vehicle", t.vehicleNumber || "-"], ["Distance (km)", t.approximateDistanceKm ? String(t.approximateDistanceKm) : "-"],
    ["LR/GR No.", t.lrGrNumber || "-"], ["EWB No.", e.number || (opts.draft ? "PENDING" : "-")],
    ["EWB Txn Type", e.transactionType], ["EWB Valid Until", e.validUntil ? isoToDdmmyyyy(e.validUntil) : "-"],
  ];
  transport.forEach(([k, v], i) => {
    const col = i % 2 === 0 ? 1 : 5;
    const row = r + Math.floor(i / 2);
    const kc = ws.getCell(row, col);
    kc.value = k; kc.font = { bold: true }; kc.fill = { type: "pattern", pattern: "solid", fgColor: pale };
    ws.mergeCells(row, col + 1, row, col + 3);
    ws.getCell(row, col + 1).value = v;
  });
  r += transport.length / 2 + 1;

  // Item table with formulas
  const headRow = r;
  ["#", "Description / Model", "HSN", "UQC", "Qty", "Pkgs", "Unit Value", "Total Value"].forEach((h, i) => {
    const cell = ws.getCell(headRow, i + 1);
    cell.value = h;
    cell.font = { bold: true, color: white };
    cell.fill = { type: "pattern", pattern: "solid", fgColor: navy };
    cell.alignment = { horizontal: "center", vertical: "middle", wrapText: true };
  });
  r++;
  const firstItemRow = r;
  c.items.forEach((it, i) => {
    const row = ws.getRow(r);
    row.getCell(1).value = i + 1;
    row.getCell(2).value = [it.description, it.modelOrItemCode].filter(Boolean).join(" — ");
    row.getCell(3).value = it.hsn;
    row.getCell(4).value = it.uqc;
    row.getCell(5).value = Number(it.quantity) || 0;
    row.getCell(6).value = it.packages != null ? Number(it.packages) : null;
    row.getCell(7).value = Number(it.unitValue) || 0;
    row.getCell(7).numFmt = "#,##0.00";
    row.getCell(8).value = { formula: `E${r}*G${r}` };
    row.getCell(8).numFmt = "#,##0.00";
    row.alignment = { vertical: "middle" };
    r++;
  });
  const lastItemRow = r - 1;
  // Totals row
  const totRow = ws.getRow(r);
  ws.mergeCells(r, 1, r, 4);
  totRow.getCell(1).value = "TOTAL";
  totRow.getCell(1).font = { bold: true };
  totRow.getCell(1).alignment = { horizontal: "right" };
  totRow.getCell(1).fill = { type: "pattern", pattern: "solid", fgColor: pale };
  totRow.getCell(5).value = { formula: `SUM(E${firstItemRow}:E${lastItemRow})` };
  totRow.getCell(6).value = { formula: `SUM(F${firstItemRow}:F${lastItemRow})` };
  totRow.getCell(8).value = { formula: `SUM(H${firstItemRow}:H${lastItemRow})` };
  totRow.getCell(8).numFmt = "#,##0.00";
  [5, 6, 8].forEach((col) => {
    totRow.getCell(col).font = { bold: true };
    totRow.getCell(col).fill = { type: "pattern", pattern: "solid", fgColor: pale };
  });
  border(ws, `A${headRow}:H${r}`);
  r += 2;

  // Declaration
  const decl = declarationFor(c.movementType);
  if (decl) {
    ws.mergeCells(`A${r}:H${r + 1}`);
    const d = ws.getCell(`A${r}`);
    d.value = decl;
    d.font = { bold: true, color: navy, size: 9 };
    d.alignment = { wrapText: true, vertical: "top" };
    r += 2;
  }
  ws.mergeCells(`A${r}:H${r}`);
  ws.getCell(`A${r}`).value = `Exact purpose: ${c.exactPurpose || "-"}`;
  r += 2;

  ws.getCell(`A${r}`).value = "Prepared by";
  ws.getCell(`F${r}`).value = "Authorised Signatory";
  r += 2;
  ws.mergeCells(`A${r}:H${r}`);
  const foot = ws.getCell(`A${r}`);
  foot.value = FOOTER_LINE;
  foot.font = { color: teal, size: 9 };

  ws.views = [{ state: "frozen", ySplit: headRow - 1 }];
  ws.pageSetup.printArea = `A1:H${r}`;
}

function hdr(ws: ExcelJS.Worksheet, addr: string, text: string) {
  const c = ws.getCell(addr);
  c.value = text;
  c.font = { bold: true, color: white };
  c.fill = { type: "pattern", pattern: "solid", fgColor: teal };
  c.alignment = { horizontal: "left", vertical: "middle" };
}

function buildEwbGuideSheet(wb: ExcelJS.Workbook) {
  const ws = wb.addWorksheet("EWB Guide");
  ws.columns = [{ width: 6 }, { width: 100 }];
  ws.mergeCells("A1:B1");
  const t = ws.getCell("A1");
  t.value = "E-WAY BILL — STEP BY STEP";
  t.font = { bold: true, size: 13, color: white };
  t.fill = { type: "pattern", pattern: "solid", fgColor: navy };
  t.alignment = { horizontal: "center" };
  const steps = [
    "Approve the movement type and the supporting document before you start.",
    "Log in to the e-way bill portal and choose 'Generate New' (Outward).",
    "Choose the correct sub-type (Job Work / Others / etc.) matching the movement.",
    "Enter the exact document type (Delivery Challan), number and date.",
    "Complete Bill From, Actual Dispatch From and To / Ship To. If the physical origin differs from the supplier's billing address, use the 'Bill From – Dispatch From' transaction type and enter the actual dispatch PIN and State.",
    "Enter item, HSN, UQC, quantity and value details for every line.",
    "Complete transporter, LR / GR, vehicle, approximate distance and Part B.",
    "Preview, generate, save the EWB PDF and record the 12-digit number and validity.",
  ];
  steps.forEach((s, i) => {
    const row = ws.getRow(i + 3);
    row.getCell(1).value = i + 1;
    row.getCell(1).font = { bold: true, color: teal };
    row.getCell(2).value = s;
    row.getCell(2).alignment = { wrapText: true, vertical: "top" };
    row.height = 30;
  });
}

function buildChecklistSheet(wb: ExcelJS.Workbook) {
  const ws = wb.addWorksheet("Dispatch Checklist");
  ws.columns = [{ width: 6 }, { width: 90 }, { width: 10 }];
  ws.mergeCells("A1:C1");
  const t = ws.getCell("A1");
  t.value = "PRE-DISPATCH CONTROL CHECKLIST";
  t.font = { bold: true, size: 13, color: white };
  t.fill = { type: "pattern", pattern: "solid", fgColor: navy };
  t.alignment = { horizontal: "center" };
  ws.getCell("A2").value = "#"; ws.getCell("B2").value = "Control"; ws.getCell("C2").value = "Done?";
  ["A2", "B2", "C2"].forEach((a) => { ws.getCell(a).font = { bold: true, color: white }; ws.getCell(a).fill = { type: "pattern", pattern: "solid", fgColor: teal }; });
  const controls = [
    "Bill From and Actual Dispatch From separately verified.",
    "Actual consignee / Ship To verified.",
    "Unique challan number and date recorded in the register.",
    "Exact purpose and supporting approval on file.",
    "Description, HSN, UQC, quantity, packages and value complete.",
    "E-way bill generated and Part B complete before gate exit.",
    "Controlled copies printed and authorised signature obtained.",
    "Work order / LR / EWB PDF / packing support attached together.",
    "Job-work return tracking / applicable ITC-04 control set up.",
    "Gate register, stock ledger, DC register, EWB and return receipt reconciled.",
  ];
  controls.forEach((s, i) => {
    const row = ws.getRow(i + 3);
    row.getCell(1).value = i + 1;
    row.getCell(2).value = s;
    row.getCell(2).alignment = { wrapText: true, vertical: "top" };
    row.getCell(3).value = "☐";
    row.getCell(3).alignment = { horizontal: "center" };
    row.height = 26;
  });
}
