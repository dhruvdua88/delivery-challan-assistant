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
