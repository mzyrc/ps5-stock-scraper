const pupeteer = require('puppeteer');
const AWS = require('aws-sdk');
const NotificationService = require('./notificationService');

AWS.config.update({region: 'eu-west-2'});

const CHECK_EVERY_NUMBER_OF_SECONDS = 60;
const CHANNEL_ARN = 'arn:aws:sns:eu-west-2:762197375350:ps5-in-stock';
const notificationService = new NotificationService(new AWS.SNS({apiVersion: 'latest'}))

main();

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
        notificationService.publish(`${product.name} is ${product.stockStatus}`, CHANNEL_ARN);
      } else {
        console.log(`${product.name} is ${product.stockStatus}`);
      }
    })

  } catch (error) {
    console.log(error);
  }
}
