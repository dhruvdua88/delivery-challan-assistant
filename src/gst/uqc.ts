// Unit Quantity Codes. Short curated set for v1 delivery challans plus the
// full GSTN UQC master so exports can carry a portal-valid code.
// GSTN-recognised UQC codes (subset commonly used; portal rejects others).
export const UQC_MASTER: { code: string; label: string }[] = [
  { code: "NOS", label: "Numbers" },
  { code: "PCS", label: "Pieces" },
  { code: "BOX", label: "Box" },
  { code: "SET", label: "Set" },
  { code: "KGS", label: "Kilograms" },
  { code: "GMS", label: "Grams" },
  { code: "TON", label: "Tonnes" },
  { code: "MTR", label: "Metres" },
  { code: "CMS", label: "Centimetres" },
  { code: "LTR", label: "Litres" },
  { code: "MLT", label: "Millilitres" },
  { code: "SQM", label: "Square metres" },
  { code: "SQF", label: "Square feet" },
  { code: "CBM", label: "Cubic metres" },
  { code: "PAC", label: "Packs" },
  { code: "BAG", label: "Bags" },
  { code: "BDL", label: "Bundles" },
  { code: "ROL", label: "Rolls" },
  { code: "PRS", label: "Pairs" },
  { code: "DOZ", label: "Dozens" },
  { code: "UNT", label: "Units" },
];

const VALID = new Set(UQC_MASTER.map((u) => u.code));

export function isValidUqc(code: string): boolean {
  return VALID.has((code || "").trim().toUpperCase());
}
