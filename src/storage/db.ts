// Local template store (IndexedDB via Dexie). Templates are saved delivery
// challans a user can reload later. Nothing leaves the browser.
import Dexie, { type Table } from "dexie";
import type { DeliveryChallan } from "../models/deliveryChallan";

export type ChallanTemplate = {
  id?: number;
  name: string;
  savedAt: string; // ISO
  challan: DeliveryChallan;
};

class DcaDatabase extends Dexie {
  templates!: Table<ChallanTemplate, number>;
  constructor() {
    super("delivery-challan-assistant");
    this.version(1).stores({ templates: "++id, name, savedAt" });
  }
}

export const db = new DcaDatabase();

export async function saveTemplate(name: string, challan: DeliveryChallan, isoNow: string): Promise<number> {
  const existing = await db.templates.where("name").equals(name).first();
  if (existing?.id != null) {
    await db.templates.update(existing.id, { challan, savedAt: isoNow });
    return existing.id;
  }
  return db.templates.add({ name, savedAt: isoNow, challan });
}

export async function deleteTemplate(id: number): Promise<void> {
  await db.templates.delete(id);
}
