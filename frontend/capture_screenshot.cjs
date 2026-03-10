const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });

  // Navigate to the app
  await page.goto('http://localhost:5173');

  await page.click('text=Open Project');
  await page.waitForTimeout(500);
  await page.click('text=Demo Project');
  await page.waitForTimeout(1000);

  await page.screenshot({ path: 'interface_screenshot.png' });

  await browser.close();
})();
