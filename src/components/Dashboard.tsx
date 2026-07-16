import ReactECharts from "echarts-for-react";
import { useLiveQuery } from "dexie-react-hooks";
import { db, type ChallanTemplate } from "../storage/db";
import { loadRegisterEntries } from "../storage/localStorage";
import { MOVEMENT_BY_ID } from "../gst/movementRules";
import { inr } from "../exports/filenames";

const NO_TEMPLATES: ChallanTemplate[] = [];

const NAVY = "#12304A";
const TEAL = "#087F8C";
const BLUE = "#2563EB";
const GREEN = "#147A4B";
const RED = "#B42318";
const AMBER = "#B76E00";
const PALETTE = [TEAL, BLUE, NAVY, AMBER, GREEN, "#7A4B00"];

function movementLabel(id: string): string {
  return MOVEMENT_BY_ID[id as keyof typeof MOVEMENT_BY_ID]?.label ?? id;
}

const baseGrid = { left: 8, right: 16, top: 30, bottom: 8, containLabel: true };
const noAnim = { animationDuration: 300 };

export function Dashboard({ onClose }: { onClose: () => void }) {
  // Read-once snapshots; this panel is opened on demand, so the small
  // aggregations run inline rather than through memo hooks.
  const entries = loadRegisterEntries();
  const templates = useLiveQuery(() => db.templates.toArray(), []) ?? NO_TEMPLATES;

  const movementMap = new Map<string, { count: number; value: number }>();
  for (const e of entries) {
    const k = movementLabel(e.movementType);
    const cur = movementMap.get(k) ?? { count: 0, value: 0 };
    cur.count += 1; cur.value += e.value || 0;
    movementMap.set(k, cur);
  }
  const byMovement = [...movementMap.entries()];

  const pendingEwb = entries.filter((e) => !e.ewbNumber).length;
  const ewb = { complete: entries.length - pendingEwb, pending: pendingEwb };

  const hsnMap = new Map<string, number>();
  for (const t of templates) for (const it of t.challan.items) {
    const h = (it.hsn || "—").trim() || "—";
    hsnMap.set(h, (hsnMap.get(h) ?? 0) + 1);
  }
  const hsn = [...hsnMap.entries()].sort((a, b) => b[1] - a[1]).slice(0, 8);

  const hasData = entries.length > 0 || templates.length > 0;

  return (
    <div className="card" style={{ borderColor: "var(--teal)" }}>
      <h2>Dashboard</h2>
      <p className="hint">A quick read on your issued challans and saved templates — computed locally in the browser.</p>
      <div className="export-row">
        <button type="button" className="ghost" onClick={onClose}>Close</button>
      </div>

      {!hasData && <p className="hint">No data yet. Export a few challans (they appear in the register) and save templates to populate the charts.</p>}

      {hasData && (
        <div className="dash-grid">
          <div className="dash-card">
            <div className="dash-h">Issued challans by movement</div>
            <ReactECharts style={{ height: 260 }} option={{
              ...noAnim, tooltip: { trigger: "axis" }, grid: baseGrid,
              xAxis: { type: "category", data: byMovement.map(([k]) => k), axisLabel: { interval: 0, width: 90, overflow: "break", fontSize: 10 } },
              yAxis: { type: "value", minInterval: 1 },
              series: [{ type: "bar", data: byMovement.map(([, v]) => v.count), itemStyle: { color: TEAL, borderRadius: [4, 4, 0, 0] } }],
            }} />
          </div>

          <div className="dash-card">
            <div className="dash-h">Consignment value by movement (INR)</div>
            <ReactECharts style={{ height: 260 }} option={{
              ...noAnim,
              tooltip: { trigger: "item", formatter: (p: any) => `${p.name}<br/>INR ${inr(p.value)} (${p.percent}%)` },
              legend: { bottom: 0, textStyle: { fontSize: 10 } },
              series: [{ type: "pie", radius: ["45%", "70%"], center: ["50%", "42%"], data: byMovement.map(([k, v]) => ({ name: k, value: Math.round(v.value) })), label: { show: false }, color: PALETTE }],
            }} />
          </div>

          <div className="dash-card">
            <div className="dash-h">E-way bill status</div>
            <ReactECharts style={{ height: 260 }} option={{
              ...noAnim, tooltip: { trigger: "item" }, legend: { bottom: 0, textStyle: { fontSize: 10 } },
              series: [{ type: "pie", radius: ["45%", "70%"], center: ["50%", "42%"], data: [
                { name: "EWB complete", value: ewb.complete, itemStyle: { color: GREEN } },
                { name: "EWB pending", value: ewb.pending, itemStyle: { color: RED } },
              ], label: { show: false } }],
            }} />
          </div>

          <div className="dash-card">
            <div className="dash-h">Top HSN across templates</div>
            {hsn.length ? (
              <ReactECharts style={{ height: 260 }} option={{
                ...noAnim, tooltip: { trigger: "axis" }, grid: { ...baseGrid, left: 40 },
                xAxis: { type: "value", minInterval: 1 },
                yAxis: { type: "category", data: hsn.map(([k]) => k).reverse(), axisLabel: { fontSize: 10 } },
                series: [{ type: "bar", data: hsn.map(([, v]) => v).reverse(), itemStyle: { color: BLUE, borderRadius: [0, 4, 4, 0] } }],
              }} />
            ) : <p className="hint" style={{ padding: 16 }}>Save templates with items to see an HSN breakdown.</p>}
          </div>
        </div>
      )}
    </div>
  );
}
