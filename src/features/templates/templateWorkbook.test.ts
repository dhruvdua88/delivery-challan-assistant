import { describe, it, expect } from "vitest";
import { buildTemplateWorkbook, parseTemplateWorkbook } from "./templateWorkbook";
import { emptyChallan, newItem, type DeliveryChallan } from "../../models/deliveryChallan";
import { computeGstinChecksum } from "../../gst/gstin";

const G_MH = "27ABCDE1234F1Z" + computeGstinChecksum("27ABCDE1234F1Z");

function fixture(): DeliveryChallan {
  const c = emptyChallan();
  c.movementType = "DIRECT_JOB_WORK";
  c.receiverAndPurposeApproved = true;
  c.exactPurpose = "Refurbishment, to be returned.";
  c.challanNumber = "DC/TPL/9";
  c.challanDate = "2026-07-16";
  c.placeOfSupplyStateCode = "09";
  c.billFrom = { legalName: "Example Manufacturing Private Limited", gstinOrUrp: G_MH, address: { locationName: "Plant", line1: "Road", line2: "", city: "City", district: "", pinCode: "431001", stateName: "Maharashtra", stateCode: "27" } };
  c.dispatchSameAsBillFrom = false;
  c.dispatchFrom = { locationName: "Warehouse 2", line1: "Dock Rd", line2: "", city: "Pune", district: "", pinCode: "411001", stateName: "Maharashtra", stateCode: "27" };
  c.consignee = { legalName: "Example Job Worker LLP", gstinOrUrp: "URP", address: { locationName: "Unit", line1: "Area", line2: "", city: "Noida", district: "", pinCode: "201301", stateName: "Uttar Pradesh", stateCode: "09" } };
  c.items = [
    { ...newItem(), description: "Electronic control unit", modelOrItemCode: "ECU-100", hsn: "853710", uqc: "NOS", quantity: 4, packages: 1, unitValue: 250000, remarks: "fragile" },
    { ...newItem(), description: "Power board", hsn: "850440", uqc: "PCS", quantity: 6, unitValue: 40000 },
  ];
  c.transport = { mode: "Road", vehicleNumber: "MH12AB1234", approximateDistanceKm: 1300 };
  c.jobWork = { goodsType: "INPUTS", expectedReturnDate: "2026-10-01" };
  return c;
}

describe("template workbook round-trip", () => {
  it("preserves fields and all items through export → import", async () => {
    const blob = await buildTemplateWorkbook(fixture());
    const buf = await blob.arrayBuffer();
    const file = new File([buf], "tpl.xlsx", { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
    const c = await parseTemplateWorkbook(file);

    expect(c.challanNumber).toBe("DC/TPL/9");
    expect(c.movementType).toBe("DIRECT_JOB_WORK");
    expect(c.receiverAndPurposeApproved).toBe(true);
    expect(c.dispatchSameAsBillFrom).toBe(false);
    expect(c.billFrom.gstinOrUrp).toBe(G_MH);
    expect(c.dispatchFrom.city).toBe("Pune");
    expect(c.consignee.gstinOrUrp).toBe("URP");
    expect(c.jobWork?.goodsType).toBe("INPUTS");
    expect(c.jobWork?.expectedReturnDate).toBe("2026-10-01");
    expect(c.items).toHaveLength(2);
    expect(c.items[0].description).toBe("Electronic control unit");
    expect(c.items[0].hsn).toBe("853710");
    expect(c.items[0].quantity).toBe(4);
    expect(c.items[0].unitValue).toBe(250000);
    expect(c.items[1].uqc).toBe("PCS");
    expect(c.transport.vehicleNumber).toBe("MH12AB1234");
    expect(c.transport.approximateDistanceKm).toBe(1300);
    expect(c.schemaVersion).toBe(1);
  });
});
