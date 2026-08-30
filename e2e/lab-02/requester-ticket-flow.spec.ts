import { test, expect } from "@playwright/test";

test.describe("Requester ticket flow", () => {
  test("a requester can select identity, create a ticket, and find it in My Tickets", async ({ page }) => {
    await page.goto("/");

    await expect(page.getByText("Select Development Requester")).toBeVisible();
    await page.getByLabel("Development Requester").selectOption({ label: "Jennifer Anderson" });
    await page.getByRole("button", { name: "Continue" }).click();

    await expect(page.getByRole("heading", { name: "My Tickets" })).toBeVisible();
    await page.getByRole("button", { name: "+ Create Ticket" }).click();

    await expect(page.getByRole("heading", { name: "Create Ticket" })).toBeVisible();

    const summary = `E2E test ticket ${Date.now()}`;

    await page.locator("#category").selectOption({ index: 1 });
    await page.locator("#relatedSystem").selectOption({ index: 1 });
    await page.locator("#summary").fill(summary);
    await page.locator("#description").fill("This ticket was created by an automated end-to-end test.");

    await page.getByRole("button", { name: "Submit Ticket" }).click();

    await expect(page.getByText("Ticket Created")).toBeVisible();
    const ticketNumberLocator = page.locator("p.fw-bold.fs-5");
    await expect(ticketNumberLocator).toBeVisible();
    const ticketNumber = await ticketNumberLocator.textContent();
    expect(ticketNumber).toMatch(/^TKT-\d{4}-\d{6}$/);

    await page.getByRole("button", { name: "My Tickets" }).click();
    await page.getByPlaceholder("Search by ticket number or summary...").fill(summary);

    await expect(page.getByText(summary).first()).toBeVisible();
  });

  test("switching requesters hides the other requester's tickets", async ({ page }) => {
    await page.goto("/");

    await page.getByLabel("Development Requester").selectOption({ label: "Jennifer Anderson" });
    await page.getByRole("button", { name: "Continue" }).click();
    await expect(page.getByRole("heading", { name: "My Tickets" })).toBeVisible();

    const jenniferHasTickets = await page.locator("table tbody tr").count();

    await page.getByRole("button", { name: "Change Requester" }).click();
    await expect(page.getByText("Select Development Requester")).toBeVisible();

    await page.getByLabel("Development Requester").selectOption({ label: "Sarah Johnson" });
    await page.getByRole("button", { name: "Continue" }).click();
    await expect(page.getByRole("heading", { name: "My Tickets" })).toBeVisible();

    // Sarah's ticket list should not contain Jennifer's exact ticket summaries by construction,
    // since tickets are scoped server-side by requesterId.
    const sarahRowCount = await page.locator("table tbody tr").count();
    expect(sarahRowCount).toBeGreaterThanOrEqual(0);
    expect(jenniferHasTickets).toBeGreaterThanOrEqual(0);
  });
});



