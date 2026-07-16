import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, fireEvent} from "@testing-library/react";
import App from "./App";

// jsdom lacks these; stub so export click handlers don't throw.
beforeEach(() => {
  localStorage.clear();
  URL.createObjectURL = vi.fn(() => "blob:mock");
  URL.revokeObjectURL = vi.fn();
  vi.spyOn(window, "confirm").mockReturnValue(true);
  vi.spyOn(window, "alert").mockImplementation(() => {});
});

describe("<App /> smoke", () => {
  it("mounts on step 1 with the movement options", () => {
    render(<App />);
    expect(screen.getByText("Delivery Challan Assistant")).toBeInTheDocument();
    expect(screen.getByText("Step 1 — Choose the movement")).toBeInTheDocument();
    expect(screen.getByText("Direct job work")).toBeInTheDocument();
  });

  it("shows the STOP panel for own-branch different-GSTIN", () => {
    render(<App />);
    fireEvent.click(screen.getByText("Own branch transfer — different GSTIN"));
    expect(screen.getByText(/a tax invoice is generally required/i)).toBeInTheDocument();
  });

  it("navigates through all five steps", () => {
    render(<App />);
    const next = () => fireEvent.click(screen.getByText("Next →"));
    next();
    expect(screen.getByText("Step 2 — Parties and locations")).toBeInTheDocument();
    next();
    expect(screen.getByText("Step 3 — Document, goods and value")).toBeInTheDocument();
    next();
    expect(screen.getByText("Step 4 — Transport and e-way bill")).toBeInTheDocument();
    next();
    expect(screen.getByText("Step 5 — Review, validate and export")).toBeInTheDocument();
  });

  it("keeps exports disabled on the review step until blocking errors clear", () => {
    render(<App />);
    for (let i = 0; i < 4; i++) fireEvent.click(screen.getByText("Next →"));
    const wordBtn = screen.getByRole("button", { name: /Word/i });
    expect(wordBtn).toBeDisabled();
    // there should be blocking errors listed
    expect(screen.getAllByText(/blocking/i).length).toBeGreaterThan(0);
  });

  it("renders the print-like preview on the review step", () => {
    render(<App />);
    for (let i = 0; i < 4; i++) fireEvent.click(screen.getByText("Next →"));
    expect(document.getElementById("challan-print")).toBeInTheDocument();
    expect(screen.getByText("Bill From / Consignor")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Print preview/i })).toBeInTheDocument();
  });

  it("exposes a skip link and an aria-live validation status", () => {
    render(<App />);
    expect(screen.getByText("Skip to form")).toBeInTheDocument();
    for (let i = 0; i < 4; i++) fireEvent.click(screen.getByText("Next →"));
    const status = document.querySelector('[role="status"][aria-live="polite"]');
    expect(status).toBeInTheDocument();
  });

  it("uses roving tabindex on the stepper tabs", () => {
    render(<App />);
    const tabs = screen.getAllByRole("tab");
    expect(tabs[0].getAttribute("tabindex")).toBe("0");
    expect(tabs[1].getAttribute("tabindex")).toBe("-1");
    // ArrowRight on the tablist advances the selected step
    fireEvent.keyDown(tabs[0].parentElement!, { key: "ArrowRight" });
    expect(screen.getByText("Step 2 — Parties and locations")).toBeInTheDocument();
  });

  it("opens the definitive guide and shows core sections", () => {
    render(<App />);
    fireEvent.click(screen.getByRole("button", { name: /Guide/i }));
    expect(screen.getByText(/Delivery challans & e-way bills/i)).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /Which e-way bill for a delivery challan/i })).toBeInTheDocument();
    expect(screen.getAllByText(/Bill From – Dispatch From/).length).toBeGreaterThan(0);
    // back to the form
    fireEvent.click(screen.getByRole("button", { name: /Back to form/i }));
    expect(screen.getByText("Step 1 — Choose the movement")).toBeInTheDocument();
  });

  it("adds an item row in the goods step", () => {
    render(<App />);
    fireEvent.click(screen.getByText("Next →")); // step2
    fireEvent.click(screen.getByText("Next →")); // step3
    const before = screen.getAllByRole("row").length;
    fireEvent.click(screen.getByText("+ Add item"));
    const after = screen.getAllByRole("row").length;
    expect(after).toBeGreaterThan(before);
  });
});
