// Local-only persistence. Nothing leaves the browser.
import type { DeliveryChallan } from "../models/deliveryChallan";

const CO_KEY = "dca.company.v1";
const REGISTER_KEY = "dca.register.v1"; // used challan numbers
const DRAFT_KEY = "dca.draft.v1"; // opt-in autosave

export type CompanyMaster = {
  legalName: string;
  gstinOrUrp: string;
  address: DeliveryChallan["billFrom"]["address"];
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
}
