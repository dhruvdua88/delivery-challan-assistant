import { memo } from "react";
import type { DeliveryChallan, Address } from "../models/deliveryChallan";
import { grandTotal, lineTotal, totalPackages, totalQuantity } from "../models/deliveryChallan";
import { MOVEMENT_BY_ID, declarationFor } from "../gst/movementRules";
import { stateNameForCode } from "../gst/states";
import { isoToDdmmyyyy, inr } from "../exports/filenames";
import { loadCompany } from "../storage/localStorage";
import { DRAFT_WATERMARK, FOOTER_LINE } from "../exports/templates";

function fmtAddr(a: Address): string {
  return [
    a.locationName, a.line1, a.line2,
    [a.city, a.district].filter(Boolean).join(", "),
    `${stateNameForCode(a.stateCode) || a.stateName || ""}${a.stateCode ? ` (${a.stateCode})` : ""}`,
    a.pinCode ? `PIN ${a.pinCode}` : "",
  ].filter(Boolean).join("\n");
}

// On-screen print-like preview. Mirrors the Word/Excel layout so the user sees
// what they will get before exporting. The `challan-print` root is the only
// element shown when printing (see print rules in tokens.css).
export const ChallanPreview = memo(function ChallanPreview({ c, draft }: { c: DeliveryChallan; draft: boolean }) {
  const co = loadCompany();
  const decl = declarationFor(c.movementType);
  return (
    <div className="challan-print" id="challan-print">
      <div className="cp-title">{(co?.legalName || "DELIVERY CHALLAN").toUpperCase()}</div>
      <div className="cp-sub">DELIVERY CHALLAN (Rule 55 — not a tax invoice)</div>
      {draft && <div className="cp-draft">{DRAFT_WATERMARK}</div>}

      <div className="cp-meta">
        <div><b>DC No.:</b> {c.challanNumber || "-"}</div>
        <div><b>Date:</b> {isoToDdmmyyyy(c.challanDate) || "-"}</div>
        <div><b>Copy:</b> {c.copyType}</div>
        <div><b>Movement:</b> {MOVEMENT_BY_ID[c.movementType].label}</div>
        <div><b>Place of Supply:</b> {stateNameForCode(c.placeOfSupplyStateCode) || "-"}{c.placeOfSupplyStateCode ? ` (${c.placeOfSupplyStateCode})` : ""}</div>
        <div><b>Approval Ref:</b> {c.approvalReference || "-"}</div>
      </div>

      <div className="cp-parties">
        <div className="cp-box">
          <div className="cp-h">Bill From / Consignor</div>
          <div className="cp-strong">{c.billFrom.legalName || "-"}</div>
          <div>GSTIN: {c.billFrom.gstinOrUrp || "-"}</div>
          <pre>{fmtAddr(c.billFrom.address)}</pre>
        </div>
        <div className="cp-box">
          <div className="cp-h">Consignee / Job Worker</div>
          <div className="cp-strong">{c.consignee.legalName || "-"}</div>
          <div>GSTIN: {c.consignee.gstinOrUrp || "-"}</div>
          <pre>{fmtAddr(c.consignee.address)}</pre>
        </div>
      </div>

      <div className="cp-box">
        <div className="cp-h">Actual Dispatch From</div>
        <pre>{fmtAddr(c.dispatchFrom)}</pre>
      </div>
      {!c.shipToSameAsConsignee && (
        <div className="cp-box">
          <div className="cp-h">Ship To / Delivery Address</div>
          <pre>{fmtAddr(c.shipTo)}</pre>
        </div>
      )}

      <div className="cp-meta">
        <div><b>Mode:</b> {c.transport.mode || "-"}</div>
        <div><b>Transporter:</b> {c.transport.transporterName || "-"}</div>
        <div><b>Vehicle:</b> {c.transport.vehicleNumber || "-"}</div>
        <div><b>LR/GR:</b> {c.transport.lrGrNumber || "-"}</div>
        <div><b>EWB No.:</b> <span style={{ color: c.ewayBill.number ? undefined : "var(--red)" }}>{c.ewayBill.number || (draft ? "PENDING" : "-")}</span></div>
        <div><b>EWB Txn:</b> {c.ewayBill.transactionType}</div>
      </div>

      <table className="cp-items">
        <thead>
          <tr><th>#</th><th>Description / Model</th><th>HSN</th><th>UQC</th><th>Qty</th><th>Pkgs</th><th>Unit Value</th><th>Total Value</th></tr>
        </thead>
        <tbody>
          {c.items.map((it, i) => (
            <tr key={it.id}>
              <td>{i + 1}</td>
              <td>{[it.description, it.modelOrItemCode].filter(Boolean).join(" — ") || "-"}</td>
              <td>{it.hsn || "-"}</td>
              <td>{it.uqc}</td>
              <td className="r">{it.quantity}</td>
              <td className="r">{it.packages ?? "-"}</td>
              <td className="r">{inr(it.unitValue)}</td>
              <td className="r">{inr(lineTotal(it))}</td>
            </tr>
          ))}
          <tr className="cp-total">
            <td colSpan={4}>TOTAL</td>
            <td className="r">{totalQuantity(c.items)}</td>
            <td className="r">{totalPackages(c.items) || "-"}</td>
            <td></td>
            <td className="r">{inr(grandTotal(c.items))}</td>
          </tr>
        </tbody>
      </table>

      {decl && <div className="cp-decl">{decl}</div>}
      <div className="cp-purpose">Exact purpose: {c.exactPurpose || "-"}</div>

      <div className="cp-sign">
        <div>Prepared by</div>
        <div>Authorised Signatory</div>
      </div>
      <div className="cp-foot">{FOOTER_LINE}</div>
    </div>
  );
});
