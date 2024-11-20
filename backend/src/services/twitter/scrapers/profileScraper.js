const logger = require('../../../config/logger');

class ProfileScraper {
  constructor(page) {
    this.page = page;
  }

  async scrapeFollowers(username, limit = 100) {
    logger.info(`Starting followers scraping`, { username, limit });
    try {
      await this.page.goto(`https://twitter.com/${username}/followers`, {
        waitUntil: 'networkidle0',
        timeout: 60000
      });

      logger.info(`Waiting for follower cells to load`, { username });
      
      // Wait for either the user cells or the empty state
      await Promise.race([
        this.page.waitForSelector('[data-testid="cellInnerDiv"]', { timeout: 30000 }),
        this.page.waitForSelector('[data-testid="emptyState"]', { timeout: 30000 })
      ]);

      // Check if we hit the empty state
      const emptyState = await this.page.$('[data-testid="emptyState"]');
      if (emptyState) {
        logger.info(`No followers found`, { username });
        return [];
      }

      // Wait for a brief moment to let more cells load
      await this.page.waitForTimeout(2000);

      const followers = await this.page.evaluate((maxFollowers) => {
        const followers = [];
        const cells = document.querySelectorAll('[data-testid="cellInnerDiv"]');

        for (let i = 0; i < Math.min(cells.length, maxFollowers); i++) {
          const cell = cells[i];
          
          // More specific selectors for user information
          const userNameElement = cell.querySelector('[data-testid="User-Name"]');
          const displayNameElement = userNameElement?.querySelector('div[dir="ltr"] span');
          const usernameElement = userNameElement?.querySelector('div[dir="ltr"]:last-child span');
          
          if (userNameElement) {
            followers.push({
              username: usernameElement?.textContent?.replace('@', '')?.trim(),
              displayName: displayNameElement?.textContent?.trim(),
              verified: !!cell.querySelector('[data-testid="UserVerifiedBadge"]'),
              bio: cell.querySelector('[data-testid="UserDescription"]')?.textContent?.trim(),
              location: cell.querySelector('[data-testid="UserLocation"]')?.textContent?.trim()
            });
          }
        }

        return followers.filter(f => f.username);
      }, limit);

      logger.info(`Successfully scraped followers`, {
        username,
        followersFound: followers.length,
        requestedLimit: limit
      });

      return followers;
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
    logger.info(`Starting following scraping`, { username, limit });
    try {
      await this.page.goto(`https://twitter.com/${username}/following`, {
        waitUntil: 'networkidle0',
        timeout: 60000
      });

      logger.info(`Waiting for following cells to load`, { username });
      
      // Wait for either the user cells or the empty state
      await Promise.race([
        this.page.waitForSelector('[data-testid="cellInnerDiv"]', { timeout: 30000 }),
        this.page.waitForSelector('[data-testid="emptyState"]', { timeout: 30000 })
      ]);

      // Check if we hit the empty state
      const emptyState = await this.page.$('[data-testid="emptyState"]');
      if (emptyState) {
        logger.info(`No following found`, { username });
        return [];
      }

      // Wait for a brief moment to let more cells load
      await this.page.waitForTimeout(2000);

      const following = await this.page.evaluate((maxFollowing) => {
        const following = [];
        const cells = document.querySelectorAll('[data-testid="cellInnerDiv"]');

        for (let i = 0; i < Math.min(cells.length, maxFollowing); i++) {
          const cell = cells[i];
          
          // More specific selectors for user information
          const userNameElement = cell.querySelector('[data-testid="User-Name"]');
          const displayNameElement = userNameElement?.querySelector('div[dir="ltr"] span');
          const usernameElement = userNameElement?.querySelector('div[dir="ltr"]:last-child span');
          
          if (userNameElement) {
            following.push({
              username: usernameElement?.textContent?.replace('@', '')?.trim(),
              displayName: displayNameElement?.textContent?.trim(),
              verified: !!cell.querySelector('[data-testid="UserVerifiedBadge"]'),
              bio: cell.querySelector('[data-testid="UserDescription"]')?.textContent?.trim(),
              location: cell.querySelector('[data-testid="UserLocation"]')?.textContent?.trim()
            });
          }
        }

        return following.filter(f => f.username);
      }, limit);

      logger.info(`Successfully scraped following`, {
        username,
        followingFound: following.length,
        requestedLimit: limit
      });

      return following;
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