const path = require('path');
const fs = require('fs');
const { _electron: electron } = require('playwright');
const { test, expect } = require('playwright/test');
let electronApp;
let window;

const env = {
  TESTING: 'true',
  ...process.env
};

test.beforeEach(async () => {
  electronApp = await electron.launch({ args: ["main.js"], env: env });
  window = await electronApp.firstWindow();
});

test.afterEach(async () => {
  await electronApp.close();
});

test.describe('Launch the app', () => {
  test('Set the title, Nyao Error Logs', async () => {
    await expect(window.getByText('Nyao Error Logs')).toBeVisible();
  });
});

test.describe('Parse a log file', () => {
  test.describe('No content', () => {
    test.beforeEach(async () => {
      const filePath = path.join(__dirname, 'logs', 'error.log');
      fs.writeFileSync(filePath, '');
    });

    test('Show "No logs found." message', async () => {
      await expect(window.getByText('No logs found.')).toBeVisible();
    });
  });

  // test('Show logs correctly', async () => {
  //   // make a temporary file
  //   const filePath = path.join(__dirname, 'test-file.txt');
  //   fs.writeFileSync(filePath, 'Hello, World!');
  // });
});
