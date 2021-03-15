module.exports = class Argos {
  constructor() {
    this.name = 'Argos';
    this.url = 'https://www.argos.co.uk/browse/technology/video-games-and-consoles/ps5/ps5-consoles/c:812421/';
    this.keySectionClassName = 'a[href$=\'/product/8349000\']';
  }

  async checkPage(page) {
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
