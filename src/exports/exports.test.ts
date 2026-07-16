import { describe, it, expect } from "vitest";
import ExcelJS from "exceljs";
import { createWord } from "./createWord";
import { createExcel } from "./createExcel";
import { emptyChallan, newItem, type DeliveryChallan } from "../models/deliveryChallan";
import { computeGstinChecksum } from "../gst/gstin";

const G_MH = "27ABCDE1234F1Z" + computeGstinChecksum("27ABCDE1234F1Z");
const G_UP = "09ABCDE1234F1Z" + computeGstinChecksum("09ABCDE1234F1Z");

function fixture(): DeliveryChallan {
  const c = emptyChallan();
  c.movementType = "DIRECT_JOB_WORK";
  c.receiverAndPurposeApproved = true;
  c.exactPurpose = "Refurbishment, to be returned.";
  c.challanNumber = "DC/2026/001";
  c.challanDate = "2026-07-16";
  c.placeOfSupplyStateCode = "09";
  const mh = { locationName: "Plant", line1: "Road", city: "City", pinCode: "431001", stateName: "Maharashtra", stateCode: "27", line2: "", district: "" };
  const up = { locationName: "Unit", line1: "Area", city: "Noida", pinCode: "201301", stateName: "Uttar Pradesh", stateCode: "09", line2: "", district: "" };
  c.billFrom = { legalName: "Example Manufacturing Private Limited", gstinOrUrp: G_MH, address: mh };
  c.dispatchFrom = { ...mh };
  c.consignee = { legalName: "Example Job Worker LLP", gstinOrUrp: G_UP, address: up };
  c.shipTo = { ...up };
  c.items = [1, 2, 3, 4].map((i) => ({ ...newItem(), description: `Electronic control unit ${i}`, hsn: "8537", uqc: "NOS", quantity: 5, unitValue: 74190, packages: 1 }));
  c.ewayBill = { transactionType: "REGULAR", number: "123456789012" };
  return c;
}

async function bytes(b: Blob): Promise<Uint8Array> {
  return new Uint8Array(await b.arrayBuffer());
}

describe("word export", () => {
  it("produces a non-empty .docx (ZIP) blob", async () => {
    const blob = await createWord(fixture(), { draft: false, companyName: "Example Manufacturing Private Limited" });
    const buf = await bytes(blob);
    expect(buf.length).toBeGreaterThan(1000);
    // ZIP magic PK\x03\x04
    expect(buf[0]).toBe(0x50);
    expect(buf[1]).toBe(0x4b);
  });
});

describe("excel export", () => {
  it("produces exactly the three intended sheets with a working grand-total formula", async () => {
    const blob = await createExcel(fixture(), { draft: false });
    const buf = await bytes(blob);
    const wb = new ExcelJS.Workbook();
    await wb.xlsx.load(buf as unknown as ArrayBuffer);
    const names = wb.worksheets.map((w) => w.name);
    expect(names).toEqual(["Delivery Challan", "EWB Guide", "Dispatch Checklist"]);
    // a total formula cell should exist on the challan sheet
    const ws = wb.getWorksheet("Delivery Challan")!;
    let foundSumFormula = false;
    ws.eachRow((row) => {
      row.eachCell((cell) => {
        if (cell.formula && /SUM\(/i.test(cell.formula)) foundSumFormula = true;
      });
    });
    expect(foundSumFormula).toBe(true);
  });
});
