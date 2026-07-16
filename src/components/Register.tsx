import { useMemo, useState } from "react";
import { loadRegisterEntries, deleteRegisterEntry, type RegisterEntry } from "../storage/localStorage";
import { MOVEMENT_BY_ID } from "../gst/movementRules";
import { buildRegisterWorkbook } from "../features/register/registerReport";
import { isoToDdmmyyyy, inr } from "../exports/filenames";

function download(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = name;
  document.body.appendChild(a); a.click();
  a.remove(); URL.revokeObjectURL(url);
}

export function Register({ onClose }: { onClose: () => void }) {
  const [entries, setEntries] = useState<RegisterEntry[]>(() => loadRegisterEntries());
  const [busy, setBusy] = useState(false);
  const refresh = () => setEntries(loadRegisterEntries());

  const totals = useMemo(() => ({
    count: entries.length,
    value: entries.reduce((s, e) => s + (e.value || 0), 0),
    pendingEwb: entries.filter((e) => !e.ewbNumber).length,
  }), [entries]);

  const exportXlsx = async () => {
    setBusy(true);
    try { download(await buildRegisterWorkbook(entries), `DC_Register_${new Date().toISOString().slice(0, 10)}.xlsx`); }
    finally { setBusy(false); }
  };

  return (
    <div className="card" style={{ borderColor: "var(--teal)" }}>
      <h2>Challan register</h2>
      <p className="hint">
        Every challan you export is logged here (locally, keyed by DC number). A running delivery-challan
        register you can export to Excel as an MIS.
      </p>
      <div className="total-strip" style={{ flexWrap: "wrap" }}>
        <span>{totals.count} issued</span>
        <span>Total value: INR {inr(totals.value)}</span>
        <span style={{ color: totals.pendingEwb ? "var(--red)" : "var(--green)" }}>{totals.pendingEwb} pending EWB</span>
      </div>
      <div className="export-row">
        <button type="button" className="teal" disabled={busy || !entries.length} onClick={exportXlsx}>{busy ? "Working…" : "Export register to Excel"}</button>
        <button type="button" className="secondary" onClick={refresh}>Refresh</button>
        <button type="button" className="ghost" onClick={onClose}>Close</button>
      </div>

      {!entries.length && <p className="hint">No challans issued yet. Export a challan from the Review step and it appears here.</p>}
      {!!entries.length && (
        <div style={{ overflowX: "auto", marginTop: 10 }}>
          <table className="items">
            <thead>
              <tr>
                <th>DC No.</th><th>Date</th><th>Movement</th><th>Consignee</th>
                <th style={{ textAlign: "right" }}>Items</th><th style={{ textAlign: "right" }}>Value</th><th>EWB</th><th></th>
              </tr>
            </thead>
            <tbody>
              {entries.map((e) => (
                <tr key={e.number}>
                  <td>{e.number}</td>
                  <td>{isoToDdmmyyyy(e.date) || "-"}</td>
                  <td>{MOVEMENT_BY_ID[e.movementType as keyof typeof MOVEMENT_BY_ID]?.label ?? e.movementType}</td>
                  <td>{e.consigneeName || "-"}</td>
                  <td style={{ textAlign: "right" }}>{e.itemCount}</td>
                  <td style={{ textAlign: "right" }}>{inr(e.value)}</td>
                  <td style={{ color: e.ewbNumber ? undefined : "var(--red)", fontWeight: e.ewbNumber ? undefined : 700 }}>{e.ewbNumber || "PENDING"}</td>
                  <td><button type="button" className="danger" style={{ padding: "3px 8px", fontSize: 11 }} onClick={() => { if (confirm(`Remove ${e.number} from the register?`)) { deleteRegisterEntry(e.number); refresh(); } }}>✕</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
