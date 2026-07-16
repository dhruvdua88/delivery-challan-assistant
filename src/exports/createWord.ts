import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  Table,
  TableRow,
  TableCell,
  WidthType,
  BorderStyle,
  AlignmentType,
  HeadingLevel,
  PageOrientation,
  ShadingType,
  VerticalAlign,
} from "docx";
import type { DeliveryChallan, Address, Party } from "../models/deliveryChallan";
import {
  grandTotal,
  lineTotal,
  totalPackages,
  totalQuantity,
} from "../models/deliveryChallan";
import { declarationFor, MOVEMENT_BY_ID } from "../gst/movementRules";
import { PALETTE, DRAFT_WATERMARK, FOOTER_LINE } from "./templates";
import { isoToDdmmyyyy, inr } from "./filenames";
import { stateNameForCode } from "../gst/states";

const NB = { style: BorderStyle.SINGLE, size: 4, color: PALETTE.border };
const CELL_BORDERS = { top: NB, bottom: NB, left: NB, right: NB };

function txt(text: string, opts: { bold?: boolean; color?: string; size?: number } = {}) {
  return new TextRun({
    text,
    bold: opts.bold,
    color: opts.color,
    size: (opts.size ?? 9) * 2, // half-points
    font: "Calibri",
  });
}

function para(runs: TextRun[], align?: (typeof AlignmentType)[keyof typeof AlignmentType]) {
  return new Paragraph({ children: runs, alignment: align, spacing: { after: 20 } });
}

function headerCell(text: string, width?: number) {
  return new TableCell({
    width: width ? { size: width, type: WidthType.PERCENTAGE } : undefined,
    shading: { type: ShadingType.CLEAR, fill: PALETTE.navy, color: "auto" },
    borders: CELL_BORDERS,
    verticalAlign: VerticalAlign.CENTER,
    margins: { top: 40, bottom: 40, left: 60, right: 60 },
    children: [para([txt(text, { bold: true, color: PALETTE.headerText, size: 8.5 })])],
  });
}

function bodyCell(runs: TextRun[], align?: (typeof AlignmentType)[keyof typeof AlignmentType], fill?: string) {
  return new TableCell({
    borders: CELL_BORDERS,
    shading: fill ? { type: ShadingType.CLEAR, fill, color: "auto" } : undefined,
    verticalAlign: VerticalAlign.CENTER,
    margins: { top: 30, bottom: 30, left: 60, right: 60 },
    children: [para(runs, align)],
  });
}

function addressLines(a: Address): string {
  const parts = [
    a.locationName,
    a.line1,
    a.line2,
    [a.city, a.district].filter(Boolean).join(", "),
    `${stateNameForCode(a.stateCode) || a.stateName || ""}${a.stateCode ? ` (${a.stateCode})` : ""}`,
    a.pinCode ? `PIN ${a.pinCode}` : "",
  ].filter(Boolean);
  return parts.join("\n");
}

function partyBlock(title: string, p: Party): Paragraph[] {
  return [
    para([txt(title, { bold: true, color: PALETTE.teal, size: 9 })]),
    para([txt(p.legalName || "-", { bold: true })]),
    para([txt(`GSTIN: ${p.gstinOrUrp || "-"}`)]),
    ...addressLines(p.address)
      .split("\n")
      .map((l) => para([txt(l)])),
  ];
}

function addrBlock(title: string, a: Address): Paragraph[] {
  return [
    para([txt(title, { bold: true, color: PALETTE.teal, size: 9 })]),
    ...addressLines(a)
      .split("\n")
      .map((l) => para([txt(l)])),
  ];
}

export async function createWord(
  c: DeliveryChallan,
  opts: { draft: boolean; companyName?: string }
): Promise<Blob> {
  const items = c.items;
  const decl = declarationFor(c.movementType);
  const move = MOVEMENT_BY_ID[c.movementType];

  const children: (Paragraph | Table)[] = [];

  // Title
  children.push(
    new Paragraph({
      heading: HeadingLevel.HEADING_1,
      alignment: AlignmentType.CENTER,
      spacing: { after: 40 },
      children: [txt(opts.companyName || "DELIVERY CHALLAN", { bold: true, color: PALETTE.navy, size: 15 })],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 60 },
      children: [txt("DELIVERY CHALLAN (Rule 55 — not a tax invoice)", { bold: true, color: PALETTE.teal, size: 10 })],
    })
  );

  if (opts.draft) {
    children.push(
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { after: 60 },
        border: { bottom: { style: BorderStyle.SINGLE, size: 12, color: PALETTE.red, space: 2 } },
        children: [txt(DRAFT_WATERMARK, { bold: true, color: PALETTE.red, size: 11 })],
      })
    );
  }

  // Meta row (number/date/copy/movement/POS)
  children.push(
    new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      rows: [
        new TableRow({
          children: [
            bodyCell([txt("DC No.: ", { bold: true }), txt(c.challanNumber || "-")], undefined, PALETTE.paleBlue),
            bodyCell([txt("Date: ", { bold: true }), txt(isoToDdmmyyyy(c.challanDate) || "-")], undefined, PALETTE.paleBlue),
            bodyCell([txt("Copy: ", { bold: true }), txt(c.copyType)], undefined, PALETTE.paleBlue),
          ],
        }),
        new TableRow({
          children: [
            bodyCell([txt("Movement: ", { bold: true }), txt(move?.label || c.movementType)]),
            bodyCell([txt("Place of Supply: ", { bold: true }), txt(`${stateNameForCode(c.placeOfSupplyStateCode) || "-"}${c.placeOfSupplyStateCode ? ` (${c.placeOfSupplyStateCode})` : ""}`)]),
            bodyCell([txt("Approval Ref: ", { bold: true }), txt(c.approvalReference || "-")]),
          ],
        }),
      ],
    })
  );
  children.push(new Paragraph({ spacing: { after: 60 }, children: [] }));

  // Bill From / Consignee side-by-side
  children.push(
    new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      rows: [
        new TableRow({
          children: [
            new TableCell({ borders: CELL_BORDERS, width: { size: 50, type: WidthType.PERCENTAGE }, children: partyBlock("BILL FROM / CONSIGNOR", c.billFrom) }),
            new TableCell({ borders: CELL_BORDERS, width: { size: 50, type: WidthType.PERCENTAGE }, children: partyBlock("CONSIGNEE / JOB WORKER", c.consignee) }),
          ],
        }),
      ],
    })
  );
  children.push(new Paragraph({ spacing: { after: 60 }, children: [] }));

  // Dispatch From (full width, always separate)
  children.push(
    new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      rows: [
        new TableRow({
          children: [new TableCell({ borders: CELL_BORDERS, children: addrBlock("ACTUAL DISPATCH FROM", c.dispatchFrom) })],
        }),
      ],
    })
  );
  // Ship To if differs
  if (!c.shipToSameAsConsignee) {
    children.push(new Paragraph({ spacing: { after: 60 }, children: [] }));
    children.push(
      new Table({
        width: { size: 100, type: WidthType.PERCENTAGE },
        rows: [new TableRow({ children: [new TableCell({ borders: CELL_BORDERS, children: addrBlock("SHIP TO / DELIVERY ADDRESS", c.shipTo) })] })],
      })
    );
  }
  children.push(new Paragraph({ spacing: { after: 60 }, children: [] }));

  // Transport + EWB
  const t = c.transport;
  const e = c.ewayBill;
  children.push(
    new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      rows: [
        new TableRow({
          children: [
            bodyCell([txt("Mode: ", { bold: true }), txt(t.mode || "-")]),
            bodyCell([txt("Transporter: ", { bold: true }), txt(t.transporterName || "-")]),
            bodyCell([txt("Vehicle: ", { bold: true }), txt(t.vehicleNumber || "-")]),
            bodyCell([txt("Distance (km): ", { bold: true }), txt(t.approximateDistanceKm ? String(t.approximateDistanceKm) : "-")]),
          ],
        }),
        new TableRow({
          children: [
            bodyCell([txt("LR/GR No.: ", { bold: true }), txt(t.lrGrNumber || "-")]),
            bodyCell([txt("EWB No.: ", { bold: true }), txt(e.number || (opts.draft ? "PENDING" : "-"), { color: e.number ? undefined : PALETTE.red, bold: !e.number })]),
            bodyCell([txt("EWB Txn: ", { bold: true }), txt(e.transactionType)]),
            bodyCell([txt("EWB Valid: ", { bold: true }), txt(e.validUntil ? isoToDdmmyyyy(e.validUntil) : "-")]),
          ],
        }),
      ],
    })
  );
  children.push(new Paragraph({ spacing: { after: 60 }, children: [] }));

  // Item table
  const itemHeader = new TableRow({
    tableHeader: true,
    children: [
      headerCell("#", 4),
      headerCell("Description / Model", 30),
      headerCell("HSN", 10),
      headerCell("UQC", 8),
      headerCell("Qty", 8),
      headerCell("Pkgs", 8),
      headerCell("Unit Value", 12),
      headerCell("Total Value", 12),
    ],
  });
  const itemRows = items.map(
    (it, i) =>
      new TableRow({
        children: [
          bodyCell([txt(String(i + 1))], AlignmentType.CENTER),
          bodyCell([txt(it.description || "-", { bold: true }), ...(it.modelOrItemCode ? [new TextRun({ break: 1 }), txt(it.modelOrItemCode, { size: 8 })] : [])]),
          bodyCell([txt(it.hsn || "-")], AlignmentType.CENTER),
          bodyCell([txt(it.uqc || "-")], AlignmentType.CENTER),
          bodyCell([txt(String(it.quantity ?? 0))], AlignmentType.RIGHT),
          bodyCell([txt(it.packages != null ? String(it.packages) : "-")], AlignmentType.RIGHT),
          bodyCell([txt(inr(it.unitValue))], AlignmentType.RIGHT),
          bodyCell([txt(inr(lineTotal(it)))], AlignmentType.RIGHT),
        ],
      })
  );
  const totalRow = new TableRow({
    children: [
      new TableCell({ borders: CELL_BORDERS, columnSpan: 4, shading: { type: ShadingType.CLEAR, fill: PALETTE.paleBlue, color: "auto" }, children: [para([txt("TOTAL", { bold: true })], AlignmentType.RIGHT)] }),
      bodyCell([txt(String(totalQuantity(items)), { bold: true })], AlignmentType.RIGHT, PALETTE.paleBlue),
      bodyCell([txt(String(totalPackages(items) || "-"), { bold: true })], AlignmentType.RIGHT, PALETTE.paleBlue),
      bodyCell([txt("", { bold: true })], AlignmentType.RIGHT, PALETTE.paleBlue),
      bodyCell([txt(inr(grandTotal(items)), { bold: true })], AlignmentType.RIGHT, PALETTE.paleBlue),
    ],
  });
  children.push(
    new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      rows: [itemHeader, ...itemRows, totalRow],
    })
  );

  // Declaration
  if (decl) {
    children.push(new Paragraph({ spacing: { before: 100, after: 40 }, children: [txt(decl, { bold: true, color: PALETTE.navy, size: 8.5 })] }));
  }
  children.push(
    new Paragraph({ spacing: { after: 20 }, children: [txt(`Exact purpose: ${c.exactPurpose || "-"}`, { size: 8.5 })] })
  );

  // Signatures
  children.push(
    new Paragraph({ spacing: { before: 200 }, children: [] }),
    new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      borders: {
        top: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
        bottom: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
        left: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
        right: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
        insideHorizontal: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
        insideVertical: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
      },
      rows: [
        new TableRow({
          children: [
            new TableCell({ borders: { top: NB, bottom: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" }, left: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" }, right: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" } }, children: [para([txt("Prepared by", { size: 8.5 })])] }),
            new TableCell({ borders: { top: NB, bottom: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" }, left: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" }, right: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" } }, children: [para([txt("Authorised Signatory", { size: 8.5 })], AlignmentType.RIGHT)] }),
          ],
        }),
      ],
    })
  );

  // Footer note
  children.push(new Paragraph({ spacing: { before: 120 }, children: [txt(FOOTER_LINE, { color: PALETTE.teal, size: 8 })] }));

  const doc = new Document({
    styles: { default: { document: { run: { font: "Calibri", size: 18 } } } },
    sections: [
      {
        properties: {
          page: {
            size: { orientation: PageOrientation.LANDSCAPE },
            margin: { top: 500, bottom: 500, left: 600, right: 600 },
          },
        },
        children,
      },
    ],
  });

  return await Packer.toBlob(doc);
}
