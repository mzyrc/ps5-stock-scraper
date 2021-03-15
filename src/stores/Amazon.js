module.exports = class Amazon {
  constructor() {
    this.name = 'Amazon';
    this.url = 'https://www.amazon.co.uk/PlayStation-9395003-5-Console/dp/B08H95Y452/ref=sr_1_1?dchild=1&keywords=ps5&qid=1615625963&sr=8-1';
    this.keySectionClassName = '#outOfStock';
  }

  async checkPage(page) {
    return page.$$eval('#outOfStock', elements => {
      return elements.map((element) => {
        const expectedOutOfStockStatus = 'Currently unavailable';
        return {
          name: 'PlayStation 5',
          stockStatus: element.textContent.includes(expectedOutOfStockStatus) ? 'Out of stock' : 'Unknown status'
        };
      });
    })
  }
}
