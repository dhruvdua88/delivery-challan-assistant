import { describe, it, expect } from "vitest";
import { buildJobWorkRows, statutoryDeadline } from "./jobWork";
import type { RegisterEntry } from "../../storage/localStorage";

function entry(over: Partial<RegisterEntry>): RegisterEntry {
  return {
    number: "DC/1", date: "2026-01-01", movementType: "DIRECT_JOB_WORK",
    billFromName: "A", consigneeName: "JW", consigneeGstin: "URP", placeOfSupply: "09",
    itemCount: 1, value: 1000, ewbNumber: "", issuedAt: "2026-01-01T00:00:00Z",
    jobWorkGoodsType: "INPUTS", ...over,
  };
}

describe("job-work Sec 143 tracking", () => {
  it("deadline is +1 year for inputs, +3 years for capital goods", () => {
    expect(statutoryDeadline(entry({ date: "2026-01-01", jobWorkGoodsType: "INPUTS" }))).toBe("2027-01-01");
    expect(statutoryDeadline(entry({ date: "2026-01-01", jobWorkGoodsType: "CAPITAL_GOODS" }))).toBe("2029-01-01");
  });

  it("flags overdue when the statutory deadline has passed", () => {
    const rows = buildJobWorkRows([entry({ date: "2024-01-01" })], "2026-07-17");
    expect(rows).toHaveLength(1);
    expect(rows[0].status).toBe("OVERDUE");
  });

  it("flags due-soon within 30 days, on-track beyond", () => {
    const soon = buildJobWorkRows([entry({ date: "2025-07-25" })], "2026-07-17"); // deadline 2026-07-25
    expect(soon[0].status).toBe("DUE_SOON");
    const ok = buildJobWorkRows([entry({ date: "2026-06-01" })], "2026-07-17"); // deadline 2027-06-01
    expect(ok[0].status).toBe("ON_TRACK");
  });

  it("excludes non-job-work entries", () => {
    const rows = buildJobWorkRows([entry({ movementType: "OTHER_APPROVED_NON_SUPPLY" })], "2026-07-17");
    expect(rows).toHaveLength(0);
  });
});
