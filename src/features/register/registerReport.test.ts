import { describe, it, expect } from "vitest";
import ExcelJS from "exceljs";
import { buildRegisterWorkbook } from "./registerReport";
import type { RegisterEntry } from "../../storage/localStorage";

const entries: RegisterEntry[] = [
  { number: "DC/2026/001", date: "2026-07-16", movementType: "DIRECT_JOB_WORK", billFromName: "Example Mfg Pvt Ltd", consigneeName: "Example Job Worker LLP", consigneeGstin: "09ABCDE1234F1Z5", placeOfSupply: "09", itemCount: 4, value: 100000, ewbNumber: "123456789012", issuedAt: "2026-07-16T10:00:00.000Z" },
  { number: "DC/2026/002", date: "2026-07-17", movementType: "OTHER_APPROVED_NON_SUPPLY", billFromName: "Example Mfg Pvt Ltd", consigneeName: "Repair Co", consigneeGstin: "URP", placeOfSupply: "27", itemCount: 2, value: 50000, ewbNumber: "", issuedAt: "2026-07-17T10:00:00.000Z" },
];

describe("register report", () => {
  it("builds a DC Register workbook with a row per entry and a SUM total", async () => {
    const blob = await buildRegisterWorkbook(entries);
    const wb = new ExcelJS.Workbook();
    await wb.xlsx.load(await blob.arrayBuffer() as unknown as ArrayBuffer);
    const ws = wb.getWorksheet("DC Register")!;
    expect(ws).toBeTruthy();
    // header + 2 data rows + total = 4 rows
    expect(ws.rowCount).toBe(4);
    expect(ws.getCell("B2").value).toBe("DC/2026/001");
    expect(ws.getCell("B3").value).toBe("DC/2026/002");
    // total value formula present
    const totalCell = ws.getCell("J4").value as { formula?: string };
    expect(totalCell.formula).toMatch(/SUM\(J2:J3\)/i);
  });
});
