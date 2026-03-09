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

  page.on('pageerror', error => {
    console.log(`UNCAUGHT ERROR: ${error.message}`);
  });

  // Try loading the built static files
  await page.goto('http://localhost:5173', { waitUntil: 'networkidle' });
  await page.waitForTimeout(2000);

  // Click demo button
  await page.getByRole('button', { name: 'Try Demo Project (UI Showcase)' }).click();
  await page.waitForTimeout(2000); // Wait for transition

  // Take a screenshot to see what's actually rendering
  await page.screenshot({ path: 'demo-view.png', fullPage: true });

  await browser.close();
  console.log('Screenshots saved');
})();