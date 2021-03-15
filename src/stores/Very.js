module.exports = class Very {
  constructor() {
    this.name = 'Very';
    this.url = 'https://www.very.co.uk/playstation-5-sign-up.page';
    this.keySectionClassName = '#main';
  }

  async checkPage(page) {
    return page.$$eval('.bsCell__img > img[alt="PS5 - Header"]', elements => {

      return elements.map(element => {
        const isOutOfStock = element.currentSrc === 'https://content.very.co.uk/assets/static/2020/09/events/ps5-slices/ps5-stock-coming-soon/registerinterestpage-desktop.jpg';

        return {
          name: 'PlayStation 5',
          stockStatus: isOutOfStock ? 'Out of stock' : 'Unknown'
        };
      });
    });
  }
}
