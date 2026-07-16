import { describe, it, expect } from "vitest";
import { checkGstin, checkGstinOrUrp, computeGstinChecksum, isUrp } from "./gstin";

// Build a synthetic, valid-format GSTIN by computing its own checksum.
// This is NOT a real taxpayer — it is generated from the algorithm for testing.
function synthGstin(first14: string): string {
  return first14 + computeGstinChecksum(first14);
}

describe("gstin checksum", () => {
  it("accepts an algorithm-consistent synthetic GSTIN", () => {
    const g = synthGstin("27ABCDE1234F1Z"); // Maharashtra
    const chk = checkGstin(g);
    expect(chk.formatOk).toBe(true);
    expect(chk.checksumOk).toBe(true);
    expect(chk.stateCodeOk).toBe(true);
    expect(chk.ok).toBe(true);
  });

  it("rejects a wrong checksum digit", () => {
    const g = synthGstin("09ABCDE1234F1Z");
    const wrong = g.slice(0, 14) + (g[14] === "0" ? "1" : "0");
    expect(checkGstin(wrong).checksumOk).toBe(false);
    expect(checkGstin(wrong).ok).toBe(false);
  });

  it("rejects bad format", () => {
    expect(checkGstin("27ABCDE1234F1Z").ok).toBe(false); // 14 chars
    expect(checkGstin("ABCDEFGHIJKLMNO").ok).toBe(false);
    expect(checkGstin("").ok).toBe(false);
  });

  it("rejects an unknown state code", () => {
    const g = synthGstin("50ABCDE1234F1Z"); // 50 is not a state
    const chk = checkGstin(g);
    expect(chk.stateCodeOk).toBe(false);
    expect(chk.ok).toBe(false);
  });

  it("treats URP as valid for consignee", () => {
    expect(isUrp("URP")).toBe(true);
    expect(checkGstinOrUrp("URP").ok).toBe(true);
  });
});
