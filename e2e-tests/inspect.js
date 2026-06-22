const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  
  await page.goto('http://localhost:8080/');
  await page.waitForLoadState('networkidle');
  await page.screenshot({ path: 'jenkins_home.png' });

  await page.goto('http://localhost:8080/newJob');
  await page.waitForLoadState('networkidle');
  await page.screenshot({ path: 'jenkins_newJob.png' });

  await browser.close();
})();
