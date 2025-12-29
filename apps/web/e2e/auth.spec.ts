
import { test, expect } from '@playwright/test';

test.describe('Authentication', () => {
    test('should redirect unauthenticated users to login', async ({ page }) => {
        await page.goto('/');
        await expect(page).toHaveURL(/.*login/);
    });

    test('should register and login a new user', async ({ page }) => {
        const email = `testuser_${Date.now()}@example.com`;
        const password = 'password123';

        await page.goto('/login');

        // Switch to Register
        await page.click('text=Need an account? Register');

        // Fill Register Form
        await page.fill('input[name="name"]', 'Test User');
        await page.fill('input[name="email"]', email);
        await page.fill('input[name="password"]', password);
        await page.fill('select[name="role"]', 'user');
        await page.click('button[type="submit"]');

        // Expect success message or redirect (Login form again)
        // Our logic switches back to login form with a success message? 
        // Wait, let's check code. It stays on page but state changes to login.
        await expect(page.locator('text=Registration successful! Please login.')).toBeVisible({ timeout: 10000 });

        // Login
        await page.fill('input[name="email"]', email);
        await page.fill('input[name="password"]', password);
        await page.click('button[type="submit"]');

        // Redirect to Dashboard
        await expect(page).toHaveURL('/');
        await expect(page.locator('text=Dashboard')).toBeVisible();
    });
});
