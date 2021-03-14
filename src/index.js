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
    printf(({level, message, label, timestamp}) => {
      return `${timestamp} [${label}] ${level}: ${message}`;
    })
  ),
  transports: [new transports.Console()]
});

const logger = new Logger(winstonLogger)

AWS.config.update({region: 'eu-west-2'});

const CHECK_EVERY_NUMBER_OF_SECONDS = 60;
const MAX_NUMBER_OF_ATTEMPTS_PER_CYCLE = 5;
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
  },
  {
    name: 'John Lewis',
    url: 'https://www.johnlewis.com/',
    keySectionClassName: '.pecr-cookie-banner-content__buttons-pG9aE',
    checkPage: async (page) => {
      await page.click('.c-button-yMKB7'); // accept cookies
      await page.goto('https://www.johnlewis.com/search?search-term=playstation%205');

      return page.$$eval('.product-card_c-product-card__container__38Nrq', elements => {
        return elements.filter((element) => {
          const productTitle = element.querySelector('h2')
          return productTitle.textContent === 'Sony PlayStation 5 Console with DualSense Controller'
        }).map(element => {
          return {
            name: element.querySelector('h2').textContent,
            stockStatus: element.querySelector('.info-section_c-product-card__section__2D2D- > p').textContent
          };
        });
      });
    }
  },
  {
    name: 'Argos',
    url: 'https://www.argos.co.uk/browse/technology/video-games-and-consoles/ps5/ps5-consoles/c:812421/',
    keySectionClassName: 'a[href$=\'/product/8349000\']',
    checkPage: async (page) => {
      const response = await page.goto('https://www.argos.co.uk/product/8349000');

      const url = page.url();
      const productName = 'PlayStation 5';

      if (response._status === 200 && url === 'https://www.argos.co.uk/vp/oos/ps5.html') {
        return [{
          name: productName,
          stockStatus: 'Out of stock'
        }]
      } else {
        return [{
          name: productName,
          stockStatus: 'unknown'
        }]
      }
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
      const message = `Could not derive stock status for ${config.name}`;
      logger.info(config.name, message);
      await notificationService.publish(message, CHANNEL_ARN);
      continue;
    }

    productResults.forEach(product => {
      if (product.stockStatus !== 'Out of stock') {
        const message = `${product.name} at ${config.name} is ${product.stockStatus}`
        logger.info(config.name, message);
        notificationService.publish(message, CHANNEL_ARN);
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
      headless: false,
      args: ["--disable-setuid-sandbox"],
      ignoreHTTPSErrors: true
    });
  } catch (error) {
    logger.error('chromium', error.message);
  }
}

async function scrapeAll(browserInstance, config, attempts = 0) {
  if (attempts === MAX_NUMBER_OF_ATTEMPTS_PER_CYCLE) {
    return [];
  }

  try {
    const page = await browserInstance.newPage();

    await page.setCacheEnabled(false);
    await page.goto(config.url)
    await page.waitForSelector(config.keySectionClassName, {timeout: 5000});

    logger.info(config.name, 'Found the key section')

    return config.checkPage(page);
  } catch (error) {
    if (error.name === 'TimeoutError') {
      logger.error(config.name, 'Could not locate key section, retrying in 5 seconds ...');
      return delayAndScrape(browserInstance, config, 5, ++attempts);
    } else {
      logger.error(config.name, error.message);
    }
  }
}

async function delayAndScrape(browserInstance, config, delayInSeconds, attempts = 0) {
  return new Promise((resolve, reject) => {
    setTimeout(async () => {
      try {
        const result = await scrapeAll(browserInstance, config, attempts);
        resolve(result)
      } catch (error) {
        reject(error);
      }
    }, delayInSeconds * 1000);
  })
}

main();
