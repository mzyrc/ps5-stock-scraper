const axios = require('axios');
const cheerio = require('cheerio');

module.exports = class Very {
  constructor() {
    this.name = 'Very';
    this.url = 'https://www.very.co.uk/playstation-5-sign-up.page';
    this.useChrome = false;
  }

  async checkPage() {
    const response = await axios.get(this.url)

    const $ = cheerio.load(response.data);
    const stockComingSoonImgURL = $('.bsCell__img > img[alt="PS5 - Header"]').attr('data-src')

    return [
      {
        name: 'PlayStation 5',
        stockStatus: stockComingSoonImgURL === 'https://content.very.co.uk/assets/static/2020/09/events/ps5-slices/ps5-stock-coming-soon/registerinterestpage-desktop.jpg' ? 'Out of stock': 'unknown'
      }
    ];
  }
}
