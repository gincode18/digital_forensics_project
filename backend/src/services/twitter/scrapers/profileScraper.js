const logger = require('../../../config/logger');

class ProfileScraper {
  constructor(page) {
    this.page = page;
  }

  async scrapeFollowers(username, limit = 5) {
    logger.info(`Starting followers scraping`, { username, limit });
    try {
      await this.page.goto(`https://twitter.com/${username}/followers`, {
        waitUntil: 'networkidle0',
        timeout: 60000
      });

      logger.info(`Waiting for follower cells to load`, { username });

      // Wait for the follower cells to load or an empty state
      await Promise.race([
        this.page.waitForSelector('[data-testid="UserCell"]', { timeout: 30000 }),
        this.page.waitForSelector('[data-testid="emptyState"]', { timeout: 30000 })
      ]);

      // Check for empty state
      const emptyState = await this.page.$('[data-testid="emptyState"]');
      if (emptyState) {
        logger.info(`No followers found`, { username });
        return [];
      }

      // Scroll and collect follower data
      const followers = await this.collectFollowerData(limit);

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

  async collectFollowerData(limit) {
    const followerData = new Set();
    let previousHeight = 0;

    while (followerData.size < limit) {
      // Extract data from currently loaded cells
      const newFollowers = await this.page.evaluate(() => {
        const followers = [];
        const cells = document.querySelectorAll('[data-testid="UserCell"]');

        cells.forEach((cell) => {
          const displayNameElement = cell.querySelector('div[dir="ltr"] span:first-child');
          const usernameElement = cell.querySelector('div[dir="ltr"] span span');
          const bioElement = cell.querySelector('div[dir="auto"]');
          const verifiedBadge = cell.querySelector('[data-testid="UserVerifiedBadge"]');

          const displayName = displayNameElement?.textContent?.trim();
          const username = usernameElement?.textContent?.replace('@', '').trim();
          const bio = bioElement?.textContent?.trim();

          if (username && displayName) {
            followers.push({
              username,
              displayName,
              bio: bio || null, // Include bio if available
              verified: !!verifiedBadge
            });
          }
        });

        return followers;
      });

      // Add new followers to the set (to remove duplicates)
      newFollowers.forEach((user) => followerData.add(JSON.stringify(user)));

      // Scroll to load more data
      const currentHeight = await this.page.evaluate(() => document.body.scrollHeight);
      if (currentHeight === previousHeight) break; // Stop if no new content loads

      previousHeight = currentHeight;
      await this.page.evaluate(() => window.scrollBy(0, window.innerHeight));
      await this.page.waitForTimeout(1000); // Delay to allow content to load
    }

    // Convert Set to array and limit the results
    return Array.from(followerData).map((user) => JSON.parse(user)).slice(0, limit);
  }


  async scrapeFollowing(username, limit = 5) {
    logger.info(`Starting following scraping`, { username, limit });
    try {
      await this.page.goto(`https://twitter.com/${username}/following`, {
        waitUntil: 'networkidle0',
        timeout: 60000
      });
  
      logger.info(`Waiting for following cells to load`, { username });
  
      // Wait for the following cells to load or an empty state
      await Promise.race([
        this.page.waitForSelector('[data-testid="UserCell"]', { timeout: 30000 }),
        this.page.waitForSelector('[data-testid="emptyState"]', { timeout: 30000 })
      ]);
  
      // Check for empty state
      const emptyState = await this.page.$('[data-testid="emptyState"]');
      if (emptyState) {
        logger.info(`No following found`, { username });
        return [];
      }
  
      // Scroll and collect following data
      const following = await this.collectFollowingData(limit);
  
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
  
  async collectFollowingData(limit) {
    const followingData = new Set();
    let previousHeight = 0;
  
    while (followingData.size < limit) {
      // Extract data from currently loaded cells
      const newFollowing = await this.page.evaluate(() => {
        const following = [];
        const cells = document.querySelectorAll('[data-testid="UserCell"]');
  
        cells.forEach((cell) => {
          const displayNameElement = cell.querySelector('div[dir="ltr"] span:first-child');
          const usernameElement = cell.querySelector('div[dir="ltr"] span span');
          const bioElement = cell.querySelector('div[dir="auto"]');
          const verifiedBadge = cell.querySelector('[data-testid="UserVerifiedBadge"]');
  
          const displayName = displayNameElement?.textContent?.trim();
          const username = usernameElement?.textContent?.replace('@', '').trim();
          const bio = bioElement?.textContent?.trim();
  
          if (username && displayName) {
            following.push({
              username,
              displayName,
              bio: bio || null, // Include bio if available
              verified: !!verifiedBadge
            });
          }
        });
  
        return following;
      });
  
      // Add new following to the set (to remove duplicates)
      newFollowing.forEach((user) => followingData.add(JSON.stringify(user)));
  
      // Scroll to load more data
      const currentHeight = await this.page.evaluate(() => document.body.scrollHeight);
      if (currentHeight === previousHeight) break; // Stop if no new content loads
  
      previousHeight = currentHeight;
      await this.page.evaluate(() => window.scrollBy(0, window.innerHeight));
      await this.page.waitForTimeout(1000); // Delay to allow content to load
    }
  
    // Convert Set to array and limit the results
    return Array.from(followingData).map((user) => JSON.parse(user)).slice(0, limit);
  }
  

  async collectUserData(limit) {
    const userData = new Set();
    let previousHeight = 0;

    while (userData.size < limit) {
      // Extract data from currently loaded cells
      const newUsers = await this.page.evaluate(() => {
        const users = [];
        const cells = document.querySelectorAll('[data-testid="cellInnerDiv"]');

        cells.forEach((cell) => {
          const usernameElement = cell.querySelector('[dir="ltr"] > span');
          const displayNameElement = cell.querySelector('[dir="ltr"]:first-child span');
          const verifiedBadge = cell.querySelector('[data-testid="UserVerifiedBadge"]');
          const username = usernameElement?.textContent?.replace('@', '').trim();
          const displayName = displayNameElement?.textContent?.trim();

          if (username && displayName) {
            users.push({
              username,
              displayName,
              verified: !!verifiedBadge
            });
          }
        });

        return users;
      });

      // Add new users to the set (to ensure uniqueness)
      newUsers.forEach((user) => userData.add(JSON.stringify(user)));

      // Scroll down
      const currentHeight = await this.page.evaluate(() => document.body.scrollHeight);
      if (currentHeight === previousHeight) break; // Stop if we can't scroll further

      previousHeight = currentHeight;
      await this.page.evaluate(() => window.scrollBy(0, window.innerHeight));
      await this.page.waitForTimeout(1000);
    }

    // Convert Set to array and limit the results
    return Array.from(userData).map((user) => JSON.parse(user)).slice(0, limit);
  }
}

module.exports = ProfileScraper;
