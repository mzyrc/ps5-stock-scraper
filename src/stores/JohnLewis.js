module.exports = class JohnLewis {
  constructor() {
    this.name = 'John Lewis';
    this.url = 'https://www.johnlewis.com/';
    this.keySectionClassName = '.pecr-cookie-banner-content__buttons-pG9aE';
    this.useChrome = true;
  }

  async checkPage(page) {
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
}
