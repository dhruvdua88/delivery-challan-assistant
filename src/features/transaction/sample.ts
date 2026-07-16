import type { DeliveryChallan } from "../../models/deliveryChallan";
import { emptyChallan, newItem } from "../../models/deliveryChallan";
import { computeGstinChecksum } from "../../gst/gstin";

// Generic, clearly-synthetic sample data for a quick demo. Not a real taxpayer:
// GSTINs are generated from the checksum algorithm on placeholder PANs.
const SAMPLE_GSTIN_MH = "27ABCDE1234F1Z" + computeGstinChecksum("27ABCDE1234F1Z");
const SAMPLE_GSTIN_UP = "09ABCDE1234F1Z" + computeGstinChecksum("09ABCDE1234F1Z");

export function sampleChallan(): DeliveryChallan {
  const c = emptyChallan();
  c.movementType = "DIRECT_JOB_WORK";
  c.receiverAndPurposeApproved = true;
  c.exactPurpose = "Repair and refurbishment of faulty control units, to be returned after processing.";
  c.approvalReference = "WO/SAMPLE/2026/044";
  c.challanNumber = "DC/SAMPLE/001";
  c.challanDate = new Date().toISOString().slice(0, 10);
  c.placeOfSupplyStateCode = "09";
  const mh = { locationName: "Unit 2 Warehouse", line1: "Warehouse Road", line2: "Example Industrial Area", city: "Aurangabad", district: "", pinCode: "431001", stateName: "Maharashtra", stateCode: "27" };
  const up = { locationName: "Job Worker Unit", line1: "Plot 14, Sector 63", line2: "", city: "Noida", district: "", pinCode: "201301", stateName: "Uttar Pradesh", stateCode: "09" };
  c.billFrom = { legalName: "Example Manufacturing Private Limited", gstinOrUrp: SAMPLE_GSTIN_MH, address: mh };
  c.dispatchFrom = { ...mh };
  c.dispatchSameAsBillFrom = true;
  c.consignee = { legalName: "Example Job Worker LLP", gstinOrUrp: SAMPLE_GSTIN_UP, address: up };
  c.shipTo = { ...up };
  c.shipToSameAsConsignee = true;
  c.jobWork = { goodsType: "INPUTS", expectedReturnDate: "" };
  c.items = [
    { ...newItem(), description: "Electronic control unit", modelOrItemCode: "ECU-100", hsn: "853710", uqc: "NOS", quantity: 4, packages: 1, unitValue: 250000 },
    { ...newItem(), description: "Power supply board", modelOrItemCode: "PSB-220", hsn: "850440", uqc: "NOS", quantity: 6, packages: 1, unitValue: 40000 },
    { ...newItem(), description: "Sensor assembly", modelOrItemCode: "SEN-07", hsn: "903149", uqc: "SET", quantity: 10, packages: 2, unitValue: 12000 },
    { ...newItem(), description: "Wiring harness", modelOrItemCode: "WH-33", hsn: "854442", uqc: "NOS", quantity: 8, packages: 1, unitValue: 9975 },
  ];
  c.transport = { mode: "Road", transporterName: "Example Logistics", vehicleNumber: "MH12AB1234", lrGrNumber: "LR-SAMPLE-1", approximateDistanceKm: 1300 };
  c.ewayBill = { transactionType: "REGULAR", number: "", generatedAt: "", validUntil: "" };
  return c;
}
