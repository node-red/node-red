import { test, expect } from '@playwright/test';

    test.setTimeout(120000);
    test.use({storageState: {"cookies":[{"domain":"www.nu.edu.pk","httpOnly":true,"name":"ASP.NET_SessionId","path":"/","secure":false,"value":"r0yuuoulndwxkanx4teuygyu"}],"origins":[{"localStorage":[],"origin":"https://www.nu.edu.pk/#"}]}});

  test('Written with Testmation Recorder', async ({ browser }) => {
  // Load and set cookies for"https://www.nu.edu.pk/#"
  const browserContext = await browser.newContext();

  const page = await browserContext.newPage();

  await page.goto('https://www.nu.edu.pk/#');

  // Resize window to 1078 x 712
  await page.setViewportSize({ width: 1078, height: 712 });

  // Click on <a> "Home"
  await page.click('[href="/Home"]');

  // Click on <a> "Home"
  await Promise.all([
    page.click('[href="/Home"]'),
    page.waitForLoadState()
  ]);

  // Click on <a> "Admissions"
  await Promise.all([
    page.click('.nav-links > .dropdown:nth-child(2) > [href="#"]'),
    page.waitForLoadState()
  ]);

  // Click on <a> "Offered Programs"
  await Promise.all([
    page.click('[href="/Degree-Programs"]:nth-child(1)'),
    page.waitForLoadState()
  ]);

  // Click on <a> "Home"
  await Promise.all([
    page.click('[href="/Home"]'),
    page.waitForLoadState()
  ]);

  // Scroll wheel by X:0, Y:194
  await page.mouse.wheel(0, 194);

  // Scroll wheel by X:0, Y:-162
  await page.mouse.wheel(0, -162);

  // Scroll wheel by X:0, Y:0
  await page.mouse.wheel(0, 0);

  // Scroll wheel by X:0, Y:-85
  await page.mouse.wheel(0, -85);

  // Scroll wheel by X:0, Y:0
  await page.mouse.wheel(0, 0);

  // Scroll wheel by X:0, Y:-132
  await page.mouse.wheel(0, -132);

  // Scroll wheel by X:0, Y:0
  await page.mouse.wheel(0, 0);

  // Click on <div> .group-btn-slider > .btn-next
  await page.click('.group-btn-slider > .btn-next');

  // Click on <div> .group-btn-slider > .btn-next
  await page.click('.group-btn-slider > .btn-next');
});