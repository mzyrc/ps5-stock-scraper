module.exports = class Asda {
  constructor() {
    this.name = 'Asda';
    this.url = 'https://direct.asda.com/george/toys-character/gaming/gaming-consoles/playstation5-console/050887006,default,pd.html';
    this.keySectionClassName = '.buying-block';
  }

  async checkPage(page) {
    return page.$$eval('.buying-block > div > button', elements => {
      return elements.filter(element => {
        return element.innerText === 'OUT OF STOCK';
      }).map(element => {
        return {
          name: 'PlayStation 5',
          stockStatus: element.innerText === 'OUT OF STOCK' ? 'Out of stock' : element.innerText
        };
      });
    });
  }
}
