// Portable Excel template: a clean, re-importable workbook (distinct from the
// formatted challan deliverable in exports/createExcel.ts). Two sheets —
// "Challan" (Field/Value) and "Items" (one row per line) — round-trip the whole
// DeliveryChallan so a saved template can be shared and re-imported with all
// items intact. Write with ExcelJS; read with SheetJS (tolerant of hand edits).
import type { DeliveryChallan, ChallanItem } from "../../models/deliveryChallan";
import { emptyChallan, newItem } from "../../models/deliveryChallan";

const CHALLAN_FIELDS: string[] = [
  "movementType",
  "receiverAndPurposeApproved",
  "exactPurpose",
  "approvalReference",
  "challanNumber",
  "challanDate",
  "copyType",
  "placeOfSupplyStateCode",
  "dispatchSameAsBillFrom",
  "shipToSameAsConsignee",
  "billFrom.legalName",
  "billFrom.gstinOrUrp",
  "billFrom.address.locationName",
  "billFrom.address.line1",
  "billFrom.address.line2",
  "billFrom.address.city",
  "billFrom.address.district",
  "billFrom.address.pinCode",
  "billFrom.address.stateName",
  "billFrom.address.stateCode",
  "dispatchFrom.locationName",
  "dispatchFrom.line1",
  "dispatchFrom.line2",
  "dispatchFrom.city",
  "dispatchFrom.district",
  "dispatchFrom.pinCode",
  "dispatchFrom.stateName",
  "dispatchFrom.stateCode",
  "consignee.legalName",
  "consignee.gstinOrUrp",
  "consignee.address.locationName",
  "consignee.address.line1",
  "consignee.address.line2",
  "consignee.address.city",
  "consignee.address.district",
  "consignee.address.pinCode",
  "consignee.address.stateName",
  "consignee.address.stateCode",
  "shipTo.locationName",
  "shipTo.line1",
  "shipTo.line2",
  "shipTo.city",
  "shipTo.district",
  "shipTo.pinCode",
  "shipTo.stateName",
  "shipTo.stateCode",
  "transport.mode",
  "transport.transporterName",
  "transport.transporterId",
  "transport.vehicleNumber",
  "transport.lrGrNumber",
  "transport.lrGrDate",
  "transport.approximateDistanceKm",
  "ewayBill.transactionType",
  "ewayBill.number",
  "ewayBill.generatedAt",
  "ewayBill.validUntil",
  "jobWork.goodsType",
  "jobWork.expectedReturnDate",
];

const ITEM_COLS = ["description", "modelOrItemCode", "hsn", "uqc", "quantity", "packages", "unitValue", "remarks"] as const;
const BOOL_FIELDS = new Set(["receiverAndPurposeApproved", "dispatchSameAsBillFrom", "shipToSameAsConsignee"]);
const NUMBER_ITEM_COLS = new Set(["quantity", "packages", "unitValue"]);

function getPath(obj: any, path: string): any {
  return path.split(".").reduce((o, k) => (o == null ? undefined : o[k]), obj);
}

function setPath(obj: any, path: string, value: any): void {
  const keys = path.split(".");
  let o = obj;
  for (let i = 0; i < keys.length - 1; i++) {
    if (o[keys[i]] == null || typeof o[keys[i]] !== "object") o[keys[i]] = {};
    o = o[keys[i]];
  }
  o[keys[keys.length - 1]] = value;
}

export async function buildTemplateWorkbook(c: DeliveryChallan): Promise<Blob> {
  const ExcelJS = (await import("exceljs")).default;
  const wb = new ExcelJS.Workbook();
  wb.creator = "Delivery Challan Assistant";

  const ws = wb.addWorksheet("Challan");
  ws.columns = [
    { header: "Field", key: "field", width: 34 },
    { header: "Value", key: "value", width: 48 },
  ];
  ws.getRow(1).font = { bold: true };
  ws.addRow({ field: "schemaVersion", value: 1 });
  CHALLAN_FIELDS.forEach((f) => {
    const v = getPath(c, f);
    ws.addRow({ field: f, value: v == null ? "" : v });
  });

  const items = wb.addWorksheet("Items");
  items.columns = ITEM_COLS.map((k) => ({ header: k, key: k, width: k === "description" ? 30 : 14 }));
  items.getRow(1).font = { bold: true };
  c.items.forEach((it) => {
    items.addRow(ITEM_COLS.reduce((row, k) => { (row as any)[k] = (it as any)[k] ?? ""; return row; }, {} as Record<string, unknown>));
  });

  const buf = await wb.xlsx.writeBuffer();
  return new Blob([buf], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
}

export async function parseTemplateWorkbook(file: File): Promise<DeliveryChallan> {
  // Independent — load the parser and read the file bytes concurrently.
  const [XLSX, buf] = await Promise.all([import("xlsx"), file.arrayBuffer()]);
  const wb = XLSX.read(buf, { type: "array" });

  const challanSheet = wb.Sheets["Challan"] ?? wb.Sheets[wb.SheetNames[0]];
  if (!challanSheet) throw new Error("No 'Challan' sheet found.");
  const kv = XLSX.utils.sheet_to_json<{ Field?: string; Value?: unknown; field?: string; value?: unknown }>(challanSheet);

  const c = emptyChallan();
  for (const row of kv) {
    const field = String(row.Field ?? row.field ?? "").trim();
    if (!field || field === "schemaVersion") continue;
    if (!CHALLAN_FIELDS.includes(field)) continue;
    let value: any = row.Value ?? row.value ?? "";
    if (BOOL_FIELDS.has(field)) value = value === true || String(value).toLowerCase() === "true";
    else if (field === "transport.approximateDistanceKm") value = value === "" || value == null ? undefined : Number(value);
    else value = value == null ? "" : String(value);
    setPath(c, field, value);
  }

  const itemsSheet = wb.Sheets["Items"];
  const items: ChallanItem[] = [];
  if (itemsSheet) {
    const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(itemsSheet);
    for (const r of rows) {
      const it = newItem();
      for (const k of ITEM_COLS) {
        const raw = r[k];
        if (raw == null || raw === "") continue;
        (it as any)[k] = NUMBER_ITEM_COLS.has(k) ? Number(raw) : String(raw);
      }
      if (it.description || it.hsn) items.push(it);
    }
  }
  c.items = items.length ? items : [newItem()];
  c.schemaVersion = 1;
  return c;
}
