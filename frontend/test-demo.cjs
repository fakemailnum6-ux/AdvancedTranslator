const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch();
  const context = await browser.newContext();
  const page = await context.newPage();

  page.on('console', msg => {
    if (msg.type() === 'error') {
      console.log(`PAGE ERROR: ${msg.text()}`);
    } else {
      console.log(`PAGE LOG: ${msg.text()}`);
    }
  });

  // Try loading the built static files on Vite's default port 5174 from the log
  await page.goto('http://localhost:5174', { waitUntil: 'networkidle' });
  await page.waitForTimeout(2000);

  // Take a screenshot of the modal to verify it shows up
  await page.screenshot({ path: 'demo-modal.png', fullPage: true });

  // Click demo button to load the new continuous editor workspace
  await page.getByRole('button', { name: 'Try Demo Project (UI Showcase)' }).click();
  await page.waitForTimeout(2000); // Wait for transition

  // Take a screenshot to see what's actually rendering in the workspace
  await page.screenshot({ path: 'demo-workspace.png', fullPage: true });

  await browser.close();
  console.log('Screenshots saved');
})();