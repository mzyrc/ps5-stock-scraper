const pupeteer = require('puppeteer');

const CHECK_EVERY_NUMBER_OF_SECONDS = 5;

(async () => {
  main();
})();

async function main() {
  const browser = await startBrowser();
  console.log('Scraping...')
  scrapeAll(browser)
  setTimeout(() => {
    main(browser);
  }, CHECK_EVERY_NUMBER_OF_SECONDS * 1000)
}

async function startBrowser() {
  try {
    return pupeteer.launch({
      headless: true,
      args: ["--disable-setuid-sandbox"],
      ignoreHTTPSErrors: true
    });
  } catch (error) {
    console.log(error);
    process.exit(-1);
  }
}

async function scrapeAll(browserInstance) {
  try {
    const page = await browserInstance.newPage();

    await page.goto('https://www.game.co.uk/playstation-5')
    await page.waitForSelector('.contentPanelWrapper');

    const productResults = await page.$$eval('.contentPanelItem', elements => {
      return elements.filter(element => {
        const productName = element.querySelector('h3').textContent;
        const productStatus = element.querySelector('.strapLine').textContent;

        return productStatus && productName === 'PlayStation 5' || productName === 'PlayStation 5 Digital Edition';
      }).map(element => {
        return {
          name: element.querySelector('h3').textContent,
          status: element.querySelector('.strapLine').textContent,
          stockStatus: element.querySelector('span').textContent
        };
      });
    });

    await browserInstance.close();

    productResults.forEach(product => {
      if (product.stockStatus !== 'Out of stock') {
        // alert
      } else {
        console.log(`${product.name} is ${product.stockStatus}`);
      }
    })

  } catch (error) {
    console.log(error);
  }
}
