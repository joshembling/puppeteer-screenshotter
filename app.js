const puppeteer = require("puppeteer");
const fs = require("fs");
const path = require("path");

(async () => {
  const directory = "./";

  const files = await new Promise((resolve, reject) => {
    fs.readdir(directory, (err, files) => {
      if (err) reject(err);
      resolve(files);
    });
  });

  const deletions = [];
  for (const file of files) {
    if (file.endsWith(".png")) {
      deletions.push(
        new Promise((resolve, reject) => {
          fs.unlink(path.join(directory, file), (err) => {
            if (err) reject(err);
            resolve();
          });
        })
      );
    }
  }

  await Promise.all(deletions);

  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  await page.setViewport({ width: 420, height: 896 });
  await page.setUserAgent(
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_14_0) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/84.0.4147.125 Safari/537.36"
  );
  //await page.setUserAgent(
  //  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/89.0.4389.82 Safari/537.36"
  //);
  await page.goto("https://bbc.co.uk", {
    waitUntil: "networkidle0",
  });

  await page.waitForSelector("button", { timeout: 30000 });
  await page.waitForFunction(
    () => {
      return document.querySelectorAll("button") !== null;
    },
    { timeout: 30000 }
  );

  const buttons = await page.$$("button");

  for (const button of buttons) {
    const text = await page.evaluate((el) => el.textContent, button);

    if (
      text.toLowerCase().includes("accept") ||
      text.toLowerCase().includes("allow") ||
      text.toLowerCase().includes("fine") ||
      text.toLowerCase().includes("agree") ||
      text.toLowerCase().includes("got")
    ) {
      await button.click();
      break;
    }
  }

  const scrollHeight = await page.evaluate(() => {
    return document.body.scrollHeight;
  });

  const scrollStep = 896;
  const screenshotCount = Math.ceil(scrollHeight / scrollStep);

  for (let i = 0; i < 4; i++) {
    await page.evaluate(() => {
      document
        .querySelectorAll("div[id*='cookie'], div[class*='cookie']")
        .forEach((el) => {
          el.style.display = "none";
        });
    });

    await page.evaluate((scrollStep) => {
      window.scrollBy(0, scrollStep);
    }, scrollStep);

    let height = 896;
    if (i === screenshotCount - 1) {
      height = scrollHeight - scrollStep * i;
    }

    await page.screenshot({
      path: `screenshot-${i + 1}.png`,
      clip: {
        x: 0,
        y: i * scrollStep,
        width: 420,
        height: height,
      },
    });
  }

  await browser.close();
  process.exit();
})();
