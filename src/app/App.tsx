import { useMemo, useState, useEffect } from "react";
import "../styles/tokens.css";
import type { DeliveryChallan, Party } from "../models/deliveryChallan";
import {
  emptyChallan,
  grandTotal,
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
import { createWord } from "../exports/createWord";
import { createExcel } from "../exports/createExcel";
import { wordFileName, excelFileName, jsonFileName, isoToDdmmyyyy, inr } from "../exports/filenames";
import {
  loadCompany, saveCompany, clearCompany, loadRegister, addToRegister, resetAll,
} from "../storage/localStorage";

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

  const patch = (p: Partial<DeliveryChallan>) => setC((cur) => ({ ...cur, ...p }));

  // Keep dispatchFrom synced to billFrom while "same" is checked.
  useEffect(() => {
    if (c.dispatchSameAsBillFrom) {
      setC((cur) => ({ ...cur, dispatchFrom: { ...cur.billFrom.address } }));
    }
  }, [c.dispatchSameAsBillFrom, c.billFrom.address]);

  useEffect(() => {
    if (c.shipToSameAsConsignee) {
      setC((cur) => ({ ...cur, shipTo: { ...cur.consignee.address } }));
    }
  }, [c.shipToSameAsConsignee, c.consignee.address]);

  // EWB transaction type derives from dispatch-vs-bill.
  useEffect(() => {
    const tt = inferEwbTransactionType(c.dispatchSameAsBillFrom);
    setC((cur) => ({ ...cur, ewayBill: { ...cur.ewayBill, transactionType: tt } }));
  }, [c.dispatchSameAsBillFrom]);

  const register = useMemo(() => loadRegister(), [step]);
  const result = useMemo(() => validateChallan(c, register), [c, register]);
  const challanAllowed = isChallanExportAllowed(c.movementType);
  const total = grandTotal(c.items);

  const setParty = (key: "billFrom" | "consignee", p: Party) => patch({ [key]: p } as any);

  const doWord = async (draft: boolean) => {
    const co = loadCompany();
    const blob = await createWord(c, { draft, companyName: co?.legalName });
    download(blob, wordFileName(c.challanNumber, c.challanDate));
    addToRegister(c.challanNumber);
  };
  const doExcel = async (draft: boolean) => {
    const co = loadCompany();
    const blob = await createExcel(c, { draft, companyName: co?.legalName });
    download(blob, excelFileName(c.challanNumber, c.challanDate));
    addToRegister(c.challanNumber);
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

  return (
    <div className="app">
      <div className="appbar">
        <div>
          <h1>Delivery Challan Assistant</h1>
          <div className="sub">Rule 55 non-supply movements · runs entirely in your browser · no data leaves this device</div>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button className="secondary" onClick={() => setShowCompany((s) => !s)}>Company Master</button>
          <button className="ghost" style={{ color: "#fff" }} onClick={() => { if (confirm("Start a new challan? Unsaved data will be cleared.")) { setC(emptyChallan()); setStep(0); } }}>New</button>
        </div>
      </div>

      {showCompany && <CompanyMaster onClose={() => setShowCompany(false)} onApply={(p) => setC((cur) => ({ ...cur, billFrom: p }))} />}

      <Stepper step={step} setStep={setStep} />

      <div className="card">
        {step === 0 && <StepMovement c={c} patch={patch} />}
        {step === 1 && <StepParties c={c} patch={patch} setParty={setParty} />}
        {step === 2 && <StepGoods c={c} patch={patch} />}
        {step === 3 && <StepTransport c={c} patch={patch} />}
        {step === 4 && (
          <StepReview
            c={c} result={result} challanAllowed={challanAllowed} total={total}
            doWord={doWord} doExcel={doExcel} doJson={doJson}
            onNew={() => { setC(emptyChallan()); setStep(0); }}
          />
        )}

        <div className="nav">
          <button className="secondary" disabled={step === 0} onClick={() => setStep((s) => Math.max(0, s - 1))}>← Back</button>
          {step < 4
            ? <button onClick={() => setStep((s) => Math.min(4, s + 1))}>Next →</button>
            : <label className="secondary" style={{ padding: "9px 16px", borderRadius: 6, cursor: "pointer", border: "1px solid var(--border)" }}>
                Import draft JSON
                <input type="file" accept="application/json" style={{ display: "none" }} onChange={(e) => e.target.files?.[0] && importJson(e.target.files[0])} />
              </label>}
        </div>
      </div>

      <div className="notice">
        This is a compliance-assistance tool, not a substitute for transaction-specific advice from your GST reviewer.
        Company data you enter in Company Master is stored only in this browser's localStorage.
        <button className="ghost" style={{ marginLeft: 8, color: "var(--red)" }} onClick={() => { if (confirm("Reset the entire app and clear all saved company data and the challan register?")) { resetAll(); setC(emptyChallan()); setStep(0); } }}>Reset entire app</button>
      </div>
    </div>
  );
}

function Stepper({ step, setStep }: { step: number; setStep: (n: number) => void }) {
  return (
    <div className="stepper" role="tablist">
      {STEPS.map((label, i) => (
        <button key={i} role="tab" aria-selected={step === i} className={`step ${step === i ? "active" : ""} ${i < step ? "done" : ""}`} onClick={() => setStep(i)}>
          <span className="n">{i + 1}</span>{label}
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

function StepParties({ c, patch, setParty }: { c: DeliveryChallan; patch: (p: Partial<DeliveryChallan>) => void; setParty: (k: "billFrom" | "consignee", p: Party) => void }) {
  return (
    <>
      <h2>Step 2 — Parties and locations</h2>
      <p className="hint">Bill From (who bills) and Actual Dispatch From (where goods physically leave) are kept separate on purpose.</p>

      <div className="block-title">A · Bill From / Consignor</div>
      <PartyEditor party={c.billFrom} onChange={(p) => setParty("billFrom", p)} idPrefix="bf" requireGstin />

      <div className="block-title">B · Actual Dispatch From</div>
      <div className="checkbox">
        <input id="dispatch-same" type="checkbox" checked={c.dispatchSameAsBillFrom} onChange={(e) => patch({ dispatchSameAsBillFrom: e.target.checked })} />
        <label htmlFor="dispatch-same">Same as Bill From address</label>
      </div>
      {!c.dispatchSameAsBillFrom
        ? <AddressBlock value={c.dispatchFrom} onChange={(a) => patch({ dispatchFrom: a })} idPrefix="df" />
        : <p className="hint">Using the Bill From address as the dispatch origin. Uncheck to enter a different plant / warehouse.</p>}

      <div className="block-title">C · Consignee / Job Worker</div>
      <PartyEditor party={c.consignee} onChange={(p) => setParty("consignee", p)} idPrefix="cn" requireGstin={false} />

      <div className="block-title">D · Actual Ship To / Delivery Address</div>
      <div className="checkbox">
        <input id="shipto-same" type="checkbox" checked={c.shipToSameAsConsignee} onChange={(e) => patch({ shipToSameAsConsignee: e.target.checked })} />
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

function StepReview({ c, result, challanAllowed, total, doWord, doExcel, doJson, onNew }: {
  c: DeliveryChallan; result: ReturnType<typeof validateChallan>; challanAllowed: boolean; total: number;
  doWord: (d: boolean) => void; doExcel: (d: boolean) => void; doJson: () => void; onNew: () => void;
}) {
  const blocked = result.errors.length > 0 || !challanAllowed;
  const draftMode = !c.ewayBill.number;
  return (
    <>
      <h2>Step 5 — Review, validate and export</h2>
      <p className="hint">Export unlocks only when there are no blocking errors.</p>

      <div className="preview" style={{ marginBottom: 14 }}>
        <div className="prow"><strong>{c.challanNumber || "(no number)"}</strong><span>{isoToDdmmyyyy(c.challanDate) || "(no date)"}</span></div>
        <div className="prow"><span>Movement</span><span>{MOVEMENT_BY_ID[c.movementType].label}</span></div>
        <div className="prow"><span>Bill From</span><span>{c.billFrom.legalName || "-"} · {c.billFrom.gstinOrUrp || "-"}</span></div>
        <div className="prow"><span>Dispatch From</span><span>{c.dispatchFrom.city || "-"} ({c.dispatchFrom.stateCode || "-"})</span></div>
        <div className="prow"><span>Consignee</span><span>{c.consignee.legalName || "-"} · {c.consignee.gstinOrUrp || "-"}</span></div>
        <div className="prow"><span>Items</span><span>{c.items.length} line(s)</span></div>
        <div className="prow"><strong>Consignment value</strong><strong>INR {inr(total)}</strong></div>
      </div>

      <ValidationSummary result={result} />

      <div className="export-row">
        <button disabled={blocked} onClick={() => doWord(draftMode)}>{draftMode ? "Download DRAFT Word" : "Download editable Word"}</button>
        <button className="teal" disabled={blocked} onClick={() => doExcel(draftMode)}>{draftMode ? "Download DRAFT Excel" : "Download Excel workbook"}</button>
        <button className="secondary" onClick={doJson}>Save draft JSON</button>
        <button className="secondary" onClick={() => { if (confirm("Start a new challan?")) onNew(); }}>Start a new challan</button>
      </div>
      {!challanAllowed && <div className="stop" style={{ marginTop: 12 }}><strong>Delivery-challan export is blocked for an own-branch different-GSTIN transfer.</strong> Use your tax-invoice workflow.</div>}

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

function CompanyMaster({ onClose, onApply }: { onClose: () => void; onApply: (p: Party) => void }) {
  const [party, setParty] = useState<Party>(() => loadCompany() || { legalName: "", gstinOrUrp: "", address: { locationName: "", line1: "", line2: "", city: "", district: "", pinCode: "", stateName: "", stateCode: "" } });
  return (
    <div className="card" style={{ borderColor: "var(--teal)" }}>
      <h2>Company Master</h2>
      <p className="hint">Stored only in this browser's localStorage. Use "Apply as Bill From" to load it into the current challan.</p>
      <PartyEditor party={party} onChange={setParty} idPrefix="co" requireGstin />
      <div className="export-row">
        <button onClick={() => { saveCompany(party); alert("Saved to this browser."); }}>Save company data</button>
        <button className="teal" onClick={() => { onApply(party); onClose(); }}>Apply as Bill From</button>
        <button className="secondary danger" onClick={() => { clearCompany(); alert("Cleared saved company data."); }}>Clear saved company data</button>
        <button className="ghost" onClick={onClose}>Close</button>
      </div>
    </div>
  );
}
