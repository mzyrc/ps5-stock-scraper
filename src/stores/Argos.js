const axios = require('axios');
const cheerio = require('cheerio')

module.exports = class Argos {
  constructor() {
    this.name = 'Argos';
    this.url = 'https://www.argos.co.uk/product/8349000';
    this.useChrome = false;
  }

  async checkPage() {
    const response = await axios.get(this.url);

    const $ = cheerio.load(response.data);
    const headerText = $('#h1title').text();
    const productName = 'PlayStation 5';

    return [
      {
        name: productName,
        stockStatus: headerText === 'Sorry, PlayStation®5 is currently unavailable.' ? 'Out of stock' : 'unknown'
      }
    ];
  }
}
