import { test, expect } from '@playwright/test';

    test.setTimeout(120000);
    // test.use({storageState: {"cookies":[{"domain":".gurug.com","expires":1737041480.12831,"httpOnly":false,"name":"_ga_BQX88M1CPB","path":"/","secure":false,"value":"GS1.1.1702481480.8.0.1702481480.60.0.0"},{"domain":".gurug.com","expires":1737041480.722214,"httpOnly":false,"name":"_ga","path":"/","secure":false,"value":"GA1.2.832435228.1696946692"},{"domain":".gurug.com","expires":1702567880,"httpOnly":false,"name":"_gid","path":"/","secure":false,"value":"GA1.2.2102815360.1702481481"}],"origins":[{"localStorage":[],"origin":"https://gurug.com/"}]}});

  test('Written with Testmation Recorder', async ({ browser }) => {
  // Load and set cookies for"https://gurug.com/"
  const browserContext = await browser.newContext();

  const page = await browserContext.newPage();

  await page.goto('https://gurug.com/');
  
  // Resize window to 1477 x 934
  await page.setViewportSize({ width: 1477, height: 934 });

  // Click on <nav> "Expertise Microsoft Dynam..."
  await page.click('.navbar');

  // Click on <nav> "Expertise Microsoft Dynam..."
  await page.click('.navbar');

  // Click on <nav> "Expertise Microsoft Dynam..."
  await page.click('.navbar');

  // Click on <nav> "Expertise Microsoft Dynam..."
  await page.click('.navbar');

  // Click on <div> "Innovation Right Here  Gu..."
  await page.click('.banner_top');

  // Click on <div> "Innovation Right Here  Gu..."
  await page.click('.banner_top');
});