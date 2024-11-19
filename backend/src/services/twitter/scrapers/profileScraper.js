const logger = require('../../../config/logger');

class ProfileScraper {
  constructor(page) {
    this.page = page;
  }

  async scrapeFollowers(username, limit = 100) {
    try {
      await this.page.goto(`https://twitter.com/${username}/followers`, {
        waitUntil: 'networkidle0'
      });

      await this.page.waitForSelector('[data-testid="cellInnerDiv"]');

      return await this.page.evaluate((maxFollowers) => {
        const followers = [];
        const cells = document.querySelectorAll('[data-testid="cellInnerDiv"]');

        for (let i = 0; i < Math.min(cells.length, maxFollowers); i++) {
          const cell = cells[i];
          const userElement = cell.querySelector('[data-testid="User-Name"]');
          
          followers.push({
            username: userElement?.querySelector('a')?.textContent,
            displayName: userElement?.querySelector('span')?.textContent,
            verified: !!cell.querySelector('[data-testid="icon-verified"]'),
            bio: cell.querySelector('[data-testid="UserDescription"]')?.textContent,
            location: cell.querySelector('[data-testid="UserLocation"]')?.textContent
          });
        }

        return followers.filter(f => f.username);
      }, limit);
    } catch (error) {
      logger.error('Error scraping followers', {
        username,
        error: error.message,
        stack: error.stack
      });
      return [];
    }
  }

  async scrapeFollowing(username, limit = 100) {
    try {
      await this.page.goto(`https://twitter.com/${username}/following`, {
        waitUntil: 'networkidle0'
      });

      await this.page.waitForSelector('[data-testid="cellInnerDiv"]');

      return await this.page.evaluate((maxFollowing) => {
        const following = [];
        const cells = document.querySelectorAll('[data-testid="cellInnerDiv"]');

        for (let i = 0; i < Math.min(cells.length, maxFollowing); i++) {
          const cell = cells[i];
          const userElement = cell.querySelector('[data-testid="User-Name"]');
          
          following.push({
            username: userElement?.querySelector('a')?.textContent,
            displayName: userElement?.querySelector('span')?.textContent,
            verified: !!cell.querySelector('[data-testid="icon-verified"]'),
            bio: cell.querySelector('[data-testid="UserDescription"]')?.textContent,
            location: cell.querySelector('[data-testid="UserLocation"]')?.textContent
          });
        }

        return following.filter(f => f.username);
      }, limit);
    } catch (error) {
      logger.error('Error scraping following', {
        username,
        error: error.message,
        stack: error.stack
      });
      return [];
    }
  }
}

module.exports = ProfileScraper;