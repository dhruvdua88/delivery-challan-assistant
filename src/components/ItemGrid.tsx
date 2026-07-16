import type { ChallanItem } from "../models/deliveryChallan";
import { lineTotal, newItem, grandTotal, totalQuantity } from "../models/deliveryChallan";
import { UQC_MASTER } from "../gst/uqc";
import { inr } from "../exports/filenames";

type Props = {
  items: ChallanItem[];
  onChange: (items: ChallanItem[]) => void;
};

export function ItemGrid({ items, onChange }: Props) {
  const update = (id: string, patch: Partial<ChallanItem>) =>
    onChange(items.map((it) => (it.id === id ? { ...it, ...patch } : it)));
  const add = () => onChange([...items, newItem()]);
  const dup = (id: string) => {
    const src = items.find((i) => i.id === id);
    if (src) onChange([...items, { ...src, ...newItem(), description: src.description, hsn: src.hsn, uqc: src.uqc, unitValue: src.unitValue, quantity: src.quantity, modelOrItemCode: src.modelOrItemCode }]);
  };
  const del = (id: string) => onChange(items.length > 1 ? items.filter((i) => i.id !== id) : items);
  const move = (idx: number, dir: -1 | 1) => {
    const j = idx + dir;
    if (j < 0 || j >= items.length) return;
    const copy = [...items];
    [copy[idx], copy[j]] = [copy[j], copy[idx]];
    onChange(copy);
  };
  const numeric = (v: string) => (v === "" ? 0 : Math.max(0, Number(v.replace(/[^0-9.]/g, ""))));

  return (
    <div>
      <div style={{ overflowX: "auto" }}>
        <table className="items">
          <thead>
            <tr>
              <th style={{ width: 30 }}>#</th>
              <th>Description</th>
              <th style={{ width: 110 }}>Model / Code</th>
              <th style={{ width: 90 }}>HSN</th>
              <th style={{ width: 90 }}>UQC</th>
              <th style={{ width: 70 }}>Qty</th>
              <th style={{ width: 70 }}>Pkgs</th>
              <th style={{ width: 100 }}>Unit Value</th>
              <th style={{ width: 110 }}>Total</th>
              <th style={{ width: 110 }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {items.map((it, i) => (
              <tr key={it.id}>
                <td style={{ textAlign: "center" }}>{i + 1}</td>
                <td><input aria-label={`Item ${i + 1} description`} value={it.description} onChange={(e) => update(it.id, { description: e.target.value })} placeholder="e.g. Electronic control unit" /></td>
                <td><input aria-label={`Item ${i + 1} model`} value={it.modelOrItemCode || ""} onChange={(e) => update(it.id, { modelOrItemCode: e.target.value })} /></td>
                <td><input aria-label={`Item ${i + 1} HSN`} value={it.hsn} inputMode="numeric" maxLength={8} onChange={(e) => update(it.id, { hsn: e.target.value.replace(/\D/g, "").slice(0, 8) })} placeholder="8471" /></td>
                <td>
                  <select aria-label={`Item ${i + 1} UQC`} value={it.uqc} onChange={(e) => update(it.id, { uqc: e.target.value })} style={{ width: "100%", border: "none", background: "transparent" }}>
                    {UQC_MASTER.map((u) => <option key={u.code} value={u.code}>{u.code}</option>)}
                  </select>
                </td>
                <td className="num"><input aria-label={`Item ${i + 1} quantity`} value={it.quantity} inputMode="decimal" onChange={(e) => update(it.id, { quantity: numeric(e.target.value) })} /></td>
                <td className="num"><input aria-label={`Item ${i + 1} packages`} value={it.packages ?? ""} inputMode="numeric" onChange={(e) => update(it.id, { packages: e.target.value === "" ? undefined : numeric(e.target.value) })} /></td>
                <td className="num"><input aria-label={`Item ${i + 1} unit value`} value={it.unitValue} inputMode="decimal" onChange={(e) => update(it.id, { unitValue: numeric(e.target.value) })} /></td>
                <td className="num" style={{ fontWeight: 600 }}>{inr(lineTotal(it))}</td>
                <td>
                  <div className="itembtns">
                    <button type="button" className="secondary" title="Move up" onClick={() => move(i, -1)}>↑</button>
                    <button type="button" className="secondary" title="Move down" onClick={() => move(i, 1)}>↓</button>
                    <button type="button" className="secondary" title="Duplicate" onClick={() => dup(it.id)}>⧉</button>
                    <button type="button" className="danger" title="Delete" onClick={() => del(it.id)}>✕</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="total-strip">
        <span>Total qty: {totalQuantity(items)}</span>
        <span>Grand total: INR {inr(grandTotal(items))}</span>
      </div>
      <button type="button" className="teal" style={{ marginTop: 10 }} onClick={add}>+ Add item</button>
    </div>
  );
}
