import type { Address } from "../models/deliveryChallan";
import { STATES } from "../gst/states";

type Props = {
  value: Address;
  onChange: (a: Address) => void;
  idPrefix: string;
};

export function AddressBlock({ value, onChange, idPrefix }: Props) {
  const set = (patch: Partial<Address>) => onChange({ ...value, ...patch });
  const onState = (code: string) => {
    const name = STATES.find((s) => s.code === code)?.name || "";
    set({ stateCode: code, stateName: name });
  };
  return (
    <div className="grid">
      <div className="field">
        <label htmlFor={`${idPrefix}-loc`}>Location / plant / warehouse name</label>
        <input id={`${idPrefix}-loc`} value={value.locationName} onChange={(e) => set({ locationName: e.target.value })} placeholder="e.g. Unit 2 Warehouse" />
      </div>
      <div className="field">
        <label htmlFor={`${idPrefix}-l1`}>Address line 1</label>
        <input id={`${idPrefix}-l1`} value={value.line1} onChange={(e) => set({ line1: e.target.value })} placeholder="Building / street" />
      </div>
      <div className="field">
        <label htmlFor={`${idPrefix}-l2`}>Address line 2 <span className="ex">(optional)</span></label>
        <input id={`${idPrefix}-l2`} value={value.line2 || ""} onChange={(e) => set({ line2: e.target.value })} />
      </div>
      <div className="field">
        <label htmlFor={`${idPrefix}-city`}>City / town</label>
        <input id={`${idPrefix}-city`} value={value.city} onChange={(e) => set({ city: e.target.value })} />
      </div>
      <div className="field">
        <label htmlFor={`${idPrefix}-pin`}>PIN code</label>
        <input id={`${idPrefix}-pin`} value={value.pinCode} maxLength={6} inputMode="numeric" onChange={(e) => set({ pinCode: e.target.value.replace(/\D/g, "").slice(0, 6) })} placeholder="6 digits" />
      </div>
      <div className="field">
        <label htmlFor={`${idPrefix}-state`}>State</label>
        <select id={`${idPrefix}-state`} value={value.stateCode} onChange={(e) => onState(e.target.value)}>
          <option value="">Select state…</option>
          {STATES.map((s) => (
            <option key={s.code} value={s.code}>{s.code} — {s.name}</option>
          ))}
        </select>
      </div>
    </div>
  );
}
