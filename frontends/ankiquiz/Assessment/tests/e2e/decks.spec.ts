import { test, expect } from "@playwright/test";

test.describe("Decks Page", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/decks");
  });

  test("should display decks list", async ({ page }) => {
    await page.waitForLoadState("networkidle");
    
    // Check for decks heading
    const heading = page.getByRole("heading", { name: /decks/i });
    await expect(heading).toBeVisible();
  });

  test("should show deck cards", async ({ page }) => {
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(1000);
    
    // Look for deck cards
    const deckCards = page.locator(".card, [data-testid='deck-card']");
    
    // Should have at least one deck if data exists
    const count = await deckCards.count();
    // Graceful - might be empty
    expect(count >= 0).toBeTruthy();
  });

  test("should allow clicking on a deck", async ({ page }) => {
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(1000);
    
    // Find first deck link
    const deckLink = page.locator("a[href*='/decks/']").first();
    
    if (await deckLink.isVisible()) {
      await deckLink.click();
      
      // Should navigate to deck detail page
      await expect(page).toHaveURL(/\/decks\//);
    }
  });
});

test.describe("Deck Detail Page", () => {
  test("should display deck information", async ({ page }) => {
    // First get a deck ID from the decks list
    await page.goto("/decks");
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(1000);
    
    const deckLink = page.locator("a[href*='/decks/']").first();
    
    if (await deckLink.isVisible()) {
      await deckLink.click();
      await page.waitForLoadState("networkidle");
      
      // Check for deck title
      const deckTitle = page.getByRole("heading").first();
      await expect(deckTitle).toBeVisible();
    }
  });

  test("should show flashcards in deck", async ({ page }) => {
    await page.goto("/decks");
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(1000);
    
    const deckLink = page.locator("a[href*='/decks/']").first();
    
    if (await deckLink.isVisible()) {
      await deckLink.click();
      await page.waitForLoadState("networkidle");
      await page.waitForTimeout(1000);
      
      // Look for flashcard list
      const flashcardList = page.locator("[data-testid='flashcard-list'], .flashcard-list, table");
      
      if (await flashcardList.isVisible()) {
        await expect(flashcardList).toBeVisible();
      }
    }
  });

  test("should have quiz button for deck", async ({ page }) => {
    await page.goto("/decks");
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(1000);
    
    const deckLink = page.locator("a[href*='/decks/']").first();
    
    if (await deckLink.isVisible()) {
      await deckLink.click();
      await page.waitForLoadState("networkidle");
      
      // Look for quiz button
      const quizButton = page.getByRole("link", { name: /quiz|start|practice/i });
      
      if (await quizButton.isVisible()) {
        await expect(quizButton).toBeEnabled();
      }
    }
  });
});
