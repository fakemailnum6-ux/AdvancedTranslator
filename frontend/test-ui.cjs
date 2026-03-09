const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch();
  const context = await browser.newContext();
  const page = await context.newPage();

  // Try loading the built static files
  await page.goto('http://localhost:5173', { waitUntil: 'networkidle' });
  await page.waitForTimeout(1000);

  // Take a screenshot to see what's actually rendering
  await page.screenshot({ path: 'debug.png', fullPage: true });

  await browser.close();
  console.log('Screenshots saved');
})();