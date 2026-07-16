import { describe, it, expect } from "vitest";
import { validateChallan } from "./validate";
import { emptyChallan, newItem, type DeliveryChallan } from "../../models/deliveryChallan";
import { computeGstinChecksum } from "../../gst/gstin";

// Synthetic GSTINs generated from the checksum algorithm — not real taxpayers.
const G_MH = "27ABCDE1234F1Z" + computeGstinChecksum("27ABCDE1234F1Z");
const G_UP = "09ABCDE1234F1Z" + computeGstinChecksum("09ABCDE1234F1Z");

function validChallan(): DeliveryChallan {
  const c = emptyChallan();
  c.movementType = "DIRECT_JOB_WORK";
  c.receiverAndPurposeApproved = true;
  c.exactPurpose = "Repair and refurbishment of faulty control units, to be returned.";
  c.approvalReference = "WO/2026/44";
  c.challanNumber = "DC/2026/001";
  c.challanDate = "2026-07-16";
  c.placeOfSupplyStateCode = "09";
  const mhAddr = { locationName: "Plant 1", line1: "Warehouse Road", line2: "", city: "Example City", district: "", pinCode: "431001", stateName: "Maharashtra", stateCode: "27" };
  const upAddr = { locationName: "Job Worker Unit", line1: "Industrial Area", line2: "", city: "Noida", district: "", pinCode: "201301", stateName: "Uttar Pradesh", stateCode: "09" };
  c.billFrom = { legalName: "Example Manufacturing Private Limited", gstinOrUrp: G_MH, address: mhAddr };
  c.dispatchFrom = { ...mhAddr };
  c.dispatchSameAsBillFrom = true;
  c.consignee = { legalName: "Example Job Worker LLP", gstinOrUrp: G_UP, address: upAddr };
  c.shipTo = { ...upAddr };
  c.shipToSameAsConsignee = true;
  c.items = [
    { ...newItem(), description: "Electronic control unit", hsn: "8537", uqc: "NOS", quantity: 10, unitValue: 5000, packages: 2 },
  ];
  c.ewayBill = { transactionType: "REGULAR", number: "123456789012" };
  c.transport = { mode: "Road", vehicleNumber: "MH12AB1234", lrGrNumber: "LR-1", approximateDistanceKm: 1300 };
  return c;
}

describe("validateChallan", () => {
  it("passes a complete valid direct job-work challan", () => {
    const r = validateChallan(validChallan(), []);
    expect(r.errors).toEqual([]);
    expect(r.canExportFinal).toBe(true);
  });

  it("blocks own-branch different-GSTIN transfer", () => {
    const c = validChallan();
    c.movementType = "OWN_BRANCH_DIFFERENT_GSTIN";
    const r = validateChallan(c, []);
    expect(r.errors.some((e) => /distinct persons/i.test(e.message))).toBe(true);
    expect(r.canExportFinal).toBe(false);
  });

  it("flags a duplicate challan number", () => {
    const r = validateChallan(validChallan(), ["DC/2026/001"]);
    expect(r.errors.some((e) => /already used/i.test(e.message))).toBe(true);
  });

  it("rejects a challan number over 16 chars", () => {
    const c = validChallan();
    c.challanNumber = "DC/2026/0001234567890";
    const r = validateChallan(c, []);
    expect(r.errors.some((e) => /16 characters/i.test(e.message))).toBe(true);
  });

  it("blocks unresolved markers", () => {
    const c = validChallan();
    c.items[0].hsn = "VERIFY";
    const r = validateChallan(c, []);
    expect(r.errors.some((e) => /HSN/i.test(e.message))).toBe(true);
  });

  it("flags GSTIN state-code mismatch", () => {
    const c = validChallan();
    c.billFrom.address.stateCode = "09"; // GSTIN says 27
    c.billFrom.address.stateName = "Uttar Pradesh";
    const r = validateChallan(c, []);
    expect(r.errors.some((e) => /does not match the selected state/i.test(e.message))).toBe(true);
  });

  it("warns when EWB is blank but still allows draft", () => {
    const c = validChallan();
    c.ewayBill.number = "";
    const r = validateChallan(c, []);
    expect(r.warnings.some((w) => /E-way bill number is blank/i.test(w.message))).toBe(true);
    expect(r.canExportDraft).toBe(true);
  });

  it("requires 12-digit EWB when entered", () => {
    const c = validChallan();
    c.ewayBill.number = "12345";
    const r = validateChallan(c, []);
    expect(r.errors.some((e) => /12 digits/i.test(e.message))).toBe(true);
  });

  it("warns when job-work return date exceeds the Section 143 limit", () => {
    const c = validChallan();
    c.jobWork = { goodsType: "INPUTS", expectedReturnDate: "2028-01-01" }; // >1yr from 2026-07-16
    const r = validateChallan(c, []);
    expect(r.warnings.some((w) => /Section 143 limit/i.test(w.message))).toBe(true);
  });

  it("passes when job-work return date is within the Section 143 limit", () => {
    const c = validChallan();
    c.jobWork = { goodsType: "INPUTS", expectedReturnDate: "2026-10-01" };
    const r = validateChallan(c, []);
    expect(r.passed.some((p) => /within the Section 143 limit/i.test(p.message))).toBe(true);
  });

  it("gives a 6-digit HSN advisory for a 4-digit HSN", () => {
    const c = validChallan();
    c.items[0].hsn = "8537";
    const r = validateChallan(c, []);
    expect(r.warnings.some((w) => /6-digit HSN/i.test(w.message))).toBe(true);
  });

  it("makes 4-digit HSN a blocking error when AATO is above Rs 5 crore", () => {
    const c = validChallan();
    c.items[0].hsn = "8537";
    const r = validateChallan(c, [], { aatoAbove5Cr: true });
    expect(r.errors.some((e) => /6-digit HSN/i.test(e.message))).toBe(true);
    expect(r.canExportFinal).toBe(false);
  });

  it("requires place of supply for interstate", () => {
    const c = validChallan();
    c.placeOfSupplyStateCode = "";
    const r = validateChallan(c, []);
    expect(r.errors.some((e) => /Place of supply/i.test(e.message))).toBe(true);
  });
});
