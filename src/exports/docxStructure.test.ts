import { describe, it, expect } from "vitest";
import { unzipSync, strFromU8 } from "fflate";
import { createWord } from "./createWord";
import { emptyChallan, newItem, type DeliveryChallan } from "../models/deliveryChallan";
import { computeGstinChecksum } from "../gst/gstin";

const G_MH = "27ABCDE1234F1Z" + computeGstinChecksum("27ABCDE1234F1Z");
const G_UP = "09ABCDE1234F1Z" + computeGstinChecksum("09ABCDE1234F1Z");

function fixture(itemCount: number): DeliveryChallan {
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
  c.items = Array.from({ length: itemCount }, (_, i) => ({ ...newItem(), description: `Control unit line ${i + 1}`, hsn: "853710", uqc: "NOS", quantity: 5, unitValue: 1000, packages: 1 }));
  c.ewayBill = { transactionType: "REGULAR", number: "123456789012" };
  return c;
}

async function documentXml(c: DeliveryChallan, draft: boolean): Promise<string> {
  const blob = await createWord(c, { draft, companyName: "Example Manufacturing Private Limited" });
  const buf = new Uint8Array(await blob.arrayBuffer());
  const files = unzipSync(buf);
  expect(files["word/document.xml"]).toBeTruthy();
  return strFromU8(files["word/document.xml"]);
}

describe("docx structure", () => {
  it("is a valid OOXML package containing document.xml with all four item lines", async () => {
    const xml = await documentXml(fixture(4), false);
    for (let i = 1; i <= 4; i++) expect(xml).toContain(`Control unit line ${i}`);
    expect(xml).toContain("BILL FROM / CONSIGNOR");
    expect(xml).toContain("ACTUAL DISPATCH FROM");
    expect(xml).toContain("Section 143"); // job-work declaration
  });

  it("includes every row when more than six items are entered (controlled pagination)", async () => {
    const xml = await documentXml(fixture(9), false);
    for (let i = 1; i <= 9; i++) expect(xml).toContain(`Control unit line ${i}`);
  });

  it("stamps the DRAFT watermark when the e-way bill is pending", async () => {
    const c = fixture(4);
    c.ewayBill.number = "";
    const xml = await documentXml(c, true);
    expect(xml).toContain("NOT FOR DISPATCH");
  });
});
