import { describe, it, expect } from "vitest";
import { isChallanExportAllowed, declarationFor } from "./movementRules";
import { inferEwbTransactionType, isEwbRequired, isValidEwbNumber } from "./ewayRules";
import { isValidUqc } from "./uqc";
import { isoToDdmmyyyy } from "../exports/filenames";

describe("movement rules", () => {
  it("blocks own-branch different-GSTIN from challan export", () => {
    expect(isChallanExportAllowed("OWN_BRANCH_DIFFERENT_GSTIN")).toBe(false);
    expect(isChallanExportAllowed("DIRECT_JOB_WORK")).toBe(true);
    expect(isChallanExportAllowed("OTHER_APPROVED_NON_SUPPLY")).toBe(true);
  });

  it("emits the right declaration per movement", () => {
    expect(declarationFor("DIRECT_JOB_WORK")).toMatch(/Section 143/);
    expect(declarationFor("OTHER_APPROVED_NON_SUPPLY")).toMatch(/approved non-supply/);
    expect(declarationFor("OWN_BRANCH_DIFFERENT_GSTIN")).toBe("");
  });
});

describe("eway rules", () => {
  it("infers transaction type from dispatch-vs-bill", () => {
    expect(inferEwbTransactionType(true)).toBe("REGULAR");
    expect(inferEwbTransactionType(false)).toBe("BILL_FROM_DISPATCH_FROM");
  });

  it("requires EWB for interstate job work regardless of value", () => {
    const r = isEwbRequired({ interstate: true, isJobWork: true, consignmentValueInr: 100 });
    expect(r.required).toBe(true);
  });

  it("requires EWB above the general threshold", () => {
    expect(isEwbRequired({ interstate: false, isJobWork: false, consignmentValueInr: 60000 }).required).toBe(true);
    expect(isEwbRequired({ interstate: false, isJobWork: false, consignmentValueInr: 40000 }).required).toBe(false);
  });

  it("validates 12-digit EWB numbers", () => {
    expect(isValidEwbNumber("123456789012")).toBe(true);
    expect(isValidEwbNumber("12345")).toBe(false);
    expect(isValidEwbNumber("1234567890123")).toBe(false);
  });
});

describe("uqc + dates", () => {
  it("validates UQC codes", () => {
    expect(isValidUqc("NOS")).toBe(true);
    expect(isValidUqc("nos")).toBe(true);
    expect(isValidUqc("XYZ")).toBe(false);
  });
  it("formats dates as dd/mm/yyyy", () => {
    expect(isoToDdmmyyyy("2026-07-16")).toBe("16/07/2026");
  });
});
