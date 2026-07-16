// E-way bill rule configuration. Kept in ONE place with effective dates and
// sources so thresholds are auditable and testable. Re-check against current
// law before every release. The app never submits an e-way bill.

export type EwbTransactionType = "REGULAR" | "BILL_FROM_DISPATCH_FROM" | "OTHER";

// EWB threshold config. Consignment value threshold for a regular e-way bill.
// Rule 138(1): generally Rs 50,000. Job-work interstate movement requires an
// e-way bill irrespective of value (Rule 138(1) first proviso).
export const EWB_RULES = {
  effectiveDateNote: "As per CGST Rule 138 as in force on the effective date below.",
  effectiveDate: "2018-04-01",
  source: "https://docs.ewaybillgst.gov.in/html/faq.html",
  generalThresholdInr: 50000,
  // Interstate job-work movement: EWB required regardless of value.
  jobWorkInterstateAlwaysRequired: true,
  // 12-digit e-way bill number.
  ewbNumberDigits: 12,
} as const;

// Derive the correct EWB transaction type from Bill-From vs Dispatch-From.
// When the physical dispatch location differs from the billing (supplier)
// address, NIC requires the "Bill From - Dispatch From" transaction type.
export function inferEwbTransactionType(sameAddress: boolean): EwbTransactionType {
  return sameAddress ? "REGULAR" : "BILL_FROM_DISPATCH_FROM";
}

// Is an e-way bill required for this movement?
export function isEwbRequired(opts: {
  interstate: boolean;
  isJobWork: boolean;
  consignmentValueInr: number;
}): { required: boolean; reason: string } {
  if (opts.isJobWork && opts.interstate && EWB_RULES.jobWorkInterstateAlwaysRequired) {
    return {
      required: true,
      reason:
        "Interstate movement of goods for job work requires an e-way bill regardless of consignment value (Rule 138(1) first proviso).",
    };
  }
  if (opts.consignmentValueInr > EWB_RULES.generalThresholdInr) {
    return {
      required: true,
      reason: `Consignment value exceeds the Rs ${EWB_RULES.generalThresholdInr.toLocaleString(
        "en-IN"
      )} threshold (Rule 138(1)).`,
    };
  }
  return {
    required: false,
    reason:
      "Below the general threshold and not a mandatory-EWB category — confirm against current state rules and exemptions.",
  };
}

const EWB_NUMBER_REGEX = new RegExp(`^[0-9]{${EWB_RULES.ewbNumberDigits}}$`);

export function isValidEwbNumber(raw: string): boolean {
  return EWB_NUMBER_REGEX.test((raw || "").trim());
}
