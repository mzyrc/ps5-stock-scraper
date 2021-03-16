const pupeteer = require('puppeteer');
const AWS = require('aws-sdk');
const {createLogger, format, transports} = require('winston');
const {combine, timestamp, printf, colorize} = format;
const Logger = require('./Logger');
const NotificationService = require('./NotificationService');
const {Game, Amazon, JohnLewis, Argos, Very} = require('./stores');
const WebScraper = require('./WebScraper');
const logger = configureLogger();

AWS.config.update({region: 'eu-west-2'});

const CHECK_EVERY_NUMBER_OF_SECONDS = 60;
const CHANNEL_ARN = 'arn:aws:sns:eu-west-2:762197375350:ps5-in-stock';
const notificationService = new NotificationService(new AWS.SNS({apiVersion: 'latest'}))

async function main() {
  const browser = await startBrowser();
  const incognitoBrowser = await browser.createIncognitoBrowserContext();

  const storeList = [
    new Game(),
    new Amazon(),
    new JohnLewis(),
    new Argos(),
    new Very()
  ];

  for (const store of storeList) {
    logger.info(store.name, 'Checking stock status');
    const webScraper = new WebScraper(browser, logger);
    const productResults = await webScraper.scrape(store);

    if (!productResults || productResults.length === 0) {
      const message = `Could not derive stock status for ${store.name}`;
      logger.info(store.name, message);
      await notificationService.publish(message, CHANNEL_ARN);
      continue;
    }

    productResults.forEach(product => {
      if (product.stockStatus !== 'Out of stock') {
        const message = `${product.name} at ${store.name} is ${product.stockStatus}`
        logger.info(store.name, message);
        notificationService.publish(message, CHANNEL_ARN);
      } else {
        logger.info(store.name, `${product.name} is ${product.stockStatus}`);
      }
    });
  }

  await incognitoBrowser.close();
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
    logger.error('chromium', error.message);
  }
}

function configureLogger() {
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

  return new Logger(winstonLogger)
}

main();
