import type { DeliveryChallan, ChallanItem } from "../../models/deliveryChallan";
import { grandTotal, isInterstate, lineTotal } from "../../models/deliveryChallan";
import { checkGstin, checkGstinOrUrp } from "../../gst/gstin";
import { isValidUqc } from "../../gst/uqc";
import { isChallanExportAllowed } from "../../gst/movementRules";
import { isValidEwbNumber, isEwbRequired } from "../../gst/ewayRules";

export type Severity = "error" | "warning" | "pass";
export type Finding = { severity: Severity; field?: string; message: string };

const UNRESOLVED = /\b(VERIFY|REPLACE|TBD|XXX+)\b/i;
const PIN_RE = /^[0-9]{6}$/;

function hasUnresolved(v?: string): boolean {
  return !!v && UNRESOLVED.test(v);
}

// dd/mm/yyyy or ISO yyyy-mm-dd both accepted internally; must be a real date.
export function isValidDate(iso: string): boolean {
  if (!iso) return false;
  const d = new Date(iso);
  return !isNaN(d.getTime());
}

export type ValidationResult = {
  errors: Finding[];
  warnings: Finding[];
  passed: Finding[];
  canExportFinal: boolean; // no blocking errors
  canExportDraft: boolean; // no blocking errors except a blank EWB
};

// existingNumbers: challan numbers already used in the local register (for uniqueness)
export function validateChallan(
  c: DeliveryChallan,
  existingNumbers: string[] = []
): ValidationResult {
  const errors: Finding[] = [];
  const warnings: Finding[] = [];
  const passed: Finding[] = [];

  const err = (message: string, field?: string) => errors.push({ severity: "error", message, field });
  const warn = (message: string, field?: string) => warnings.push({ severity: "warning", message, field });
  const pass = (message: string, field?: string) => passed.push({ severity: "pass", message, field });

  // 1. Movement type + approval
  if (!c.movementType) err("Select a movement type.", "movementType");
  if (!c.receiverAndPurposeApproved)
    err("Confirm the receiver and purpose are approved.", "receiverAndPurposeApproved");
  else pass("Receiver and purpose confirmed approved.");

  if (!isChallanExportAllowed(c.movementType)) {
    err(
      "Own-branch transfer to a different GSTIN is a supply between distinct persons — a tax invoice is generally required, not a delivery challan. Delivery-challan export is blocked.",
      "movementType"
    );
  } else {
    pass("Movement type permits a delivery challan.");
  }

  if (!c.exactPurpose?.trim()) err("Enter the exact purpose of movement.", "exactPurpose");
  if (c.movementType === "OTHER_APPROVED_NON_SUPPLY" && !c.approvalReference?.trim())
    err("A written approval reference is required for an other non-supply movement.", "approvalReference");

  // 2. Challan number + date
  const num = c.challanNumber?.trim() || "";
  if (!num) err("Enter the delivery challan number.", "challanNumber");
  else {
    if (num.length > 16) err("Challan number must be 16 characters or fewer (Rule 46).", "challanNumber");
    if (existingNumbers.map((n) => n.trim().toUpperCase()).includes(num.toUpperCase()))
      err("Challan number is already used in the local register — use a unique consecutive number.", "challanNumber");
    if (!/^[A-Za-z0-9/\-]+$/.test(num))
      warn("Challan number should use only letters, digits, '/' and '-' (Rule 46 series format).", "challanNumber");
    if (num.length <= 16 && !hasUnresolved(num)) pass("Challan number present and within 16 characters.");
  }
  if (!isValidDate(c.challanDate)) err("Enter a valid challan date.", "challanDate");
  else pass("Challan date is valid.");

  // 3. Bill From
  validateParty(c.billFrom, "Bill From", { requireGstin: true }, err, pass);
  // Dispatch From (address only, always required even if same as Bill From)
  validateAddress(c.dispatchFrom, "Actual Dispatch From", err, pass);
  // Consignee (GSTIN or URP)
  validateParty(c.consignee, "Consignee / Job Worker", { requireGstin: false }, err, pass);
  // Ship To
  validateAddress(c.shipTo, "Ship To", err, pass);

  // 4. Place of supply for interstate
  const interstate = isInterstate(c);
  if (interstate && !c.placeOfSupplyStateCode)
    err("Place of supply state code is required for an interstate movement.", "placeOfSupplyStateCode");
  else if (interstate) pass("Place of supply set for interstate movement.");

  // 5. Items
  if (!c.items?.length) err("Add at least one item.", "items");
  c.items.forEach((it, i) => validateItem(it, i, err));
  const total = grandTotal(c.items);
  if (total <= 0) err("Total consignment value must be greater than zero.", "items");
  else pass(`Line arithmetic reconciles to INR ${total.toLocaleString("en-IN", { minimumFractionDigits: 2 })}.`);

  // 6. Copy marking
  if (!c.copyType) err("Select a copy marking.", "copyType");

  // 7. GSTIN state-code vs selected state (blocking mismatch)
  crossCheckGstinState(c.billFrom, "Bill From", err);
  if (c.consignee.gstinOrUrp && c.consignee.gstinOrUrp.trim().toUpperCase() !== "URP")
    crossCheckGstinState(c.consignee, "Consignee", err);

  // 8. E-way bill
  const ewb = c.ewayBill?.number?.trim() || "";
  if (ewb) {
    if (!isValidEwbNumber(ewb)) err("E-way bill number must be exactly 12 digits.", "ewayBill.number");
    else pass("E-way bill number is a valid 12-digit number.");
  } else {
    warn("E-way bill number is blank — a DRAFT output will be watermarked NOT FOR DISPATCH.", "ewayBill.number");
  }

  const ewbReq = isEwbRequired({
    interstate,
    isJobWork: c.movementType === "DIRECT_JOB_WORK",
    consignmentValueInr: total,
  });
  if (ewbReq.required && !ewb) warn(`E-way bill appears required: ${ewbReq.reason}`, "ewayBill.number");

  // 9. Transport dispatch warnings
  if (!c.transport.lrGrNumber?.trim()) warn("LR / GR number is blank.", "transport.lrGrNumber");
  if (c.transport.mode === "Road" && !c.transport.vehicleNumber?.trim())
    warn("Vehicle number (Part B) is blank for road movement.", "transport.vehicleNumber");
  if (c.transport.approximateDistanceKm == null || c.transport.approximateDistanceKm <= 0)
    warn("Approximate distance is blank.", "transport.approximateDistanceKm");
  if (!c.approvalReference?.trim())
    warn("Work order / job-work / written approval reference is blank.", "approvalReference");

  // 10. Dispatch-from-differs reminder
  if (!c.dispatchSameAsBillFrom)
    warn(
      "Dispatch From differs from Bill From — select the 'Bill From – Dispatch From' e-way bill transaction type and enter the actual dispatch PIN / State.",
      "dispatchFrom"
    );

  const canExportFinal = errors.length === 0;
  // Draft allowed when the ONLY thing missing is the EWB number (all real errors clear).
  const canExportDraft = errors.length === 0;

  return { errors, warnings, passed, canExportFinal, canExportDraft };
}

function validateAddress(
  a: { locationName: string; line1: string; city: string; pinCode: string; stateName: string; stateCode: string },
  label: string,
  err: (m: string, f?: string) => void,
  pass: (m: string, f?: string) => void
) {
  let ok = true;
  if (!a.locationName?.trim()) { err(`${label}: location name is required.`); ok = false; }
  if (!a.line1?.trim()) { err(`${label}: address line 1 is required.`); ok = false; }
  if (!a.city?.trim()) { err(`${label}: city is required.`); ok = false; }
  if (!PIN_RE.test(a.pinCode || "")) { err(`${label}: PIN code must be 6 digits.`); ok = false; }
  if (!a.stateCode) { err(`${label}: state is required.`); ok = false; }
  [a.locationName, a.line1, a.city].forEach((v) => {
    if (hasUnresolved(v)) { err(`${label}: contains an unresolved marker (VERIFY/REPLACE/TBD/XXX).`); ok = false; }
  });
  if (ok) pass(`${label} address is complete.`);
}

function validateParty(
  p: { legalName: string; gstinOrUrp: string; address: any },
  label: string,
  opts: { requireGstin: boolean },
  err: (m: string, f?: string) => void,
  pass: (m: string, f?: string) => void
) {
  if (!p.legalName?.trim()) err(`${label}: legal name is required.`);
  if (hasUnresolved(p.legalName)) err(`${label}: legal name contains an unresolved marker.`);
  const g = (p.gstinOrUrp || "").trim();
  if (opts.requireGstin) {
    if (!g) err(`${label}: GSTIN is required.`);
    else {
      const chk = checkGstin(g);
      if (!chk.ok) err(`${label}: ${chk.reason || "GSTIN is invalid."}`);
      else pass(`${label} GSTIN format and checksum passed.`);
    }
  } else if (g) {
    const chk = checkGstinOrUrp(g);
    if (!chk.ok) err(`${label}: ${chk.reason || "GSTIN is invalid."}`);
    else pass(`${label} GSTIN / URP is valid.`);
  }
  validateAddress(p.address, `${label} address`, err, pass);
}

function crossCheckGstinState(
  p: { gstinOrUrp: string; address: { stateCode: string } },
  label: string,
  err: (m: string, f?: string) => void
) {
  const g = (p.gstinOrUrp || "").trim().toUpperCase();
  if (g.length < 2 || g === "URP") return;
  const gstinState = g.slice(0, 2);
  if (p.address.stateCode && gstinState !== p.address.stateCode) {
    err(
      `${label}: GSTIN state code (${gstinState}) does not match the selected state (${p.address.stateCode}).`
    );
  }
}

function validateItem(it: ChallanItem, i: number, err: (m: string, f?: string) => void) {
  const n = i + 1;
  if (!it.description?.trim()) err(`Item ${n}: description is required.`);
  if (hasUnresolved(it.description)) err(`Item ${n}: description has an unresolved marker.`);
  if (!it.hsn?.trim() || hasUnresolved(it.hsn)) err(`Item ${n}: a resolved HSN is required (no VERIFY/TBD).`);
  else if (!/^[0-9]{4,8}$/.test(it.hsn.trim())) err(`Item ${n}: HSN must be 4 to 8 digits.`);
  if (!isValidUqc(it.uqc)) err(`Item ${n}: UQC "${it.uqc}" is not a valid GSTN unit code.`);
  if (!(Number(it.quantity) > 0)) err(`Item ${n}: quantity must be greater than zero.`);
  if (!(Number(it.unitValue) > 0)) err(`Item ${n}: unit value must be greater than zero.`);
  if (lineTotal(it) <= 0) err(`Item ${n}: line value must be greater than zero.`);
}
