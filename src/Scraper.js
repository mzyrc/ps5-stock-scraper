module.exports = class Scraper {
  constructor(browser, storeConfig, logger) {
    this.browser = browser;
    this.config = storeConfig;
    this.logger = logger;

    this.MAX_NUMBER_OF_ATTEMPTS_PER_CYCLE = 5;
  }

  async scrape(attempts = 0) {
    if (attempts === this.MAX_NUMBER_OF_ATTEMPTS_PER_CYCLE) {
      return [];
    }

    try {
      const page = await this.browser.newPage();

      await page.setCacheEnabled(false);
      await page.goto(this.config.url)
      await page.waitForSelector(this.config.keySectionClassName, {timeout: 5000});

      this.logger.info(this.config.name, 'Found the key section')

      return this.config.checkPage(page);
    } catch (error) {
      if (error.name === 'TimeoutError') {
        this.logger.error(this.config.name, 'Could not locate key section, retrying in 5 seconds ...');
        return this._delayAndScrape(5, ++attempts);
      } else {
        this.logger.error(this.config.name, error.message);
      }
    }
  }

  async _delayAndScrape(delayInSeconds, attempts = 0) {
    return new Promise((resolve, reject) => {
      setTimeout(async () => {
        try {
          const result = await this.scrape(attempts);
          resolve(result)
        } catch (error) {
          reject(error);
        }
      }, delayInSeconds * 1000);
    })
  }
}
