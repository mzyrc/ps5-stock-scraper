module.exports = class WebScraper {
  constructor(browser, logger) {
    this.browser = browser;
    this.logger = logger;

    this.MAX_NUMBER_OF_ATTEMPTS_PER_CYCLE = 5;
  }

  async scrape(config, attempts = 0) {
    if (attempts === this.MAX_NUMBER_OF_ATTEMPTS_PER_CYCLE) {
      return [];
    }

    try {
      if (config.useChrome) {
        const page = await this.browser.newPage();

        await page.setCacheEnabled(false);
        await page.goto(config.url)
        await page.waitForSelector(config.keySectionClassName, {timeout: 5000});

        this.logger.info(config.name, 'Found the key section')

        return config.checkPage(page);
      } else {
        return config.checkPage();
      }
    } catch (error) {
      if (error.name === 'TimeoutError') {
        this.logger.error(config.name, 'Could not locate key section, retrying in 5 seconds ...');
        return this._delayAndScrape(config, 5, ++attempts);
      } else {
        this.logger.error(config.name, error.message);
      }
    }
  }

  async _delayAndScrape(config, delayInSeconds, attempts = 0) {
    return new Promise((resolve, reject) => {
      setTimeout(async () => {
        try {
          const result = await this.scrape(config, attempts);
          resolve(result)
        } catch (error) {
          reject(error);
        }
      }, delayInSeconds * 1000);
    })
  }
}
