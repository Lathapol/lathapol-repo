import { test } from "@playwright/test";

const viewports = [
  { name: "desktop", width: 1280, height: 800 },
  { name: "tablet", width: 850, height: 1000 },
  { name: "mobile", width: 375, height: 800 },
];

test.describe("Responsive screenshots", () => {
  for (const vp of viewports) {
    test(`capture screens at ${vp.name}`, async ({ page }) => {
      await page.setViewportSize({ width: vp.width, height: vp.height });
      await page.goto("/");

      await page.getByLabel("Development Requester").selectOption({ label: "Jennifer Anderson" });
      await page.getByRole("button", { name: "Continue" }).click();
      await page.waitForSelector("h1:has-text('My Tickets')");

      await page.screenshot({ path: `artifacts/lab-02/screenshots/my-tickets/${vp.name}.png`, fullPage: true });

      await page.getByRole("button", { name: "+ Create Ticket" }).click();
      await page.waitForSelector("h1:has-text('Create Ticket')");
      await page.screenshot({ path: `artifacts/lab-02/screenshots/create-ticket/${vp.name}.png`, fullPage: true });

      await page.getByRole("button", { name: "My Tickets" }).click();
      await page.waitForSelector("h1:has-text('My Tickets')");

      const firstRowOrCard = vp.name === "mobile"
        ? page.locator("div.card.mb-2.p-3").first()
        : page.locator("table tbody tr").first();

      await firstRowOrCard.waitFor({ state: "visible", timeout: 10000 });
      await firstRowOrCard.click();
      await page.waitForSelector("text=Attachments");
      await page.screenshot({ path: `artifacts/lab-02/screenshots/ticket-detail/${vp.name}.png`, fullPage: true });
    });
  }
});
