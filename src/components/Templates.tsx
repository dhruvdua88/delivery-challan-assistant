import { useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { useAutoAnimate } from "@formkit/auto-animate/react";
import type { DeliveryChallan } from "../models/deliveryChallan";
import { db, saveTemplate, deleteTemplate, type ChallanTemplate } from "../storage/db";
import { buildTemplateWorkbook, parseTemplateWorkbook } from "../features/templates/templateWorkbook";
import { isoToDdmmyyyy, inr } from "../exports/filenames";
import { grandTotal } from "../models/deliveryChallan";

function download(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = name;
  document.body.appendChild(a); a.click();
  a.remove(); URL.revokeObjectURL(url);
}

function safeName(s: string) {
  return (s || "template").replace(/[^A-Za-z0-9_\- ]+/g, "_").slice(0, 40).trim() || "template";
}

export function Templates({ current, onLoad, onClose }: {
  current: DeliveryChallan;
  onLoad: (c: DeliveryChallan) => void;
  onClose: () => void;
}) {
  const templates = useLiveQuery(() => db.templates.orderBy("savedAt").reverse().toArray(), []);
  const [listRef] = useAutoAnimate<HTMLUListElement>();
  const [busy, setBusy] = useState(false);

  const save = async () => {
    const suggested = current.challanNumber ? `Template ${current.challanNumber}` : "New template";
    const name = prompt("Save current challan as a template. Name:", suggested);
    if (!name?.trim()) return;
    await saveTemplate(name.trim(), current, new Date().toISOString());
  };

  const exportXlsx = async (t: ChallanTemplate) => {
    setBusy(true);
    try {
      const blob = await buildTemplateWorkbook(t.challan);
      download(blob, `${safeName(t.name)}.xlsx`);
    } finally { setBusy(false); }
  };

  const exportCurrentXlsx = async () => {
    setBusy(true);
    try {
      const blob = await buildTemplateWorkbook(current);
      download(blob, `${safeName(current.challanNumber || "challan-template")}.xlsx`);
    } finally { setBusy(false); }
  };

  const importXlsx = async (file: File) => {
    setBusy(true);
    try {
      const c = await parseTemplateWorkbook(file);
      onLoad(c);
      onClose();
    } catch (e) {
      alert(`Could not read that Excel template: ${(e as Error).message}`);
    } finally { setBusy(false); }
  };

  return (
    <div className="card" style={{ borderColor: "var(--teal)" }}>
      <h2>Templates</h2>
      <p className="hint">
        Save the current challan as a reusable template (stored only in this browser), or export it as an Excel
        template you can share and re-import later with all items intact.
      </p>
      <div className="export-row">
        <button type="button" onClick={save}>Save current as template</button>
        <button type="button" className="teal" disabled={busy} onClick={exportCurrentXlsx}>{busy ? "Working…" : "Export current to Excel"}</button>
        <label className="secondary" style={{ padding: "9px 16px", borderRadius: 6, cursor: "pointer", border: "1px solid var(--border)" }}>
          Import from Excel
          <input type="file" accept=".xlsx,.xls" style={{ display: "none" }} onChange={(e) => e.target.files?.[0] && importXlsx(e.target.files[0])} />
        </label>
        <button type="button" className="ghost" onClick={onClose}>Close</button>
      </div>

      <div className="section-h">Saved templates {templates ? `(${templates.length})` : ""}</div>
      {templates && templates.length === 0 && <p className="hint">No templates saved yet. Fill a challan, then "Save current as template".</p>}
      <ul className="template-list" ref={listRef}>
        {templates?.map((t) => (
          <li key={t.id} className="template-row">
            <div className="template-meta">
              <strong>{t.name}</strong>
              <span className="cite">
                {t.challan.items.length} item(s) · INR {inr(grandTotal(t.challan.items))}
                {t.challan.challanDate ? ` · ${isoToDdmmyyyy(t.challan.challanDate)}` : ""}
              </span>
            </div>
            <div className="template-actions">
              <button type="button" className="teal" onClick={() => { onLoad(t.challan); onClose(); }}>Load</button>
              <button type="button" className="secondary" disabled={busy} onClick={() => exportXlsx(t)}>Excel</button>
              <button type="button" className="danger" onClick={() => { if (confirm(`Delete template "${t.name}"?`)) deleteTemplate(t.id!); }}>Delete</button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
