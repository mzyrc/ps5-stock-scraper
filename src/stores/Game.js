module.exports = class Game {
  constructor() {
    this.name = 'Game';
    this.url = 'https://www.game.co.uk/playstation-5';
    this.keySectionClassName = '.contentPanelWrapper';
  }

  async checkPage(page) {
    console.log('here');
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
}
