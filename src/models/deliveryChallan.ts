import type { MovementType } from "../gst/movementRules";
import type { EwbTransactionType } from "../gst/ewayRules";

export type Address = {
  locationName: string;
  line1: string;
  line2?: string;
  city: string;
  district?: string;
  pinCode: string;
  stateName: string;
  stateCode: string;
};

export type Party = {
  legalName: string;
  gstinOrUrp: string;
  address: Address;
};

export type ChallanItem = {
  id: string;
  description: string;
  modelOrItemCode?: string;
  hsn: string;
  uqc: string;
  quantity: number;
  packages?: number;
  unitValue: number;
  remarks?: string;
};

export type Transport = {
  mode: string;
  transporterName?: string;
  transporterId?: string;
  vehicleNumber?: string;
  lrGrNumber?: string;
  lrGrDate?: string;
  approximateDistanceKm?: number;
};

export type EwayBill = {
  transactionType: EwbTransactionType;
  number?: string;
  generatedAt?: string;
  validUntil?: string;
};

export type CopyType =
  | "Original for Consignee"
  | "Duplicate for Transporter"
  | "Triplicate for Consignor"
  | "Office Copy";

export type DeliveryChallan = {
  schemaVersion: 1;
  movementType: MovementType;
  receiverAndPurposeApproved: boolean;
  exactPurpose: string;
  approvalReference?: string;

  challanNumber: string;
  challanDate: string; // ISO yyyy-mm-dd internally; display/export as dd/mm/yyyy
  copyType: CopyType;
  placeOfSupplyStateCode: string;

  billFrom: Party;
  dispatchFrom: Address;
  dispatchSameAsBillFrom: boolean;
  consignee: Party;
  shipTo: Address;
  shipToSameAsConsignee: boolean;

  items: ChallanItem[];

  transport: Transport;
  ewayBill: EwayBill;

  // Job-work return control (Section 143). Optional but drives deemed-supply warnings.
  jobWork?: JobWorkControl;
};

export type JobWorkGoodsType = "INPUTS" | "CAPITAL_GOODS";

export type JobWorkControl = {
  goodsType: JobWorkGoodsType;
  expectedReturnDate?: string; // ISO
};

// Section 143: inputs must return within 1 year, capital goods within 3 years,
// else the movement is deemed a supply on the day the goods were sent out.
export const JOB_WORK_RETURN_LIMIT_MONTHS: Record<JobWorkGoodsType, number> = {
  INPUTS: 12,
  CAPITAL_GOODS: 36,
};

export const COPY_TYPES: CopyType[] = [
  "Original for Consignee",
  "Duplicate for Transporter",
  "Triplicate for Consignor",
  "Office Copy",
];

export const TRANSPORT_MODES = ["Road", "Rail", "Air", "Ship"] as const;

export function emptyAddress(): Address {
  return {
    locationName: "",
    line1: "",
    line2: "",
    city: "",
    district: "",
    pinCode: "",
    stateName: "",
    stateCode: "",
  };
}

export function emptyParty(): Party {
  return { legalName: "", gstinOrUrp: "", address: emptyAddress() };
}

let itemSeq = 0;
export function newItem(): ChallanItem {
  itemSeq += 1;
  return {
    id: `itm_${itemSeq}_${Math.floor(performance.now())}`,
    description: "",
    modelOrItemCode: "",
    hsn: "",
    uqc: "NOS",
    quantity: 1,
    packages: undefined,
    unitValue: 0,
    remarks: "",
  };
}

export function emptyChallan(): DeliveryChallan {
  return {
    schemaVersion: 1,
    movementType: "DIRECT_JOB_WORK",
    receiverAndPurposeApproved: false,
    exactPurpose: "",
    approvalReference: "",
    challanNumber: "",
    challanDate: "",
    copyType: "Original for Consignee",
    placeOfSupplyStateCode: "",
    billFrom: emptyParty(),
    dispatchFrom: emptyAddress(),
    dispatchSameAsBillFrom: true,
    consignee: emptyParty(),
    shipTo: emptyAddress(),
    shipToSameAsConsignee: true,
    items: [newItem()],
    transport: { mode: "Road" },
    ewayBill: { transactionType: "REGULAR" },
    jobWork: { goodsType: "INPUTS" },
  };
}

// Add `months` to an ISO date, return ISO yyyy-mm-dd.
export function addMonthsIso(iso: string, months: number): string {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "";
  d.setMonth(d.getMonth() + months);
  return d.toISOString().slice(0, 10);
}

// ---- derived helpers ----
export function lineTotal(it: ChallanItem): number {
  const q = Number(it.quantity) || 0;
  const v = Number(it.unitValue) || 0;
  return Math.round(q * v * 100) / 100;
}

export function grandTotal(items: ChallanItem[]): number {
  return Math.round(items.reduce((s, it) => s + lineTotal(it), 0) * 100) / 100;
}

export function totalQuantity(items: ChallanItem[]): number {
  return items.reduce((s, it) => s + (Number(it.quantity) || 0), 0);
}

export function totalPackages(items: ChallanItem[]): number {
  return items.reduce((s, it) => s + (Number(it.packages) || 0), 0);
}

export function isInterstate(c: DeliveryChallan): boolean {
  const from = c.dispatchFrom.stateCode || c.billFrom.address.stateCode;
  const to = c.shipToSameAsConsignee
    ? c.consignee.address.stateCode
    : c.shipTo.stateCode;
  return !!from && !!to && from !== to;
}
