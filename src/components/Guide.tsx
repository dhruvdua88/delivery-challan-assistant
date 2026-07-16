// The definitive in-app guide: delivery-challan concept, which document to use,
// e-way bill law, which EWB for a delivery challan, the job-work flow, validity,
// case law and a practical dispatch checklist. Content is sourced from the CGST
// Act/Rules, CBIC circulars and NIC e-way bill documentation (links inline).
// It is practitioner guidance, not a substitute for case-specific GST advice.

const SECTIONS: { id: string; title: string }[] = [
  { id: "concept", title: "1. What a delivery challan is" },
  { id: "which-doc", title: "2. Delivery challan vs tax invoice" },
  { id: "particulars", title: "3. Mandatory particulars (Rule 55)" },
  { id: "ewb-law", title: "4. E-way bill — the law" },
  { id: "ewb-for-dc", title: "5. Which e-way bill for a delivery challan" },
  { id: "txn-types", title: "6. Transaction types & Bill From–Dispatch From" },
  { id: "job-work", title: "7. Job work end-to-end (Circular 38)" },
  { id: "validity", title: "8. Validity, Part B, cancellation" },
  { id: "case-law", title: "9. Case law & circulars" },
  { id: "checklist", title: "10. Practical dispatch checklist" },
  { id: "refs", title: "References" },
];

function A({ href, children }: { href: string; children: React.ReactNode }) {
  return <a href={href} target="_blank" rel="noopener noreferrer">{children}</a>;
}

export function Guide({ onPrepare }: { onPrepare: () => void }) {
  return (
    <div className="guide">
      <nav className="guide-toc" aria-label="Guide contents">
        <h3>On this page</h3>
        {SECTIONS.map((s) => (
          <a key={s.id} href={`#${s.id}`}>{s.title}</a>
        ))}
        <div style={{ marginTop: 12 }}>
          <button type="button" className="teal" style={{ width: "100%" }} onClick={onPrepare}>Prepare a challan →</button>
        </div>
      </nav>

      <div className="guide-body">
        <section aria-labelledby="guide-intro">
          <h2 id="guide-intro">Delivery challans & e-way bills — a practical guide</h2>
          <p className="lead">
            How to tell a genuine non-supply movement from a taxable transfer, which document each needs,
            and exactly which e-way bill to raise on a delivery challan — grounded in the CGST Act/Rules,
            CBIC circulars, NIC portal documentation and settled case law. This is practitioner guidance,
            not case-specific advice; verify against the law in force before you rely on it.
          </p>
          <div className="callout warn">
            <strong>Effective-date warning.</strong> GST rules, state intra-state thresholds and the
            e-way bill validity slab change often. Every rule/section/circular number is cited so you can
            re-check the primary text before acting.
          </div>
        </section>

        <section id="concept" aria-labelledby="h-concept">
          <h2 id="h-concept">1. What a delivery challan is</h2>
          <p>
            A <strong>delivery challan (DC)</strong> is the transport document that legally covers the
            movement of goods <em>without a tax invoice</em>, in the specific situations where the movement
            is not (or not yet) a taxable supply. Its enabling provision is <strong>Rule 55 of the CGST
            Rules, 2017</strong> ("Transportation of goods without issue of invoice").
          </p>
          <p><strong>Rule 55(1)</strong> permits a delivery challan in place of an invoice for:</p>
          <ul>
            <li>(a) supply of <strong>liquid gas</strong> where the quantity at removal is not known;</li>
            <li>(b) transportation of goods for <strong>job work</strong>;</li>
            <li>(c) transportation of goods <strong>for reasons other than by way of supply</strong>; and</li>
            <li>(d) such other supplies as the Board may notify.</li>
          </ul>
          <h3>Legitimate use cases</h3>
          <ul>
            <li>Job work — inputs/capital goods to a job worker and back (Rule 55(1)(b), s.143, Rule 45, ITC-04).</li>
            <li>Movement to your own additional place of business under the <strong>same GSTIN</strong> (not a supply).</li>
            <li>Repairs / refurbishment / servicing — send-out and return.</li>
            <li>Sale on approval / sale-or-return — goods travel on a DC under <strong>s.31(7)</strong> until approval or 6 months.</li>
            <li>Exhibition / demonstration / trade fair / demo units.</li>
            <li>Testing, quality inspection, weighbridge (up to 20 km, DC only — Rule 138(14)(n)).</li>
            <li>Liquid gas where quantity is not known at removal.</li>
          </ul>
          <p className="cite">
            Sources: <A href="https://taxinformation.cbic.gov.in/content/html/tax_repository/gst/rules/cgst_rules/active/chapter6/rule55_v1.00.html">CBIC Rule 55</A>,
            {" "}<A href="https://taxinformation.cbic.gov.in/content/html/tax_repository/gst/acts/2017_CGST_act/active/chapter7/section31_v1.00.html">CBIC s.31 (incl. 31(7))</A>.
          </p>
        </section>

        <section id="which-doc" aria-labelledby="h-which">
          <h2 id="h-which">2. Delivery challan vs tax invoice — choose the document first</h2>
          <p>
            The document follows the <strong>legal character of the movement</strong>, not the physical fact
            of goods leaving the premises. A <strong>tax invoice</strong> (s.31(1), Rule 46) is required
            whenever the movement is — or is deemed to be — a <strong>taxable supply</strong>. A delivery
            challan is correct only where the movement is <strong>not a supply</strong> (or is a supply where
            the invoice is legitimately deferred).
          </p>
          <div className="callout stop">
            <strong>The commonest and costliest trap — stock transfer to a different GSTIN is a SUPPLY.</strong>
            {" "}Two registrations under the same PAN (different states, or a second registration in the same
            state) are <strong>"distinct persons"</strong> under s.25(4)/(5). <strong>Schedule I, Para 2</strong>
            {" "}deems a supply between distinct persons in the course of business to be a supply
            <em> even without consideration</em>. So an own-branch transfer to a different GSTIN must move on a
            {" "}<strong>tax invoice with IGST (or CGST+SGST)</strong> — <strong>not</strong> a zero-tax
            delivery challan. This app blocks delivery-challan export for that route.
          </div>
          <ul className="flow" aria-label="Which document decision flow">
            <li className="node q">Is ownership/title passing, or is it a deemed supply (Schedule I)?</li>
            <li className="node no"><strong>No</strong> → genuine non-supply movement (job work, repair, exhibition, same-GSTIN transfer) → <strong>Delivery Challan (Rule 55)</strong>.</li>
            <li className="node yes"><strong>Yes</strong> → supply → is the recipient a different GSTIN (distinct person) or an outside buyer? → <strong>Tax Invoice + GST (s.31)</strong>.</li>
            <li className="node q">Supply but quantity/consideration not yet known (liquid gas, sale-on-approval)? → DC now, invoice within the s.31(7)/Rule 55(4) window.</li>
          </ul>
          <div className="callout warn">
            <strong>Using the wrong document.</strong> Moving a taxable supply on a DC does not convert it into
            a non-supply. The department can recover the tax with interest (s.50) and penalty (s.73/74), and
            detain the goods in transit under <strong>s.129</strong> (penalty up to 100–200% of tax) or
            confiscate under <strong>s.130</strong>.
          </div>
          <p className="cite">
            Sources: <A href="https://taxinformation.cbic.gov.in/content/html/tax_repository/gst/acts/2017_CGST_act/active/chapter21/schedulei_v1.00.html">CBIC Schedule I</A>,
            {" "}<A href="https://taxinformation.cbic.gov.in/content/html/tax_repository/gst/acts/2017_CGST_act/active/chapter7/section31_v1.00.html">CBIC s.31</A>.
          </p>
        </section>

        <section id="particulars" aria-labelledby="h-part">
          <h2 id="h-part">3. Mandatory particulars — Rule 55</h2>
          <p><strong>Rule 55(1)</strong> — the challan must be <strong>serially numbered, not exceeding 16 characters</strong> (Rule 46(b) series standard) and carry:</p>
          <ul>
            <li>date and number of the delivery challan;</li>
            <li>name, address and GSTIN of the <strong>consignor</strong> (if registered);</li>
            <li>name, address and GSTIN/UIN of the <strong>consignee</strong> (if registered);</li>
            <li>HSN code and description of goods;</li>
            <li><strong>quantity</strong> (provisional where the exact quantity is not determinable);</li>
            <li><strong>taxable value</strong>;</li>
            <li>tax rate and amount (CGST/SGST/IGST/UTGST/cess) <em>where the transport is for supply</em>;</li>
            <li>place of supply, for inter-state movement; and</li>
            <li>signature.</li>
          </ul>
          <h3>Triplicate — Rule 55(2)</h3>
          <ul>
            <li><strong>Original</strong> — "ORIGINAL FOR CONSIGNEE"</li>
            <li><strong>Duplicate</strong> — "DUPLICATE FOR TRANSPORTER"</li>
            <li><strong>Triplicate</strong> — "TRIPLICATE FOR CONSIGNOR"</li>
          </ul>
          <h3>SKD/CKD & batch consignments — Rule 55(5)</h3>
          <p>
            Where goods move semi-knocked-down / completely-knocked-down or in lots: issue the
            <strong> complete invoice before the first consignment</strong>; a <strong>delivery challan for each
            subsequent consignment</strong> referencing that invoice; each consignment carries a copy of the DC
            plus a certified copy of the invoice; the <strong>original invoice travels with the last consignment</strong>.
            Rule 55(3): where a DC is used, declare it in the e-way bill (EWB-01) wherever Rule 138 requires one.
          </p>
          <div className="callout tip">
            A DC value is <strong>not zero</strong> even for job work with no consideration — Rule 55(1) requires a
            taxable value. Declare the value of the goods (cost / open-market value per s.15). The job-work
            <em> service</em> charge is invoiced separately by the job worker.
          </div>
        </section>

        <section id="ewb-law" aria-labelledby="h-ewb">
          <h2 id="h-ewb">4. E-way bill — the law</h2>
          <p>
            Statutory basis: <strong>Section 68</strong> and <strong>Rules 138–138E</strong>. Rule 138 was
            substituted by Notification 12/2018-CT (07.03.2018); the EWB went live for inter-state movement
            from <strong>01.04.2018</strong>.
          </p>
          <h3>When an EWB is required — Rule 138(1)</h3>
          <p>
            A registered person causing movement of goods of <strong>consignment value exceeding ₹50,000</strong>
            {" "}— for a supply, for reasons other than supply (branch transfer, job work, sales return), or an
            inward supply from an unregistered person — must furnish Part A before movement and generate the EWB.
          </p>
          <div className="callout warn">
            <strong>Mandatory regardless of value.</strong> For <strong>inter-state movement of goods to a job
            worker</strong> by the principal, the EWB is required <strong>even below ₹50,000</strong> (first
            proviso to Rule 138(1)). Same for inter-state movement of handicraft goods by a person exempt from
            registration.
          </div>
          <p>
            <strong>"Consignment value"</strong> (Explanation 2) is the s.15 value on the invoice/DC
            <strong> including GST and cess</strong>, but <strong>excluding exempt-supply value</strong>.
          </p>
          <h3>Intra-state thresholds differ by state</h3>
          <p>
            Inter-state is uniformly ₹50,000, but states set their own <strong>intra-state</strong> limits — many
            at ₹50,000; several (Delhi, Bihar, Maharashtra, Tamil Nadu, Punjab, MP, etc.) at
            <strong> ₹1,00,000</strong>; some with special rules (Rajasthan). This changes by state notification —
            confirm the current state limit.
          </p>
          <h3>Documents to carry — Rule 138A</h3>
          <p>The person in charge must carry (i) the invoice / bill of supply / <strong>delivery challan</strong>, and (ii) a copy of the EWB or the EWB number (or RFID-mapped). Under e-invoicing, the IRN/QR may be produced electronically.</p>
          <h3>Return-filing block — Rule 138E</h3>
          <p>Part A cannot be generated for a taxpayer who has not filed returns for two consecutive tax periods (GSTR-3B / GSTR-1), or whose registration is suspended/cancelled — until the pending returns are filed.</p>
          <p className="cite">
            Sources: <A href="https://taxinformation.cbic.gov.in/content/html/tax_repository/gst/rules/cgst_rules/active/chapter16/rule138_v1.00.html">CBIC Rule 138</A>,
            {" "}<A href="https://docs.ewaybillgst.gov.in/html/faq.html">NIC e-way bill FAQ</A>,
            {" "}<A href="https://cleartax.in/s/state-wise-threshold-limits-e-way-bills">state-wise thresholds</A>.
          </p>
        </section>

        <section id="ewb-for-dc" aria-labelledby="h-ewbdc">
          <h2 id="h-ewbdc">5. Which e-way bill for a delivery challan</h2>
          <p>
            On the portal set <strong>Document Type = Delivery Challan (CHL)</strong>, then pick the
            <strong> Sub-Type</strong> that matches the reason for movement (NIC master codes). For a
            principal→job-worker move choose <strong>Job Work</strong>, never "Supply" — "Supply" flags a sale.
          </p>
          <div className="guide-scroll">
            <table className="guide-table">
              <thead><tr><th>Direction</th><th>Sub-type (with a Delivery Challan)</th><th>When</th></tr></thead>
              <tbody>
                <tr><td>Outward</td><td><strong>Job Work</strong></td><td>Principal sends inputs / capital goods to a job worker</td></tr>
                <tr><td>Outward</td><td>SKD/CKD</td><td>Knocked-down goods in multiple vehicles under one invoice/DC (Rule 55(5))</td></tr>
                <tr><td>Outward</td><td>Line Sales</td><td>Inter-unit / branch line-sales style movement</td></tr>
                <tr><td>Outward</td><td>Recipient Not Known</td><td>Van/door-to-door dispatch; buyer not yet identified</td></tr>
                <tr><td>Outward</td><td>For Own Use</td><td>Moving own goods between own locations (not a supply)</td></tr>
                <tr><td>Outward</td><td>Exhibition or Fairs</td><td>Goods to an exhibition / fair (no supply until sold)</td></tr>
                <tr><td>Outward</td><td>Others</td><td>Any other non-supply movement</td></tr>
                <tr><td>Inward</td><td><strong>Job Work Returns</strong></td><td>Processed goods returned to the principal</td></tr>
                <tr><td>Inward</td><td>Sales Return</td><td>Goods returned on a DC (not a credit note)</td></tr>
                <tr><td>Inward</td><td>For Own Use / SKD-CKD / Exhibition / Others</td><td>Inward legs of the same non-supply reasons</td></tr>
              </tbody>
            </table>
          </div>
          <p className="cite">
            The portal cross-validates Supply-type × Sub-type × Document-type and rejects invalid pairings.
            Sources: <A href="https://docs.ewaybillgst.gov.in/apidocs/master-codes-list.html">NIC master codes</A>,
            {" "}<A href="https://cbic-gst.gov.in/pdf/circularno-38-cgst.pdf">Circular 38/12/2018</A>.
          </p>
        </section>

        <section id="txn-types" aria-labelledby="h-txn">
          <h2 id="h-txn">6. Transaction types & Bill From – Dispatch From</h2>
          <p>The portal captures four addresses in two blocks — <strong>Bill From / Dispatch From</strong> (consignor) and <strong>Bill To / Ship To</strong> (consignee). The transaction type says whether the billing party and the physical location coincide:</p>
          <div className="guide-scroll">
            <table className="guide-table">
              <thead><tr><th>Code</th><th>Type</th><th>Meaning & example</th></tr></thead>
              <tbody>
                <tr><td>1</td><td>Regular</td><td>Bill-From = Dispatch-From and Bill-To = Ship-To. Delhi seller ships from its Delhi godown to a Jaipur buyer's premises.</td></tr>
                <tr><td>2</td><td>Bill To – Ship To</td><td>Consignee side splits. Bill a Delhi trader, deliver to the trader's Chennai customer (POS fiction, s.10(1)(b) IGST Act).</td></tr>
                <tr><td>3</td><td><strong>Bill From – Dispatch From</strong></td><td>Consignor side splits. Supplier bills from its HO in one state but goods physically leave a plant/warehouse in another state.</td></tr>
                <tr><td>4</td><td>Combination</td><td>Both sides split — all four addresses differ.</td></tr>
              </tbody>
            </table>
          </div>
          <h3>Bill From – Dispatch From, in practice</h3>
          <p>
            Principal registered in State A bills the movement, but goods actually leave a plant/warehouse in
            State B, going to a job worker in State C:
          </p>
          <ul>
            <li><strong>Bill From</strong> = principal's State-A GSTIN & address (<code>fromStateCode = A</code>).</li>
            <li><strong>Dispatch From</strong> = State-B plant address + PIN (<code>actFromStateCode = B</code>, ≠ A). This is the only way the portal accepts a dispatch that physically starts in a different state from the billing GSTIN.</li>
            <li><strong>Bill To / Ship To</strong> = the job worker in State C (or the principal's own GSTIN / <code>URP</code> if the job worker is unregistered).</li>
            <li>Distance and PIN validate <strong>B→C</strong> (dispatch to delivery), not A→C. The Bill-From GSTIN stays the supplier GSTIN; tax on any underlying invoice follows the billing GSTIN + place-of-supply rules, while the dispatch-from field is for transport/route only.</li>
          </ul>
          <div className="callout tip">
            This is exactly the Bill From vs Actual Dispatch From distinction the form keeps separate. When they
            differ, the app derives the <strong>Bill From – Dispatch From</strong> transaction type for you and
            surfaces the actual dispatch PIN / state.
          </div>
          <p className="cite">
            Sources: <A href="https://docs.ewaybillgst.gov.in/apidocs/version1.03/generate-eway-bill.html">NIC generate-eway-bill API (field mapping)</A>,
            {" "}<A href="https://docs.ewaybillgst.gov.in/html/faq.html">NIC FAQ</A>.
          </p>
        </section>

        <section id="job-work" aria-labelledby="h-jw">
          <h2 id="h-jw">7. Job work, end-to-end — s.143 & Circular 38/12/2018</h2>
          <p>
            A registered <strong>principal</strong> may send inputs/capital goods to a job worker
            <strong> without payment of tax</strong> under <strong>s.143</strong>, and either bring them back or
            supply them from the job worker's premises within <strong>1 year (inputs) / 3 years (capital
            goods)</strong> — else the goods are <strong>deemed supplied</strong> on the day they were sent out.
            Moulds, dies, jigs, fixtures and tools are outside the time limit.
          </p>
          <div className="guide-scroll">
            <table className="guide-table">
              <thead><tr><th>Stage</th><th>Document</th><th>Who generates the EWB</th></tr></thead>
              <tbody>
                <tr><td>Principal → job worker</td><td>DC in triplicate (Rules 45 + 55)</td><td>Principal (or registered JW if inter-state)</td></tr>
                <tr><td>JW → another JW</td><td>DC by principal or JW, or principal's challan endorsed</td><td>Principal or the sending/registered JW</td></tr>
                <tr><td>JW → back to principal</td><td>Returned copy of the principal's challan</td><td>JW (if registered) or principal</td></tr>
                <tr><td>Supplier → JW directly</td><td>Supplier invoice naming JW as consignee (Rule 46(o)) + principal's Rule 45 challan</td><td>Principal</td></tr>
                <tr><td>Piecemeal returns</td><td>Fresh challan by the JW (original cannot be endorsed)</td><td>JW (if registered)</td></tr>
                <tr><td>Direct supply from JW premises</td><td><strong>Tax invoice</strong> by the principal</td><td>Principal</td></tr>
              </tbody>
            </table>
          </div>
          <ul>
            <li><strong>Intimation = FORM GST ITC-04</strong> filed by the principal (half-yearly if AATO &gt; ₹5 cr, else yearly). No separate letter.</li>
            <li><strong>Unregistered job worker:</strong> the principal generates the EWB (Rule 138(3) Expl. 1).</li>
            <li><strong>Direct supply from JW premises</strong> is allowed only if the principal declares the JW premises as an additional place of business, or the JW is registered.</li>
          </ul>
          <p className="cite">
            Sources: <A href="https://cbic-gst.gov.in/pdf/circularno-38-cgst.pdf">Circular 38/12/2018</A> (paras 7, 8.2–8.4, 9.4, 9.6),
            {" "}Circular 88/07/2019 (s.143 timeline extension); CGST s.143, Rules 45/55/138.
          </p>
        </section>

        <GuideCompliance onPrepare={onPrepare} />
      </div>
    </div>
  );
}


function GuideCompliance({ onPrepare }: { onPrepare: () => void }) {
  return (
    <>
        <section id="validity" aria-labelledby="h-val">
          <h2 id="h-val">8. Validity, Part B, cancellation</h2>
          <h3>Validity — Rule 138(10)</h3>
          <p>Counted from when <strong>Part B is first entered</strong>. Current slab (w.e.f. 01.01.2021):</p>
          <div className="guide-scroll">
            <table className="guide-table">
              <thead><tr><th>Cargo</th><th>Validity</th></tr></thead>
              <tbody>
                <tr><td>Other than over-dimensional</td><td><strong>1 day per 200 km</strong> (+1 day per additional 200 km or part)</td></tr>
                <tr><td>Over-dimensional / ship-multimodal</td><td>1 day per 20 km (+1 day per additional 20 km or part)</td></tr>
              </tbody>
            </table>
          </div>
          <p>Was 1 day per 100 km until Notification 94/2020-CT tightened it to 200 km from 01.01.2021. Extension is allowed within <strong>8 hours before to 8 hours after</strong> expiry (breakdown, calamity, transhipment).</p>
          <h3>Part A vs Part B</h3>
          <p><strong>Part A</strong> = consignment data (recipient GSTIN, delivery PIN, document no./date, value, HSN, transport-doc no., reason). <strong>Part B</strong> = vehicle / transport-doc number; it generates the 12-digit EBN. Part B may be skipped only for movement <strong>within the same state up to 50 km</strong> to/from the transporter; otherwise Part B must be complete before movement.</p>
          <h3>Cancellation & edits</h3>
          <ul>
            <li>Cancel within <strong>24 hours</strong> if goods not transported / not as described — but not once verified in transit (Rule 138(9)).</li>
            <li><strong>Part A is locked</strong> after generation (GSTIN, doc no./date, HSN, value cannot be edited) — cancel and regenerate to correct. Only <strong>Part B (vehicle)</strong> and validity extension are editable.</li>
            <li>Recipient/supplier can reject within <strong>72 hours</strong> or delivery, whichever is earlier — else deemed accepted.</li>
          </ul>
        </section>

        <section id="case-law" aria-labelledby="h-case">
          <h2 id="h-case">9. Case law & circulars</h2>
          <div className="case-card">
            <div className="h">Assistant Commissioner (ST) v. Satyam Shivam Papers Pvt Ltd — Supreme Court, 12.01.2022 (affirming Telangana HC)</div>
            <div className="r">Goods detained a day after the EWB expired because an agitation blocked traffic. Held: <strong>intent to evade tax cannot be presumed from mere expiry/non-extension of an EWB</strong> where the delay is explained by external factors. Intent is a fact the department must prove. Penalty quashed; ₹69,000 costs on the department upheld. The anchor authority for every "expired EWB, no intent" defence.</div>
          </div>
          <div className="case-card">
            <div className="h">Synergy Fertichem Pvt Ltd v. State of Gujarat — Gujarat HC, 23.12.2019</div>
            <div className="r">Leading exposition that <strong>s.129 (detention) and s.130 (confiscation) are independent</strong>; "with intent to evade" is decisive; mere suspicion or a technical lapse is not enough. For <strong>technical document errors</strong>, release goods on nominal penalty under <strong>s.125</strong>, not s.129.</div>
          </div>
          <div className="case-card">
            <div className="h">Minor-error line (e.g. Hindustan Herbal Cosmetics, Allahabad HC 2024)</div>
            <div className="r">A single-digit / typographical error (vehicle number, PIN) with no intent to evade does not attract s.129; courts hold <strong>Circular 64/2018 binding</strong> on the department. <span className="cite">(Some party names/citations reported by secondary sources — verify the neutral citation before formal use.)</span></div>
          </div>
          <h3>Key circulars</h3>
          <div className="guide-scroll">
            <table className="guide-table">
              <thead><tr><th>Circular</th><th>What it says</th></tr></thead>
              <tbody>
                <tr><td><strong>41/2018 & 49/2018</strong></td><td>Interception / detention / release procedure and the <strong>MOV-01 to MOV-11</strong> form series.</td></tr>
                <tr><td><strong>64/2018</strong></td><td><strong>Minor discrepancies</strong> — where invoice + EWB accompany the goods, do not invoke s.129 for 6 listed minor errors; charge a nominal ₹1,000 under s.125 instead.</td></tr>
                <tr><td><strong>76/2018</strong></td><td>If the document accompanies the goods, consignor/consignee is the <strong>deemed owner</strong> → lower s.129(1)(a) penalty. No document → higher s.129(1)(b) bracket. (Why you physically carry the invoice/DC.)</td></tr>
              </tbody>
            </table>
          </div>
          <p className="cite">
            Sources: <A href="https://cbic-gst.gov.in/pdf/Circular_64_38_Eway_Bill.pdf">Circular 64/2018</A>,
            {" "}<A href="https://cbic-gst.gov.in/pdf/circularno-41-cgst.pdf">Circular 41/2018</A>,
            {" "}<A href="https://indiankanoon.org/doc/51606643/">Synergy Fertichem</A>.
          </p>
        </section>

        <section id="checklist" aria-labelledby="h-check">
          <h2 id="h-check">10. Practical dispatch checklist</h2>
          <div className="callout tip">
            <strong>Keep the trio aligned and together:</strong> the <strong>Invoice/Delivery Challan ↔ EWB ↔ Part B</strong>
            {" "}must match on value, HSN, quantity, consignee GSTIN and the <em>actual</em> vehicle number, and the
            document must physically travel with the goods (Circular 76 → deemed owner → lower penalty).
          </div>
          <ul>
            <li>Pick the correct document first — DC only for a genuine non-supply; tax invoice for any supply / distinct-GSTIN transfer.</li>
            <li>For direct job work, show the actual job worker as consignee; keep Bill From and Actual Dispatch From separate.</li>
            <li>Serially-unique challan number (≤16 chars); exact, non-contradictory purpose.</li>
            <li>Resolved HSN (6-digit if AATO &gt; ₹5 cr), correct UQC, positive quantity and value.</li>
            <li>Complete the e-way bill and Part B before gate exit; extend before expiry if transit is delayed.</li>
            <li>Controlled triplicate copies and authorised signature; keep the work order, LR/GR and EWB PDF together.</li>
            <li>For job work, return inputs within 1 year / capital goods within 3 years (s.143) and file <strong>ITC-04</strong>.</li>
            <li>Reconcile the gate register, stock ledger, DC register, EWB and return receipt.</li>
          </ul>
          <button type="button" className="teal" onClick={onPrepare}>Prepare a challan with these controls →</button>
        </section>

        <section id="refs" aria-labelledby="h-refs">
          <h2 id="h-refs">References</h2>
          <ul>
            <li><A href="https://cbic-gst.gov.in/gst-invoice-rules.html">CBIC — invoice / delivery challan rules</A></li>
            <li><A href="https://taxinformation.cbic.gov.in/content/html/tax_repository/gst/rules/cgst_rules/active/chapter6/rule55_v1.00.html">CGST Rule 55 (delivery challan)</A></li>
            <li><A href="https://taxinformation.cbic.gov.in/content/html/tax_repository/gst/rules/cgst_rules/active/chapter16/rule138_v1.00.html">CGST Rule 138 (e-way bill)</A></li>
            <li><A href="https://cbic-gst.gov.in/pdf/circularno-38-cgst.pdf">CBIC Circular 38/12/2018 (job work)</A></li>
            <li><A href="https://docs.ewaybillgst.gov.in/html/faq.html">NIC e-way bill FAQ</A></li>
            <li><A href="https://docs.ewaybillgst.gov.in/apidocs/master-codes-list.html">NIC transaction-type / sub-type master codes</A></li>
            <li><A href="https://docs.ewaybillgst.gov.in/apidocs/version1.03/generate-eway-bill.html">NIC generate-eway-bill field mapping</A></li>
            <li><A href="https://docs.ewaybillgst.gov.in/Documents/usermanual_ewb.pdf">NIC e-way bill user manual</A></li>
          </ul>
          <p className="cite">Re-check every rule/circular against the law in force before relying on it. This guide is assistance, not advice.</p>
        </section>
    </>
  );
}