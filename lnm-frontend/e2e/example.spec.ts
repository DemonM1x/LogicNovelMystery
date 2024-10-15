import { test, expect } from '@playwright/test';

test.describe('Example e2e Test Suite', () => {

    test('Home page loads with correct title', async ({ page }) => {
        await page.goto('http://localhost:5173');  // URL вашего фронтенда
        await expect(page).toHaveTitle("Vite + React + TS");  // Проверка заголовка страницы
    });

    test('User can log in', async ({ page }) => {
        await page.goto('http://localhost:5173');  // Путь к странице входа
        await page.fill('input[name="login"]', 'test_user');
        await page.fill('input[name="password"]', 'password123');
        await page.click('button[type="submit"]');
        // await expect(page).toHaveURL('http://localhost:3000/dashboard');  // Проверка перехода на dashboard
    });
});
