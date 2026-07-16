// GSTIN format + checksum validation.
// GSTIN = 15 chars: 2 state code + 10 PAN + 1 entity + 'Z' + 1 checksum.
// Checksum: base-36 weighted mod-36 (GSTN standard algorithm).
import { isValidStateCode } from "./states";

const GSTIN_REGEX = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;
const ALPHABET = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ"; // base 36

export type GstinCheck = {
  ok: boolean;
  formatOk: boolean;
  checksumOk: boolean;
  stateCodeOk: boolean;
  stateCode: string;
  reason?: string;
};

export function computeGstinChecksum(first14: string): string {
  let factor = 2;
  let sum = 0;
  const mod = ALPHABET.length; // 36
  for (let i = first14.length - 1; i >= 0; i--) {
    const code = ALPHABET.indexOf(first14[i]);
    if (code < 0) return ""; // invalid char
    let digit = factor * code;
    factor = factor === 2 ? 1 : 2;
    digit = Math.floor(digit / mod) + (digit % mod);
    sum += digit;
  }
  const checkCodePoint = (mod - (sum % mod)) % mod;
  return ALPHABET[checkCodePoint];
}

export function checkGstin(raw: string): GstinCheck {
  const gstin = (raw || "").trim().toUpperCase();
  const stateCode = gstin.slice(0, 2);
  const formatOk = GSTIN_REGEX.test(gstin);
  if (!formatOk) {
    return {
      ok: false,
      formatOk: false,
      checksumOk: false,
      stateCodeOk: false,
      stateCode,
      reason: "GSTIN must be 15 characters in the format 22AAAAA0000A1Z5.",
    };
  }
  const stateCodeOk = isValidStateCode(stateCode);
  const expected = computeGstinChecksum(gstin.slice(0, 14));
  const checksumOk = expected !== "" && expected === gstin[14];
  return {
    ok: formatOk && checksumOk && stateCodeOk,
    formatOk,
    checksumOk,
    stateCodeOk,
    stateCode,
    reason: !stateCodeOk
      ? "GSTIN state code is not a recognised state."
      : !checksumOk
        ? "GSTIN checksum digit is invalid."
        : undefined,
  };
}

export function isUrp(raw: string): boolean {
  return (raw || "").trim().toUpperCase() === "URP";
}

// A consignee may legitimately be Unregistered Person (URP) for job work to an
// unregistered job worker. Accept either a valid GSTIN or the literal "URP".
export function checkGstinOrUrp(raw: string): GstinCheck {
  if (isUrp(raw)) {
    return { ok: true, formatOk: true, checksumOk: true, stateCodeOk: true, stateCode: "" };
  }
  return checkGstin(raw);
}
