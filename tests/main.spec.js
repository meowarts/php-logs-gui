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

  test.describe('Notice content', () => {
    test.beforeEach(async () => {
      const filePath = path.join(__dirname, 'logs', 'error.log');
      fs.writeFileSync(filePath, '[01-Oct-2024 01:23:45 UTC] Test: This is the notice log. (something happened)');
    });

    test('Show logs correctly', async () => {
      await expect(window.getByText(`Test: This is the notice log. (something happened)`)).toBeVisible();
    });

    test('Set `notice` class name', async () => {
      const logContainer = await window.locator('.notice');
      await expect(logContainer).toBeVisible();
    });

    test('Hide stack trace button', async () => {
      const logContainer = await window.locator('.stackTraceButton');
      await expect(logContainer).toBeHidden()
    });
  });

  test.describe('Warning content', () => {
    test.beforeEach(async () => {
      const logData = `[01-Oct-2024 01:23:45 UTC] PHP Warning:  Undefined array key "EXAMPLE_KEY" in /Users/path/to/test.php on line 36
[01-Oct-2024 01:23:45 UTC] PHP Stack trace:
[01-Oct-2024 01:23:45 UTC] PHP   1. {main}() /Users/path/to/Local Sites/test/app/public/realtime.php:0
[01-Oct-2024 01:23:45 UTC] PHP   2. require_once() /Users/path/to/Local Sites/test/app/public/realtime.php:2
[01-Oct-2024 01:23:45 UTC] PHP   3. require_once() /Users/path/to/Local Sites/test/app/public/wp-load.php:50
[01-Oct-2024 01:23:45 UTC] PHP   4. require_once() /Users/path/to/Local Sites/test/app/public/wp-config.php:96
[01-Oct-2024 01:23:45 UTC] PHP   5. do_action($hook_name = 'init') /Users/path/to/Local Sites/test/app/public/wp-settings.php:700
[01-Oct-2024 01:23:45 UTC] PHP   6. WP_Hook->do_action($args = [0 => '']) /Users/path/to/Local Sites/test/app/public/wp-includes/plugin.php:517
[01-Oct-2024 01:23:45 UTC] PHP   7. WP_Hook->apply_filters($value = '', $args = [0 => '']) /Users/path/to/Local Sites/test/app/public/wp-includes/class-wp-hook.php:348
[01-Oct-2024 01:23:45 UTC] PHP   8. restrict_admin_access_by_ip('') /Users/path/to/Local Sites/test/app/public/wp-includes/class-wp-hook.php:324
`;
      const filePath = path.join(__dirname, 'logs', 'error.log');
      fs.writeFileSync(filePath, logData);
    });

    test('Show logs correctly', async () => {
      await expect(window.getByText(`PHP Warning: Undefined array key "EXAMPLE_KEY" in /Users/path/to/test.php on line 36`)).toBeVisible();
    });

    test('Set `warning` class name', async () => {
      const logContainer = await window.locator('.warning');
      await expect(logContainer).toBeVisible();
    });

    test('Show stack trace button', async () => {
      const logContainer = await window.locator('.stackTraceButton');
      await expect(logContainer).toBeVisible()
    });
  });

  test.describe('Error content with stack traces starting the date', () => {
    test.beforeEach(async () => {
      const logData = `[11-Sep-2024 02:34:56 UTC] PHP Fatal error:  Cannot redeclare test_function() (previously declared in /Users/path/to/test/Local Sites/test/app/public/wp-content/mu-plugins/test.php:8) in /Users/path/to/test/plugins/test-exit-intent/demo.php on line 48
[11-Sep-2024 02:34:56 UTC] PHP Stack trace:
[11-Sep-2024 02:34:56 UTC] PHP   1. {main}() /Users/path/to/test/Local Sites/test/app/public/index.php:0
[11-Sep-2024 02:34:56 UTC] PHP   2. require() /Users/path/to/test/Local Sites/test/app/public/index.php:17
[11-Sep-2024 02:34:56 UTC] PHP   3. require_once() /Users/path/to/test/Local Sites/test/app/public/wp-blog-header.php:13
[11-Sep-2024 02:34:56 UTC] PHP   4. require_once() /Users/path/to/test/Local Sites/test/app/public/wp-load.php:50
[11-Sep-2024 02:34:56 UTC] PHP   5. require_once() /Users/path/to/test/Local Sites/test/app/public/wp-config.php:96
[11-Sep-2024 02:34:56 UTC] PHP   6. do_action($hook_name = 'plugins_loaded') /Users/path/to/test/Local Sites/test/app/public/wp-settings.php:555
[11-Sep-2024 02:34:56 UTC] PHP   7. WP_Hook->do_action($args = [0 => '']) /Users/path/to/test/Local Sites/test/app/public/wp-includes/plugin.php:517
[11-Sep-2024 02:34:56 UTC] PHP   8. WP_Hook->apply_filters($value = '', $args = [0 => '']) /Users/path/to/test/Local Sites/test/app/public/wp-includes/class-wp-hook.php:348
[11-Sep-2024 02:34:56 UTC] PHP   9. test_exit_intent_init('') /Users/path/to/test/Local Sites/test/app/public/wp-includes/class-wp-hook.php:324
`;
      const filePath = path.join(__dirname, 'logs', 'error.log');
      fs.writeFileSync(filePath, logData);
    });

    test('Show logs correctly', async () => {
      await expect(window.getByText(`PHP Fatal error: Cannot redeclare test_function() (previously declared in /Users/path/to/test/Local Sites/test/app/public/wp-content/mu-plugins/test.php:8) in /Users/path/to/test/plugins/test-exit-intent/demo.php on line 48`)).toBeVisible();
    });

    test('Set `error` class name', async () => {
      const logContainer = await window.locator('.error');
      await expect(logContainer).toBeVisible();
    });

    test('Show stack trace button', async () => {
      const logContainer = await window.locator('.stackTraceButton');
      await expect(logContainer).toBeVisible()
    });
  });

  test.describe('Error content with stack traces starting the index number', () => {
    test.beforeEach(async () => {
      const logData = `[31-Aug-2024 06:54:40 UTC] PHP Fatal error:  Uncaught Error: Typed property TEST_PROPERTY::$name must not be accessed before initialization in /Users/path/to/test/plugins/sample/classes/queries/function.php:132
Stack trace:
#0 /Users/path/to/test/plugins/sample/classes/core.php(1050): TEST_PROPERTY::toJson(Object(TEST_PROPERTY))
#1 /Users/path/to/test/plugins/sample/classes/core.php(1106): TEST_APP_CORE->populate_dynamic_options(Array)
#2 /Users/path/to/test/plugins/sample/classes/core.php(1273): TEST_APP_CORE->get_all_options()
#3 /Users/path/to/test/plugins/sample/classes/modules/security.php(10): TEST_APP_CORE->get_option('banned_ips')
#4 /Users/path/to/test/plugins/sample/classes/core.php(49): Meow_MWAI_Modules_Security->__construct(Object(TEST_APP_CORE))
#5 /Users/path/to/Local Sites/test/app/public/wp-includes/class-wp-hook.php(324): TEST_APP_CORE->init('')
#6 /Users/path/to/Local Sites/test/app/public/wp-includes/class-wp-hook.php(348): WP_Hook->apply_filters(NULL, Array)
#7 /Users/path/to/Local Sites/test/app/public/wp-includes/plugin.php(517): WP_Hook->do_action(Array)
#8 /Users/path/to/Local Sites/test/app/public/wp-settings.php(555): do_action('plugins_loaded')
#9 /Users/path/to/Local Sites/test/app/public/wp-config.php(96): require_once('/Users/path/to/Loc...')
#10 /Users/path/to/Local Sites/test/app/public/wp-load.php(50): require_once('/Users/path/to/Loc...')
#11 /Users/path/to/Local Sites/test/app/public/wp-admin/admin.php(34): require_once('/Users/path/to/Loc...')
#12 {main}
  thrown in /Users/path/to/test/plugins/sample/classes/queries/function.php on line 132
`;
      const filePath = path.join(__dirname, 'logs', 'error.log');
      fs.writeFileSync(filePath, logData);
    });

    test('Show logs correctly', async () => {
      await expect(window.getByText(`PHP Fatal error: Uncaught Error: Typed property TEST_PROPERTY::$name must not be accessed before initialization in /Users/path/to/test/plugins/sample/classes/queries/function.php:132`)).toBeVisible();
    });

    test('Set `error` class name', async () => {
      const logContainer = await window.locator('.error');
      await expect(logContainer).toBeVisible();
    });

    test('Show stack trace button', async () => {
      const logContainer = await window.locator('.stackTraceButton');
      await expect(logContainer).toBeVisible()
    });
  });
});
