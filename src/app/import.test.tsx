import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import App from "./App";
import { emptyChallan, type DeliveryChallan } from "../models/deliveryChallan";
import { computeGstinChecksum } from "../gst/gstin";

beforeEach(() => {
  localStorage.clear();
  URL.createObjectURL = vi.fn(() => "blob:mock");
  URL.revokeObjectURL = vi.fn();
  vi.spyOn(window, "confirm").mockReturnValue(true);
  vi.spyOn(window, "alert").mockImplementation(() => {});
});

function draftChallan(): DeliveryChallan {
  const c = emptyChallan();
  c.challanNumber = "DC/IMPORT/77";
  c.challanDate = "2026-07-16";
  c.billFrom.legalName = "Imported Co Private Limited";
  c.billFrom.gstinOrUrp = "27ABCDE1234F1Z" + computeGstinChecksum("27ABCDE1234F1Z");
  return c;
}

describe("JSON draft round-trip", () => {
  it("re-imports a saved draft and shows its values on the review preview", async () => {
    render(<App />);
    // go to the review step where Import draft JSON lives
    for (let i = 0; i < 4; i++) fireEvent.click(screen.getByText("Next →"));

    const json = JSON.stringify(draftChallan());
    const file = new File([json], "draft.json", { type: "application/json" });
    // the import <input type=file> is hidden inside the "Import draft JSON" label
    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    expect(input).toBeTruthy();
    Object.defineProperty(input, "files", { value: [file] });
    fireEvent.change(input);

    // import resets to step 1; walk back to review and confirm the number carried over
    await waitFor(() => expect(screen.getByText("Step 1 — Choose the movement")).toBeInTheDocument());
    for (let i = 0; i < 4; i++) fireEvent.click(screen.getByText("Next →"));
    await waitFor(() => expect(screen.getByText("DC/IMPORT/77")).toBeInTheDocument());
    expect(screen.getByText("Imported Co Private Limited")).toBeInTheDocument();
  });
});
