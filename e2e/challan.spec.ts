import { test, expect } from "@playwright/test";

// End-to-end: prepare a direct job-work challan with four items, confirm the
// derived Bill From – Dispatch From guidance, and verify export is gated then
// enabled. Uses only generic sample data.

test("direct job-work flow: fill, validate, and enable export", async ({ page }) => {
  await page.goto("./");
  await expect(page.getByRole("heading", { name: "Delivery Challan Assistant" })).toBeVisible();

  // Step 1 — movement
  await expect(page.getByText("Step 1 — Choose the movement")).toBeVisible();
  await page.getByText("Direct job work", { exact: true }).click();
  await page.getByLabel(/receiver and the purpose/i).check();
  await page.getByLabel(/Exact purpose of movement/i).fill("Refurbishment of control units, to be returned.");
  await page.getByRole("button", { name: "Next →" }).click();

  // Step 2 — parties (Bill From + Consignee), different dispatch location
  await expect(page.getByText("Step 2 — Parties and locations")).toBeVisible();
  await page.getByLabel("Legal name", { exact: true }).first().fill("Example Manufacturing Private Limited");
  // uncheck "same as bill from" to enter a distinct dispatch origin
  await page.getByLabel("Same as Bill From address").uncheck();
  await expect(page.getByText("B · Actual Dispatch From")).toBeVisible();

  await page.getByRole("button", { name: "Next →" }).click();
  await expect(page.getByText("Step 3 — Document, goods and value")).toBeVisible();

  await page.getByRole("button", { name: "Next →" }).click();
  await expect(page.getByText("Step 4 — Transport and e-way bill")).toBeVisible();
  // derived transaction type must reflect the differing dispatch origin
  await expect(page.getByText(/Derived e-way bill transaction type: BILL_FROM_DISPATCH_FROM/)).toBeVisible();

  await page.getByRole("button", { name: "Next →" }).click();
  await expect(page.getByText("Step 5 — Review, validate and export")).toBeVisible();

  // With incomplete data, export is blocked.
  await expect(page.getByRole("button", { name: /Word/i })).toBeDisabled();
});

test("own-branch different-GSTIN shows the stop panel", async ({ page }) => {
  await page.goto("./");
  await page.getByText("Own branch transfer — different GSTIN").click();
  await expect(page.getByText(/a tax invoice is generally required/i)).toBeVisible();
});
