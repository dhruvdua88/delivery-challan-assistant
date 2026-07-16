// Date formatting and export filename helpers.

export function isoToDdmmyyyy(iso: string): string {
  if (!iso) return "";
  // Accept yyyy-mm-dd or a Date-parseable string.
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso);
  if (m) return `${m[3]}/${m[2]}/${m[1]}`;
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  return `${dd}/${mm}/${d.getFullYear()}`;
}

export function isoToDashDdmmyyyy(iso: string): string {
  return isoToDdmmyyyy(iso).replace(/\//g, "-");
}

function safe(s: string): string {
  return (s || "DC").replace(/[^A-Za-z0-9_\-]+/g, "_").slice(0, 40) || "DC";
}

export function wordFileName(dcNumber: string, iso: string): string {
  return `Delivery_Challan_${safe(dcNumber)}_${isoToDashDdmmyyyy(iso) || "date"}.docx`;
}

export function excelFileName(dcNumber: string, iso: string): string {
  return `Delivery_Challan_${safe(dcNumber)}_${isoToDashDdmmyyyy(iso) || "date"}.xlsx`;
}

export function jsonFileName(dcNumber: string, iso: string): string {
  return `Delivery_Challan_${safe(dcNumber)}_${isoToDashDdmmyyyy(iso) || "date"}.json`;
}

export function inr(n: number): string {
  return (Number(n) || 0).toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}
