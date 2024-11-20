const logger = require('../../config/logger');
const twitterScraper = require('../../config/twitter');
const ProfileScraper = require('./scrapers/profileScraper');

async function getTwitterUserDetails(username, options = { includeFollowers: true, includeFollowing: true, limit: 3 }) {
  logger.info(`Fetching Twitter user details`, { 
    username,
    includeFollowers: options.includeFollowers,
    includeFollowing: options.includeFollowing,
    limit: options.limit
  });

  let page;
  let profileScraper;
  
  try {
    logger.info(`Initializing page and scrapers`, { username });
    page = await twitterScraper.getNewPage();
    profileScraper = new ProfileScraper(page);
    
    await page.setUserAgent('Mozilla/5.0 (iPhone; CPU iPhone OS 14_7_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.1.2 Mobile/15E148 Safari/604.1');
    
    logger.info(`Navigating to user profile`, { username });
    const response = await page.goto(`https://x.com/${username}`, {
      waitUntil: ['networkidle0', 'domcontentloaded'],
      timeout: 60000
    });

    if (!response.ok()) {
      throw new Error(`Failed to load profile page: ${response.status()}`);
    }

    logger.info(`Waiting for profile content to load`, { username });
    
    // Wait for the main profile container
    await page.waitForSelector('[data-testid="primaryColumn"]', { timeout: 30000 });

    // Wait for profile information to load with multiple possible selectors
    await Promise.race([
      page.waitForSelector('[data-testid="UserProfileHeader_Items"]', { timeout: 15000 }),
      page.waitForSelector('[data-testid="UserDescription"]', { timeout: 15000 }),
      page.waitForSelector('[data-testid="UserName"]', { timeout: 15000 })
    ]);

    // Give the page a moment to fully render
    await page.waitForTimeout(2000);

    logger.info(`Extracting basic profile information`, { username });
    const userDetails = await page.evaluate(() => {
      const getTextContent = (selector) => {
        const element = document.querySelector(selector);
        return element ? element.textContent.trim() : '';
      };

      const parseCount = (text) => {
        if (!text) return 0;
        
        // Handle various number formats
        text = text.toLowerCase().trim();
        
        // Remove commas and convert to lowercase
        text = text.replace(/,/g, '').toLowerCase();
        
        // Handle "K" (thousands)
        if (text.includes('k')) {
          return Math.round(parseFloat(text.replace('k', '')) * 1000);
        }
        
        // Handle "M" (millions)
        if (text.includes('m')) {
          return Math.round(parseFloat(text.replace('m', '')) * 1000000);
        }
        
        // Handle plain numbers
        return parseInt(text.replace(/[^\d]/g, '')) || 0;
      };

      // Try multiple selectors for stats
      const getStats = () => {
        const stats = { following: 0, followers: 0 };
        
        // Try different possible selectors for following/followers
        const selectors = [
          '[href*="/following"] span',
          '[href*="/verified_followers"] span',
          '[data-testid="following_stats"] span span',
          '[data-testid="followingCount"] span'
        ];

        for (const selector of selectors) {
          const followingEl = document.querySelector(selector);
          if (followingEl) {
            stats.following = parseCount(followingEl.textContent);
            break;
          }
        }

        const followerSelectors = [
          'a[href*="/followers"] span',
          '[href*="/verified_followers"] span',
          '[data-testid="follower_stats"] span span',
          '[data-testid="followersCount"] span'
        ];

        for (const selector of followerSelectors) {
          const followersEl = document.querySelector(selector);
          if (followersEl) {
            stats.followers = parseCount(followersEl.textContent);
            break;
          }
        }

        return stats;
      };

      // Get profile information using multiple possible selectors
      const name = getTextContent('[data-testid="UserName"]') || 
                   getTextContent('[data-testid="UserNameDisplay"]');
      
      const bio = getTextContent('[data-testid="UserDescription"]') || 
                  getTextContent('[data-testid="UserBio"]');
      
      const location = getTextContent('[data-testid="UserLocation"]') || 
                      getTextContent('[data-testid="UserProfileLocation"]');
      
      const website = document.querySelector('a[data-testid="UserUrl"]')?.href || 
                     document.querySelector('a[data-testid="UserWebsite"]')?.href;

      // Get join date
      const headerItems = document.querySelector('[data-testid="UserProfileHeader_Items"]');
      const spans = headerItems ? Array.from(headerItems.querySelectorAll('span')) : [];
      const joinDate = spans.find(span => span.textContent.includes('Joined'))
        ?.textContent.replace('Joined ', '') || '';

      const stats = getStats();

      // Log the raw values for debugging
      console.log('Raw profile data:', {
        name,
        bio,
        location,
        website,
        joinDate,
        stats
      });

      return {
        name,
        username: window.location.pathname.slice(1),
        bio,
        joined: joinDate,
        website: website || `https://x.com/${window.location.pathname.slice(1)}`,
        verified: !!document.querySelector('[data-testid="UserVerifiedBadge"]'),
        location,
        stats
      };
    });

    logger.info(`Basic profile information extracted`, {
      username,
      followersCount: userDetails.stats.followers,
      followingCount: userDetails.stats.following
    });

    // Enhanced profile data collection
    const enhancedData = { ...userDetails };
    
    if (options.includeFollowers || options.includeFollowing) {
      logger.info(`Starting enhanced profile data collection`, {
        username,
        includeFollowers: options.includeFollowers,
        includeFollowing: options.includeFollowing
      });

  
      if (options.includeFollowers) {
        try {
          logger.info(`Scraping followers`, { username, limit: options.limit });
          const followers = await profileScraper.scrapeFollowers(username, options.limit);
          enhancedData.followers = followers;
          logger.info(`Successfully scraped followers`, {
            username,
            followersCount: followers.length
          });
        } catch (error) {
          logger.error(`Failed to scrape followers`, {
            username,
            error: error.message,
            stack: error.stack
          });
          enhancedData.followers = [];
        }
      }

      if (options.includeFollowing) {
        try {
          logger.info(`Scraping following`, { username, limit: options.limit });
          const following = await profileScraper.scrapeFollowing(username, options.limit);
          enhancedData.following = following;
          logger.info(`Successfully scraped following`, {
            username,
            followingCount: following.length
          });
        } catch (error) {
          logger.error(`Failed to scrape following`, {
            username,
            error: error.message,
            stack: error.stack
          });
          enhancedData.following = [];
        }
      }
    }

    logger.info(`Successfully completed profile data collection`, {
      username,
      dataCollected: Object.keys(enhancedData)
    });

    return enhancedData;

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