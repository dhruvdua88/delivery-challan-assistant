// Movement classification and the decision rules that gate document generation.
// Legal basis notes are attached for the review screen; verify against current
// law before release (see references in README).

export type MovementType =
  | "DIRECT_JOB_WORK"
  | "OWN_BRANCH_DIFFERENT_GSTIN"
  | "OTHER_APPROVED_NON_SUPPLY";

export type MovementMeta = {
  id: MovementType;
  label: string;
  helper: string;
  // Whether a zero-tax delivery challan is the correct instrument.
  challanAllowed: boolean;
  legalBasis: string;
};

export const MOVEMENTS: MovementMeta[] = [
  {
    id: "DIRECT_JOB_WORK",
    label: "Direct job work",
    helper:
      "Goods sent to a job worker for processing and return, without transfer of ownership.",
    challanAllowed: true,
    legalBasis:
      "Section 143 read with Rule 45 (goods sent for job work) and Rule 55 (delivery challan for non-supply movement). Return / ITC-04 tracking applies.",
  },
  {
    id: "OWN_BRANCH_DIFFERENT_GSTIN",
    label: "Own branch transfer — different GSTIN",
    helper:
      "Stock move to another GST registration of the same entity (distinct person).",
    challanAllowed: false,
    legalBasis:
      "Schedule I para 2: supply between distinct persons (separate registrations) in the course of business is a supply even without consideration. A tax invoice under Section 31 is generally required, not a zero-tax delivery challan.",
  },
  {
    id: "OTHER_APPROVED_NON_SUPPLY",
    label: "Other genuine non-supply movement",
    helper:
      "Movement not amounting to supply, backed by written GST approval and an exact stated purpose.",
    challanAllowed: true,
    legalBasis:
      "Rule 55(1)(c): delivery challan permitted for transport of goods for reasons other than by way of supply. Requires a documented, non-contradictory purpose.",
  },
];

export const MOVEMENT_BY_ID: Record<MovementType, MovementMeta> = Object.fromEntries(
  MOVEMENTS.map((m) => [m.id, m])
) as Record<MovementType, MovementMeta>;

// Whether delivery-challan export is permitted for this movement.
export function isChallanExportAllowed(m: MovementType): boolean {
  return MOVEMENT_BY_ID[m]?.challanAllowed ?? false;
}

// Dynamic legal declaration printed on the challan.
export function declarationFor(m: MovementType): string {
  switch (m) {
    case "DIRECT_JOB_WORK":
      return (
        "NOT FOR SALE. Goods sent for job work under Section 143 read with Rules 45 and 55. " +
        "Value is shown only for GST, e-way bill and insurance declaration. " +
        "Goods are to be processed and returned under the approved job-work control."
      );
    case "OTHER_APPROVED_NON_SUPPLY":
      return (
        "NOT FOR SALE. Goods moved for the exact approved non-supply purpose. " +
        "Value is shown only for GST, e-way bill and insurance declaration."
      );
    case "OWN_BRANCH_DIFFERENT_GSTIN":
    default:
      return ""; // no delivery-challan declaration for a distinct-person supply
  }
}
