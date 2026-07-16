// Local-only persistence. Nothing leaves the browser.
import type { DeliveryChallan } from "../models/deliveryChallan";

const CO_KEY = "dca.company.v1";
const REGISTER_KEY = "dca.register.v1"; // used challan numbers (uniqueness)
const REGISTER_ENTRIES_KEY = "dca.register.entries.v1"; // rich issued-DC register
const DRAFT_KEY = "dca.draft.v1"; // opt-in autosave

export type RegisterEntry = {
  number: string;
  date: string; // challan date ISO
  movementType: string;
  billFromName: string;
  consigneeName: string;
  consigneeGstin: string;
  placeOfSupply: string;
  itemCount: number;
  value: number;
  ewbNumber: string;
  issuedAt: string; // ISO timestamp when exported
};

export type CompanyMaster = {
  legalName: string;
  gstinOrUrp: string;
  address: DeliveryChallan["billFrom"]["address"];
  // Aggregate Annual Turnover band — drives the HSN digit requirement
  // (Notification 78/2020-CT: > Rs 5 cr must report 6-digit HSN).
  aatoAbove5Cr?: boolean;
};

export function loadCompany(): CompanyMaster | null {
  try {
    const raw = localStorage.getItem(CO_KEY);
    return raw ? (JSON.parse(raw) as CompanyMaster) : null;
  } catch {
    return null;
  }
}

export function saveCompany(c: CompanyMaster): void {
  localStorage.setItem(CO_KEY, JSON.stringify(c));
}

export function clearCompany(): void {
  localStorage.removeItem(CO_KEY);
}

export function loadRegister(): string[] {
  try {
    const raw = localStorage.getItem(REGISTER_KEY);
    return raw ? (JSON.parse(raw) as string[]) : [];
  } catch {
    return [];
  }
}

export function addToRegister(challanNumber: string): void {
  const n = challanNumber.trim();
  if (!n) return;
  const reg = loadRegister();
  if (!reg.map((x) => x.toUpperCase()).includes(n.toUpperCase())) {
    reg.push(n);
    localStorage.setItem(REGISTER_KEY, JSON.stringify(reg));
  }
}

export function loadRegisterEntries(): RegisterEntry[] {
  try {
    const raw = localStorage.getItem(REGISTER_ENTRIES_KEY);
    return raw ? (JSON.parse(raw) as RegisterEntry[]) : [];
  } catch {
    return [];
  }
}

// Record (or refresh) a rich register entry for an issued challan. Keyed by
// challan number — re-exporting the same number updates its entry.
export function addRegisterEntry(entry: RegisterEntry): void {
  if (!entry.number.trim()) return;
  const entries = loadRegisterEntries();
  const idx = entries.findIndex((e) => e.number.toUpperCase() === entry.number.toUpperCase());
  if (idx >= 0) entries[idx] = entry;
  else entries.push(entry);
  localStorage.setItem(REGISTER_ENTRIES_KEY, JSON.stringify(entries));
}

export function deleteRegisterEntry(number: string): void {
  const entries = loadRegisterEntries().filter((e) => e.number.toUpperCase() !== number.toUpperCase());
  localStorage.setItem(REGISTER_ENTRIES_KEY, JSON.stringify(entries));
}

const AUTOSAVE_KEY = "dca.autosave.enabled.v1";

export function isAutosaveEnabled(): boolean {
  return localStorage.getItem(AUTOSAVE_KEY) === "1";
}

export function setAutosaveEnabled(on: boolean): void {
  if (on) localStorage.setItem(AUTOSAVE_KEY, "1");
  else { localStorage.removeItem(AUTOSAVE_KEY); clearDraft(); }
}

export function loadDraft(): DeliveryChallan | null {
  try {
    const raw = localStorage.getItem(DRAFT_KEY);
    return raw ? (JSON.parse(raw) as DeliveryChallan) : null;
  } catch {
    return null;
  }
}

export function saveDraft(c: DeliveryChallan): void {
  localStorage.setItem(DRAFT_KEY, JSON.stringify(c));
}

export function clearDraft(): void {
  localStorage.removeItem(DRAFT_KEY);
}

export function resetAll(): void {
  clearCompany();
  clearDraft();
  localStorage.removeItem(REGISTER_KEY);
  localStorage.removeItem(REGISTER_ENTRIES_KEY);
}
