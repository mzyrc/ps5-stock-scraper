const pupeteer = require('puppeteer');
const AWS = require('aws-sdk');
const {createLogger, format, transports} = require('winston');
const {combine, timestamp, printf, colorize} = format;
const Logger = require('./Logger');
const NotificationService = require('./notificationService');

const winstonLogger = createLogger({
  level: 'info',
  format: combine(
    colorize(),
    timestamp(),
    printf(({ level, message, label, timestamp }) => {
      return `${timestamp} [${label}] ${level}: ${message}`;
    })
  ),
  transports: [new transports.Console()]
});

const logger = new Logger(winstonLogger)

AWS.config.update({region: 'eu-west-2'});

const CHECK_EVERY_NUMBER_OF_SECONDS = 60;
const CHANNEL_ARN = 'arn:aws:sns:eu-west-2:762197375350:ps5-in-stock';
const notificationService = new NotificationService(new AWS.SNS({apiVersion: 'latest'}))

const scrapeListConfig = [
  {
    name: 'Game',
    url: 'https://www.game.co.uk/playstation-5',
    keySectionClassName: '.contentPanelWrapper',
    checkPage: async (page) => {
      return page.$$eval('.contentPanelItem', elements => {
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
    }
  },
  {
    name: 'Amazon',
    url: 'https://www.amazon.co.uk/PlayStation-9395003-5-Console/dp/B08H95Y452/ref=sr_1_1?dchild=1&keywords=ps5&qid=1615625963&sr=8-1',
    keySectionClassName: '#outOfStock',
    checkPage: async (page) => {
      return page.$$eval('#outOfStock', elements => {
        return elements.map((element) => {
          const expectedOutOfStockStatus = 'Currently unavailable';
          return {
            name: 'PlayStation 5',
            stockStatus: element.textContent.includes(expectedOutOfStockStatus) ? 'Out of stock' : 'Unknown status'
          };
        });
      })
    }
  }
];

async function main() {
  const browser = await startBrowser();
  const context = await browser.createIncognitoBrowserContext();

  for (const config of scrapeListConfig) {
    logger.info(config.name, 'Checking stock status');
    const productResults = await scrapeAll(context, config);

    if (!productResults || productResults.length === 0) {
      await notificationService.publish(`Could not derive stock status for ${config.name}`, CHANNEL_ARN);
      continue;
    }

    productResults.forEach(product => {
      if (product.stockStatus !== 'Out of stock') {
        notificationService.publish(`${product.name} is ${product.stockStatus}`, CHANNEL_ARN);
      } else {
        logger.info(config.name, `${product.name} is ${product.stockStatus}`);
      }
    })
  }

  await context.close();
  await browser.close();

  setTimeout(() => {
    main();
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

async function scrapeAll(browserInstance, config) {
  try {
    const page = await browserInstance.newPage();

    await page.setCacheEnabled(false);
    await page.goto(config.url)
    await page.waitForSelector(config.keySectionClassName);
    logger.info(config.name,'Found the key section')

    return config.checkPage(page);
  } catch (error) {
    console.log(error.name);
    console.log(error);
  }
}

main();
