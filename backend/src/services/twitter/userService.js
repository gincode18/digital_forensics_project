const logger = require('../../config/logger');
const twitterScraper = require('../../config/twitter');

async function getTwitterUserDetails(username) {
    logger.info(`Fetching Twitter user details`, { username });
    let page;
    
    try {
      page = await twitterScraper.getNewPage();
      
      // Navigate to the profile with mobile user agent first
      await page.setUserAgent('Mozilla/5.0 (iPhone; CPU iPhone OS 14_7_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.1.2 Mobile/15E148 Safari/604.1');
      
      const response = await page.goto(`https://twitter.com/${username}`, {
        waitUntil: ['networkidle0', 'domcontentloaded'],
        // timeout: 30000
      });
  
      if (!response.ok()) {
        throw new Error(`HTTP ${response.status()} on ${username}'s profile`);
      }
  
      // Wait for key elements with increased timeout
      const selectors = [
        '[data-testid="UserName"]',
        '[data-testid="UserDescription"]',
        '[data-testid="UserProfileHeader_Items"]'
      ];
  
      for (const selector of selectors) {
        const found = await twitterScraper.waitForSelector(page, selector, 15000);
        if (!found) {
          logger.warn(`Selector not found: ${selector}`);
        }
      }
  
      // Extract user details
      const userDetails = await page.evaluate(() => {
        const getTextContent = (selector) => {
          const element = document.querySelector(selector);
          return element ? element.textContent.trim() : '';
        };
  
        const getFollowerCount = (text) => {
          if (!text) return 0;
          text = text.toLowerCase();
          if (text.includes('k')) {
            return Math.round(parseFloat(text) * 1000);
          } else if (text.includes('m')) {
            return Math.round(parseFloat(text) * 1000000);
          }
          return parseInt(text.replace(/,/g, '')) || 0;
        };
  
        const name = getTextContent('[data-testid="UserName"]');
        const bio = getTextContent('[data-testid="UserDescription"]');
        const location = getTextContent('[data-testid="UserLocation"]');
        const website = getTextContent('[data-testid="UserUrl"]');
        
        const followingText = getTextContent('[href*="/following"] span');
        const followersText = getTextContent('[href*="/followers"] span');
        
        const joinDate = getTextContent('[data-testid="UserJoinDate"]')
          .replace('Joined ', '');
  
        const verified = !!document.querySelector('[data-testid="UserVerifiedBadge"]');
  
        return {
          name,
          username: window.location.pathname.slice(1),
          bio,
          joined: joinDate,
          website: website || `https://twitter.com/${window.location.pathname.slice(1)}`,
          verified,
          location,
          stats: {
            following: getFollowerCount(followingText),
            followers: getFollowerCount(followersText)
          }
        };
      });
  
      logger.info(`Successfully retrieved user details`, { username });
      return userDetails;
  
    } catch (error) {
      logger.error(`Failed to fetch Twitter user details`, {
        username,
        error: error.message,
        stack: error.stack
      });
      throw error;
    } finally {
      if (page) {
        await twitterScraper.closePage(page);
      }
    }
  }
  

module.exports = {
  getTwitterUserDetails
};