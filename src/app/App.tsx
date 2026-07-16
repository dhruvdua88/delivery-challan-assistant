import { useMemo, useState, useEffect, useRef, lazy, Suspense } from "react";
import type { KeyboardEvent as ReactKeyboardEvent } from "react";
import "../styles/tokens.css";
import type { DeliveryChallan, Party } from "../models/deliveryChallan";
import {
  emptyChallan,
  isInterstate,
  COPY_TYPES,
  TRANSPORT_MODES,
} from "../models/deliveryChallan";
import { MOVEMENTS, isChallanExportAllowed, MOVEMENT_BY_ID } from "../gst/movementRules";
import { STATES } from "../gst/states";
import { inferEwbTransactionType } from "../gst/ewayRules";
import { validateChallan } from "../features/validation/validate";
import { AddressBlock } from "../components/AddressBlock";
import { ItemGrid } from "../components/ItemGrid";
import { ValidationSummary } from "../components/ValidationSummary";
import { ChallanPreview } from "../components/ChallanPreview";
// Guide (large static content) and Templates (pulls in Dexie) are code-split
// so they stay out of the initial bundle until opened.
const Guide = lazy(() => import("../components/Guide").then((m) => ({ default: m.Guide })));
const Templates = lazy(() => import("../components/Templates").then((m) => ({ default: m.Templates })));
const Register = lazy(() => import("../components/Register").then((m) => ({ default: m.Register })));
import { wordFileName, excelFileName, jsonFileName, isoToDdmmyyyy } from "../exports/filenames";
import { sampleChallan } from "../features/transaction/sample";
import {
  loadCompany, saveCompany, clearCompany, loadRegister, addToRegister, addRegisterEntry, resetAll,
  isAutosaveEnabled, setAutosaveEnabled, loadDraft, saveDraft,
} from "../storage/localStorage";
import { grandTotal as sumItems } from "../models/deliveryChallan";

const STEPS = ["Movement", "Parties", "Goods & Value", "Transport & EWB", "Review & Export"];

function download(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = name;
  document.body.appendChild(a); a.click();
  a.remove(); URL.revokeObjectURL(url);
}

export default function App() {
  const [step, setStep] = useState(0);
  const [c, setC] = useState<DeliveryChallan>(() => emptyChallan());
  const [showCompany, setShowCompany] = useState(false);
  const [showTemplates, setShowTemplates] = useState(false);
  const [showRegister, setShowRegister] = useState(false);
  const [autosave, setAutosave] = useState(() => isAutosaveEnabled());
  const [companyRev, setCompanyRev] = useState(0); // bump when company master changes

  const patch = (p: Partial<DeliveryChallan>) => setC((cur) => ({ ...cur, ...p }));

  // Offer to restore an opt-in autosaved draft on first load.
  useEffect(() => {
    if (isAutosaveEnabled()) {
      const d = loadDraft();
      if (d && confirm("Restore your autosaved draft challan?")) setC(d);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Persist the draft on change when autosave is enabled (local only).
  useEffect(() => {
    if (autosave) saveDraft(c);
  }, [c, autosave]);

  const register = useMemo(() => loadRegister(), [step]);
  const aatoAbove5Cr = useMemo(() => loadCompany()?.aatoAbove5Cr ?? false, [companyRev, showCompany]);
  const result = useMemo(() => validateChallan(c, register, { aatoAbove5Cr }), [c, register, aatoAbove5Cr]);
  const challanAllowed = isChallanExportAllowed(c.movementType);

  // Party setters keep the "same as" mirror addresses in sync inside the same
  // update (no derived-state effects), avoiding extra render passes.
  const setParty = (key: "billFrom" | "consignee", p: Party) =>
    setC((cur) => {
      if (key === "billFrom")
        return { ...cur, billFrom: p, dispatchFrom: cur.dispatchSameAsBillFrom ? { ...p.address } : cur.dispatchFrom };
      return { ...cur, consignee: p, shipTo: cur.shipToSameAsConsignee ? { ...p.address } : cur.shipTo };
    });

  const setDispatchSame = (on: boolean) =>
    setC((cur) => ({
      ...cur,
      dispatchSameAsBillFrom: on,
      dispatchFrom: on ? { ...cur.billFrom.address } : cur.dispatchFrom,
      ewayBill: { ...cur.ewayBill, transactionType: inferEwbTransactionType(on) },
    }));

  const setShipSame = (on: boolean) =>
    setC((cur) => ({ ...cur, shipToSameAsConsignee: on, shipTo: on ? { ...cur.consignee.address } : cur.shipTo }));

  const [busy, setBusy] = useState<"word" | "excel" | null>(null);

  // Record a rich register entry whenever a challan is exported.
  const recordRegister = () => {
    if (!c.challanNumber.trim()) return;
    addToRegister(c.challanNumber);
    addRegisterEntry({
      number: c.challanNumber.trim(),
      date: c.challanDate,
      movementType: c.movementType,
      billFromName: c.billFrom.legalName,
      consigneeName: c.consignee.legalName,
      consigneeGstin: c.consignee.gstinOrUrp,
      placeOfSupply: c.placeOfSupplyStateCode,
      itemCount: c.items.length,
      value: sumItems(c.items),
      ewbNumber: c.ewayBill.number || "",
      issuedAt: new Date().toISOString(),
    });
  };

  // docx and exceljs are heavy — load them only when an export is requested,
  // so they are code-split out of the initial bundle.
  const doWord = async (draft: boolean) => {
    setBusy("word");
    try {
      const co = loadCompany();
      const { createWord } = await import("../exports/createWord");
      const blob = await createWord(c, { draft, companyName: co?.legalName });
      download(blob, wordFileName(c.challanNumber, c.challanDate));
      recordRegister();
    } finally { setBusy(null); }
  };
  const doExcel = async (draft: boolean) => {
    setBusy("excel");
    try {
      const co = loadCompany();
      const { createExcel } = await import("../exports/createExcel");
      const blob = await createExcel(c, { draft, companyName: co?.legalName });
      download(blob, excelFileName(c.challanNumber, c.challanDate));
      recordRegister();
    } finally { setBusy(null); }
  };
  const doJson = () => {
    download(new Blob([JSON.stringify(c, null, 2)], { type: "application/json" }), jsonFileName(c.challanNumber, c.challanDate));
  };
  const importJson = (file: File) => {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = JSON.parse(String(reader.result));
        if (parsed && parsed.schemaVersion === 1) { setC(parsed); setStep(0); }
        else alert("Not a valid delivery-challan draft file.");
      } catch { alert("Could not read that JSON file."); }
    };
    reader.readAsText(file);
  };

  // Move focus to the active step's panel on each step change so keyboard and
  // screen-reader users land on the new content instead of the top of the page.
  const panelRef = useRef<HTMLDivElement>(null);
  useEffect(() => { panelRef.current?.focus(); }, [step]);

  const [view, setView] = useState<"prepare" | "guide">("prepare");

  return (
    <div className="app">
      <a href="#step-panel" className="skip-link">Skip to form</a>
      <div className="appbar">
        <div>
          <h1>Delivery Challan Assistant</h1>
          <div className="sub">Rule 55 non-supply movements · runs entirely in your browser · no data leaves this device</div>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button type="button" className={view === "guide" ? "" : "secondary"} onClick={() => setView((v) => (v === "guide" ? "prepare" : "guide"))}>{view === "guide" ? "← Back to form" : "📘 Guide"}</button>
          <button type="button" className="secondary" onClick={() => setShowTemplates((s) => !s)}>Templates</button>
          <button type="button" className="secondary" onClick={() => setShowRegister((s) => !s)}>Register</button>
          <button type="button" className="secondary" onClick={() => { if (confirm("Load generic sample data? This replaces the current challan.")) { setC(sampleChallan()); setStep(0); } }}>Load sample</button>
          <button type="button" className="secondary" onClick={() => setShowCompany((s) => !s)}>Company Master</button>
          <button type="button" className="ghost" style={{ color: "#fff" }} onClick={() => { if (confirm("Start a new challan? Unsaved data will be cleared.")) { setC(emptyChallan()); setStep(0); } }}>New</button>
        </div>
      </div>

      {view === "guide" ? (
        <Suspense fallback={<div className="card"><p className="hint">Loading guide…</p></div>}>
          <Guide onPrepare={() => setView("prepare")} />
        </Suspense>
      ) : (
      <>
      {showTemplates && <Suspense fallback={<div className="card"><p className="hint">Loading templates…</p></div>}><Templates current={c} onLoad={(loaded) => { setC(loaded); setStep(0); }} onClose={() => setShowTemplates(false)} /></Suspense>}

      {showRegister && <Suspense fallback={<div className="card"><p className="hint">Loading register…</p></div>}><Register onClose={() => setShowRegister(false)} /></Suspense>}

      {showCompany && <CompanyMaster onClose={() => setShowCompany(false)} onApply={(p) => setC((cur) => ({ ...cur, billFrom: p }))} onSaved={() => setCompanyRev((r) => r + 1)} />}

      <Stepper step={step} setStep={setStep} />

      <div className="card">
        <div key={step} id="step-panel" role="tabpanel" aria-label={`Step ${step + 1}: ${STEPS[step]}`} tabIndex={-1} ref={panelRef} style={{ outline: "none" }}>
        {step === 0 && <StepMovement c={c} patch={patch} />}
        {step === 1 && <StepParties c={c} patch={patch} setParty={setParty} setDispatchSame={setDispatchSame} setShipSame={setShipSame} />}
        {step === 2 && <StepGoods c={c} patch={patch} />}
        {step === 3 && <StepTransport c={c} patch={patch} />}
        {step === 4 && (
          <StepReview
            c={c} result={result} challanAllowed={challanAllowed} busy={busy}
            doWord={doWord} doExcel={doExcel} doJson={doJson}
            onNew={() => { setC(emptyChallan()); setStep(0); }}
          />
        )}
        </div>

        <div className="nav">
          <button type="button" className="secondary" disabled={step === 0} onClick={() => setStep((s) => Math.max(0, s - 1))}>← Back</button>
          {step < 4
            ? <button type="button" onClick={() => setStep((s) => Math.min(4, s + 1))}>Next →</button>
            : <label className="secondary" style={{ padding: "9px 16px", borderRadius: 6, cursor: "pointer", border: "1px solid var(--border)" }}>
                Import draft JSON
                <input type="file" accept="application/json" style={{ display: "none" }} onChange={(e) => e.target.files?.[0] && importJson(e.target.files[0])} />
              </label>}
        </div>
      </div>

      <div className="notice">
        This is a compliance-assistance tool, not a substitute for transaction-specific advice from your GST reviewer.
        Company data you enter in Company Master is stored only in this browser's localStorage.
        <label className="checkbox" style={{ display: "inline-flex", marginLeft: 8 }}>
          <input type="checkbox" checked={autosave} onChange={(e) => { setAutosave(e.target.checked); setAutosaveEnabled(e.target.checked); if (e.target.checked) saveDraft(c); }} />
          <span>Autosave this draft to this browser (opt-in)</span>
        </label>
        <button type="button" className="ghost" style={{ marginLeft: 8, color: "var(--red)" }} onClick={() => { if (confirm("Reset the entire app and clear all saved company data and the challan register?")) { resetAll(); setAutosave(false); setC(emptyChallan()); setStep(0); } }}>Reset entire app</button>
      </div>
      </>
      )}
    </div>
  );
}

function Stepper({ step, setStep }: { step: number; setStep: (n: number) => void }) {
  const onKey = (e: ReactKeyboardEvent) => {
    let next = step;
    if (e.key === "ArrowRight" || e.key === "ArrowDown") next = Math.min(STEPS.length - 1, step + 1);
    else if (e.key === "ArrowLeft" || e.key === "ArrowUp") next = Math.max(0, step - 1);
    else if (e.key === "Home") next = 0;
    else if (e.key === "End") next = STEPS.length - 1;
    else return;
    e.preventDefault();
    setStep(next);
  };
  return (
    <div className="stepper" role="tablist" aria-label="Challan steps" onKeyDown={onKey}>
      {STEPS.map((label, i) => (
        <button
          key={label}
          type="button"
          role="tab"
          id={`step-tab-${i}`}
          aria-selected={step === i}
          aria-controls="step-panel"
          tabIndex={step === i ? 0 : -1}
          className={`step ${step === i ? "active" : ""} ${i < step ? "done" : ""}`}
          onClick={() => setStep(i)}
        >
          <span className="n" aria-hidden="true">{i + 1}</span>{label}
        </button>
      ))}
    </div>
  );
}

function StepMovement({ c, patch }: { c: DeliveryChallan; patch: (p: Partial<DeliveryChallan>) => void }) {
  const allowed = isChallanExportAllowed(c.movementType);
  return (
    <>
      <h2>Step 1 — Choose the movement</h2>
      <p className="hint">Pick the classification that truly matches the reason the goods are moving.</p>
      {MOVEMENTS.map((m) => (
        <div key={m.id} className={`move-opt ${c.movementType === m.id ? "sel" : ""}`} onClick={() => patch({ movementType: m.id })} role="radio" aria-checked={c.movementType === m.id} tabIndex={0}
          onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") patch({ movementType: m.id }); }}>
          <h3>{m.label}</h3>
          <p>{m.helper}</p>
        </div>
      ))}

      {!allowed && (
        <div className="stop" style={{ marginTop: 12 }}>
          <h3>⛔ Stop — a tax invoice is generally required</h3>
          <p>{MOVEMENT_BY_ID[c.movementType].legalBasis}</p>
          <p>A separate GST registration is a <strong>distinct person</strong>. Sending stock to it in the course of business is a supply even without consideration (Schedule I para 2). A zero-tax delivery challan is not the correct document. Delivery-challan export is disabled for this route. Use your tax-invoice workflow instead, or reclassify the movement if it is genuinely job work with the actual job worker as consignee.</p>
        </div>
      )}

      <div className="checkbox">
        <input id="approved" type="checkbox" checked={c.receiverAndPurposeApproved} onChange={(e) => patch({ receiverAndPurposeApproved: e.target.checked })} />
        <label htmlFor="approved">The receiver and the purpose of this movement are approved.</label>
      </div>
      <div className="grid">
        <div className="field">
          <label htmlFor="purpose">Exact purpose of movement</label>
          <span className="ex">Be specific and non-contradictory, e.g. "Repair and refurbishment of faulty control units, to be returned".</span>
          <textarea id="purpose" rows={2} value={c.exactPurpose} onChange={(e) => patch({ exactPurpose: e.target.value })} />
        </div>
        <div className="field">
          <label htmlFor="approvalref">Work order / job-work / written approval reference</label>
          <span className="ex">Required for an "other non-supply" movement.</span>
          <input id="approvalref" value={c.approvalReference || ""} onChange={(e) => patch({ approvalReference: e.target.value })} />
        </div>
      </div>
    </>
  );
}

function StepParties({ c, patch, setParty, setDispatchSame, setShipSame }: { c: DeliveryChallan; patch: (p: Partial<DeliveryChallan>) => void; setParty: (k: "billFrom" | "consignee", p: Party) => void; setDispatchSame: (on: boolean) => void; setShipSame: (on: boolean) => void }) {
  return (
    <>
      <h2>Step 2 — Parties and locations</h2>
      <p className="hint">Bill From (who bills) and Actual Dispatch From (where goods physically leave) are kept separate on purpose.</p>

      <div className="block-title">A · Bill From / Consignor</div>
      <PartyEditor party={c.billFrom} onChange={(p) => setParty("billFrom", p)} idPrefix="bf" requireGstin />

      <div className="block-title">B · Actual Dispatch From</div>
      <div className="checkbox">
        <input id="dispatch-same" type="checkbox" checked={c.dispatchSameAsBillFrom} onChange={(e) => setDispatchSame(e.target.checked)} />
        <label htmlFor="dispatch-same">Same as Bill From address</label>
      </div>
      {!c.dispatchSameAsBillFrom
        ? <AddressBlock value={c.dispatchFrom} onChange={(a) => patch({ dispatchFrom: a })} idPrefix="df" />
        : <p className="hint">Using the Bill From address as the dispatch origin. Uncheck to enter a different plant / warehouse.</p>}

      <div className="block-title">C · Consignee / Job Worker</div>
      <PartyEditor party={c.consignee} onChange={(p) => setParty("consignee", p)} idPrefix="cn" requireGstin={false} />

      <div className="block-title">D · Actual Ship To / Delivery Address</div>
      <div className="checkbox">
        <input id="shipto-same" type="checkbox" checked={c.shipToSameAsConsignee} onChange={(e) => setShipSame(e.target.checked)} />
        <label htmlFor="shipto-same">Same as consignee address</label>
      </div>
      {!c.shipToSameAsConsignee
        ? <AddressBlock value={c.shipTo} onChange={(a) => patch({ shipTo: a })} idPrefix="st" />
        : <p className="hint">Delivering to the consignee's own address. Uncheck for a Bill To – Ship To case.</p>}
    </>
  );
}

function PartyEditor({ party, onChange, idPrefix, requireGstin }: { party: Party; onChange: (p: Party) => void; idPrefix: string; requireGstin: boolean }) {
  return (
    <>
      <div className="grid">
        <div className="field">
          <label htmlFor={`${idPrefix}-name`}>Legal name</label>
          <input id={`${idPrefix}-name`} value={party.legalName} onChange={(e) => onChange({ ...party, legalName: e.target.value })} />
        </div>
        <div className="field">
          <label htmlFor={`${idPrefix}-gstin`}>GSTIN{requireGstin ? "" : " or URP"}</label>
          <span className="ex">{requireGstin ? "15-character GSTIN" : "GSTIN, or type URP for an unregistered job worker"}</span>
          <input id={`${idPrefix}-gstin`} value={party.gstinOrUrp} maxLength={15} onChange={(e) => onChange({ ...party, gstinOrUrp: e.target.value.toUpperCase() })} placeholder="27AACCF9909N1Z0" />
        </div>
      </div>
      <AddressBlock value={party.address} onChange={(a) => onChange({ ...party, address: a })} idPrefix={idPrefix} />
    </>
  );
}

function StepGoods({ c, patch }: { c: DeliveryChallan; patch: (p: Partial<DeliveryChallan>) => void }) {
  return (
    <>
      <h2>Step 3 — Document, goods and value</h2>
      <p className="hint">Value is declared only for GST, e-way bill and insurance — this is not a sale.</p>
      <div className="grid-3">
        <div className="field">
          <label htmlFor="dcno">Delivery challan number</label>
          <span className="ex">Consecutive, unique, ≤ 16 characters.</span>
          <input id="dcno" value={c.challanNumber} maxLength={16} onChange={(e) => patch({ challanNumber: e.target.value })} placeholder="DC/2026/001" />
        </div>
        <div className="field">
          <label htmlFor="dcdate">Challan date</label>
          <input id="dcdate" type="date" value={c.challanDate} onChange={(e) => patch({ challanDate: e.target.value })} />
          <span className="ex">Shows as {c.challanDate ? isoToDdmmyyyy(c.challanDate) : "dd/mm/yyyy"}.</span>
        </div>
        <div className="field">
          <label htmlFor="copy">Copy marking</label>
          <select id="copy" value={c.copyType} onChange={(e) => patch({ copyType: e.target.value as any })}>
            {COPY_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>
        <div className="field">
          <label htmlFor="pos">Place of supply</label>
          <select id="pos" value={c.placeOfSupplyStateCode} onChange={(e) => patch({ placeOfSupplyStateCode: e.target.value })}>
            <option value="">Select…</option>
            {STATES.map((s) => <option key={s.code} value={s.code}>{s.code} — {s.name}</option>)}
          </select>
          <span className="ex">{isInterstate(c) ? "Interstate movement — place of supply required." : "Intrastate movement."}</span>
        </div>
      </div>
      {c.movementType === "DIRECT_JOB_WORK" && (
        <>
          <div className="block-title">Job-work return control (Section 143)</div>
          <div className="grid">
            <div className="field">
              <label htmlFor="jwtype">Goods type</label>
              <select id="jwtype" value={c.jobWork?.goodsType ?? "INPUTS"} onChange={(e) => patch({ jobWork: { goodsType: e.target.value as any, expectedReturnDate: c.jobWork?.expectedReturnDate } })}>
                <option value="INPUTS">Inputs — return within 1 year</option>
                <option value="CAPITAL_GOODS">Capital goods — return within 3 years</option>
              </select>
              <span className="ex">Not returned in time ⇒ deemed a supply on the challan date.</span>
            </div>
            <div className="field">
              <label htmlFor="jwret">Expected return date</label>
              <input id="jwret" type="date" value={c.jobWork?.expectedReturnDate ?? ""} onChange={(e) => patch({ jobWork: { goodsType: c.jobWork?.goodsType ?? "INPUTS", expectedReturnDate: e.target.value } })} />
              <span className="ex">Track the return and report in ITC-04.</span>
            </div>
          </div>
        </>
      )}

      <div className="block-title">Items</div>
      <ItemGrid items={c.items} onChange={(items) => patch({ items })} />
    </>
  );
}

function StepTransport({ c, patch }: { c: DeliveryChallan; patch: (p: Partial<DeliveryChallan>) => void }) {
  const t = c.transport;
  const e = c.ewayBill;
  const setT = (p: Partial<typeof t>) => patch({ transport: { ...t, ...p } });
  const setE = (p: Partial<typeof e>) => patch({ ewayBill: { ...e, ...p } });
  return (
    <>
      <h2>Step 4 — Transport and e-way bill</h2>
      <p className="hint">The app prepares an e-way bill checklist. It does not submit anything to the portal.</p>
      <div className="grid-3">
        <div className="field"><label htmlFor="mode">Mode of transport</label>
          <select id="mode" value={t.mode} onChange={(e2) => setT({ mode: e2.target.value })}>{TRANSPORT_MODES.map((m) => <option key={m}>{m}</option>)}</select></div>
        <div className="field"><label htmlFor="trname">Transporter name</label><input id="trname" value={t.transporterName || ""} onChange={(e2) => setT({ transporterName: e2.target.value })} /></div>
        <div className="field"><label htmlFor="trid">Transporter ID / GSTIN</label><input id="trid" value={t.transporterId || ""} onChange={(e2) => setT({ transporterId: e2.target.value })} /></div>
        <div className="field"><label htmlFor="veh">Vehicle number</label><input id="veh" value={t.vehicleNumber || ""} onChange={(e2) => setT({ vehicleNumber: e2.target.value.toUpperCase() })} placeholder="MH12AB1234" /></div>
        <div className="field"><label htmlFor="lr">LR / GR number</label><input id="lr" value={t.lrGrNumber || ""} onChange={(e2) => setT({ lrGrNumber: e2.target.value })} /></div>
        <div className="field"><label htmlFor="lrdate">LR / GR date</label><input id="lrdate" type="date" value={t.lrGrDate || ""} onChange={(e2) => setT({ lrGrDate: e2.target.value })} /></div>
        <div className="field"><label htmlFor="dist">Approx. distance (km)</label><input id="dist" inputMode="numeric" value={t.approximateDistanceKm ?? ""} onChange={(e2) => setT({ approximateDistanceKm: e2.target.value === "" ? undefined : Math.max(0, Number(e2.target.value.replace(/\D/g, ""))) })} /></div>
      </div>

      <div className="block-title">E-way bill</div>
      <div className="grid-3">
        <div className="field"><label htmlFor="ewbno">E-way bill number</label><input id="ewbno" inputMode="numeric" maxLength={12} value={e.number || ""} onChange={(e2) => setE({ number: e2.target.value.replace(/\D/g, "").slice(0, 12) })} placeholder="12 digits" /></div>
        <div className="field"><label htmlFor="ewbdate">EWB date</label><input id="ewbdate" type="date" value={e.generatedAt || ""} onChange={(e2) => setE({ generatedAt: e2.target.value })} /></div>
        <div className="field"><label htmlFor="ewbvalid">EWB valid until</label><input id="ewbvalid" type="date" value={e.validUntil || ""} onChange={(e2) => setE({ validUntil: e2.target.value })} /></div>
      </div>

      <div className="warnpanel" style={{ marginTop: 12 }}>
        <strong>Derived e-way bill transaction type: {e.transactionType}</strong>
        <div style={{ marginTop: 4 }}>
          {c.dispatchSameAsBillFrom
            ? "Bill From and Dispatch From are the same — use the Regular transaction type."
            : `Dispatch From differs from Bill From — use "Bill From – Dispatch From". Actual dispatch: ${c.dispatchFrom.city || "-"}, PIN ${c.dispatchFrom.pinCode || "-"}, State ${c.dispatchFrom.stateCode || "-"}. Keep the Bill From GSTIN (${c.billFrom.gstinOrUrp || "-"}) as the supplier GSTIN.`}
        </div>
        {!e.number && <div style={{ marginTop: 6, color: "var(--red)", fontWeight: 600 }}>E-way bill number is blank — any output will be watermarked DRAFT — NOT FOR DISPATCH.</div>}
      </div>
    </>
  );
}

function StepReview({ c, result, challanAllowed, busy, doWord, doExcel, doJson, onNew }: {
  c: DeliveryChallan; result: ReturnType<typeof validateChallan>; challanAllowed: boolean;
  busy: "word" | "excel" | null;
  doWord: (d: boolean) => void; doExcel: (d: boolean) => void; doJson: () => void; onNew: () => void;
}) {
  const blocked = result.errors.length > 0 || !challanAllowed;
  const draftMode = !c.ewayBill.number;
  return (
    <>
      <h2>Step 5 — Review, validate and export</h2>
      <p className="hint">Export unlocks only when there are no blocking errors. The preview below prints on A4 landscape.</p>

      <ChallanPreview c={c} draft={draftMode} />

      <ValidationSummary result={result} />

      <div className="export-row">
        <button type="button" disabled={blocked || busy !== null} onClick={() => doWord(draftMode)}>{busy === "word" ? "Preparing…" : draftMode ? "Download DRAFT Word" : "Download editable Word"}</button>
        <button type="button" className="teal" disabled={blocked || busy !== null} onClick={() => doExcel(draftMode)}>{busy === "excel" ? "Preparing…" : draftMode ? "Download DRAFT Excel" : "Download Excel workbook"}</button>
        <button type="button" className="secondary" onClick={() => window.print()}>Print preview</button>
        <button type="button" className="secondary" onClick={doJson}>Save draft JSON</button>
        <button type="button" className="secondary" onClick={() => { if (confirm("Start a new challan?")) onNew(); }}>Start a new challan</button>
      </div>
      {!challanAllowed && <div className="stop" style={{ marginTop: 12 }}><strong>Delivery-challan export is blocked for an own-branch different-GSTIN transfer.</strong> Use your tax-invoice workflow.</div>}

      <div className="notice" style={{ marginTop: 12 }}>
        <strong>Rule 55(1) particulars:</strong> a delivery challan must carry date and serially-unique number, consignor and consignee names/addresses/GSTINs, HSN and description, quantity (provisional where not determinable), taxable value, tax rate and amount where applicable, place of supply for interstate movement, and signature. This tool captures these for a non-supply movement; confirm nothing is left blank before dispatch.
      </div>
      <details className="why">
        <summary>Why these checks matter</summary>
        <ul>
          <li>Choose the correct document before entering details — don't describe a distinct-GSTIN supply as job work.</li>
          <li>Use the actual job worker as consignee for direct job work.</li>
          <li>Keep Bill From and Dispatch From separate; keep consignee and Ship To separate where needed.</li>
          <li>Use a consecutive, unique challan number of ≤ 16 characters and an exact, non-contradictory purpose.</li>
          <li>Maintain HSN / UQC / quantity / value quality; complete the e-way bill and Part B before movement.</li>
          <li>Use controlled copies, obtain signature, and keep the work order, LR/GR and EWB PDF together.</li>
          <li>For job work, return inputs within 1 year and capital goods within 3 years (Section 143), else the movement is deemed a supply — and report in ITC-04.</li>
          <li>Track goods sent, returned, rejected, scrapped and overdue; reconcile gate register, stock ledger, DC register, EWB and return receipt.</li>
        </ul>
      </details>
    </>
  );
}

function CompanyMaster({ onClose, onApply, onSaved }: { onClose: () => void; onApply: (p: Party) => void; onSaved: () => void }) {
  const existing = loadCompany();
  const [party, setParty] = useState<Party>(() => existing || { legalName: "", gstinOrUrp: "", address: { locationName: "", line1: "", line2: "", city: "", district: "", pinCode: "", stateName: "", stateCode: "" } });
  const [aatoAbove5Cr, setAato] = useState<boolean>(() => existing?.aatoAbove5Cr ?? false);
  return (
    <div className="card" style={{ borderColor: "var(--teal)" }}>
      <h2>Company Master</h2>
      <p className="hint">Stored only in this browser's localStorage. Use "Apply as Bill From" to load it into the current challan.</p>
      <PartyEditor party={party} onChange={setParty} idPrefix="co" requireGstin />
      <label className="checkbox">
        <input type="checkbox" checked={aatoAbove5Cr} onChange={(e) => setAato(e.target.checked)} />
        <span>Aggregate Annual Turnover is above Rs 5 crore — require 6-digit HSN (Notification 78/2020-CT).</span>
      </label>
      <div className="export-row">
        <button type="button" onClick={() => { saveCompany({ ...party, aatoAbove5Cr }); onSaved(); alert("Saved to this browser."); }}>Save company data</button>
        <button type="button" className="teal" onClick={() => { onApply(party); onClose(); }}>Apply as Bill From</button>
        <button type="button" className="secondary danger" onClick={() => { clearCompany(); onSaved(); alert("Cleared saved company data."); }}>Clear saved company data</button>
        <button type="button" className="ghost" onClick={onClose}>Close</button>
      </div>
    </div>
  );
}
