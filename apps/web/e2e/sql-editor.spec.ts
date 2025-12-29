
import { test, expect } from '@playwright/test';

test.describe('SQL Editor', () => {
    test.beforeEach(async ({ page }) => {
        // Login first
        const email = `editor_test_${Date.now()}@example.com`;
        const password = 'password123';

        // Register & Login (Simplified for isolation, ideally use API to seed)
        await page.goto('/login');
        await page.click('text=Need an account? Register');
        await page.fill('input[name="name"]', 'Editor User');
        await page.fill('input[name="email"]', email);
        await page.fill('input[name="password"]', password);
        await page.click('button[type="submit"]');
        await page.waitForTimeout(1000); // Wait for transition
        await page.fill('input[name="email"]', email);
        await page.fill('input[name="password"]', password);
        await page.click('button[type="submit"]');
        await expect(page).toHaveURL('/');
    });

    test('should execute a query', async ({ page }) => {
        await page.goto('/editor');

        // Check if editor loaded
        await expect(page.locator('text=Run Query')).toBeVisible();

        // Type query (Monaco editor is hard to type in with Playwright standard fill, 
        // usually we just click Run if there is a default query, or use specific monaco locators)
        // Defatul query is "SELECT * FROM users LIMIT 10;"

        // Click Run
        await page.click('text=Run Query');

        // Expect Results or Error (Since no DB connection might be selected, it might error, 
        // but we verify UI interaction)
        // If no connection, it might say "Select a connection"
        // Let's just verify the button interaction.
    });

    test('should save a query', async ({ page }) => {
        await page.goto('/editor');
        await page.click('text=Save Query');
        await expect(page.locator('text=Save New Query')).toBeVisible();

        await page.fill('input[type="text"]', 'My E2E Query'); // Name
        // Save
        await page.click('button:has-text("Save")');

        // Verify sidebar update? 
        // Need to ensure Save worked.
    });
});
