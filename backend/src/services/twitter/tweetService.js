const logger = require('../../config/logger');
const twitterScraper = require('../../config/twitter');
const TweetScraper = require('./scrapers/tweetScraper');
const ProfileScraper = require('./scrapers/profileScraper');

async function getUserTweets(username, mode, numberOfTweets) {
  // logger.info(`Fetching user tweets`, {
  //   username,
  //   mode,
  //   numberOfTweets
  // });

  // let page;
  // try {
    page = await twitterScraper.getNewPage();
    const scraper = new TweetScraper(page);
    
  //   await page.setUserAgent('Mozilla/5.0 (iPhone; CPU iPhone OS 14_7_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.1.2 Mobile/15E148 Safari/604.1');
    
  //   await page.goto(`https://twitter.com/${username}`, {
  //     waitUntil: ['networkidle0', 'domcontentloaded']
  //   });

  //   await page.waitForSelector('article[data-testid="tweet"]');

  //   let loadedTweets = new Set();
  //   let previousHeight = 0;
  //   let sameHeightCount = 0;
  //   const maxRetries = 10;
    
  //   while (loadedTweets.size < numberOfTweets && sameHeightCount < maxRetries) {
  //     const tweetElements = await page.$$('article[data-testid="tweet"]');
      
  //     for (const tweetElement of tweetElements) {
  //       const tweet = await scraper.extractTweetData(tweetElement);
  //       if (tweet.id) {
  //         loadedTweets.add(JSON.stringify(tweet));
  //       }
  //     }

  //     const currentHeight = await page.evaluate('document.documentElement.scrollHeight');
      
  //     if (currentHeight === previousHeight) {
  //       sameHeightCount++;
  //       await handleSameHeight(page);
  //     } else {
  //       sameHeightCount = 0;
  //     }

  //     previousHeight = currentHeight;
  //     await smoothScroll(page);
  //     await page.waitForTimeout(1000 + Math.random() * 1000);

  //     logger.info(`Found ${loadedTweets.size} unique tweets, target: ${numberOfTweets}`);
      
  //     if (await checkRateLimiting(page)) {
  //       logger.warn('Possible rate limiting detected');
  //       break;
  //     }
  //   }

  //   const tweets = Array.from(loadedTweets).map(tweet => JSON.parse(tweet));
    
  //   // Enhanced tweets logging and processing
  //   logger.info(`Starting enhanced data collection for ${tweets.length} tweets`);
  //   const enhancedTweets = [];
  //   for (const [index, tweet] of tweets.slice(0, numberOfTweets).entries()) {
  //     logger.info(`Processing enhanced data for tweet ${index + 1}/${numberOfTweets}`, {
  //       tweetId: tweet.id
  //     });
      
  //     try {
  //       const startTime = Date.now();
  //       const [replies, retweets] = await Promise.all([
  //         scraper.scrapeReplies(tweet.id),
  //         scraper.scrapeRetweets(tweet.id)
  //       ]);

  //       const processingTime = Date.now() - startTime;
  //       logger.info(`Enhanced data collected for tweet ${index + 1}`, {
  //         tweetId: tweet.id,
  //         repliesCount: replies.length,
  //         retweetsCount: retweets.length,
  //         processingTimeMs: processingTime
  //       });

  //       enhancedTweets.push({
  //         ...tweet,
  //         replies,
  //         retweets
  //       });
  //     } catch (error) {
  //       logger.warn(`Failed to fetch additional data for tweet ${tweet.id}`, {
  //         error: error.message,
  //         tweetIndex: index + 1
  //       });
  //       enhancedTweets.push(tweet);
  //     }
  //   }

  //   logger.info(`Successfully retrieved enhanced tweets`, {
  //     username,
  //     tweetCount: enhancedTweets.length,
  //     requestedCount: numberOfTweets
  //   });

  //   return enhancedTweets;

  // } catch (error) {
  //   logger.error(`Failed to fetch user tweets`, {
  //     username,
  //     error: error.message,
  //     stack: error.stack
  //   });
  //   throw error;
  // } finally {
  //   if (page) {
  //     await twitterScraper.closePage(page);
  //   }
  // }
  const res = await scraper.scrapeReplies("1858991588187533428");
  console.log('====================================');
  console.log(res);
  console.log('====================================');
}

async function handleSameHeight(page) {
  try {
    await page.evaluate(() => {
      const showMoreButton = Array.from(document.querySelectorAll('span')).find(
        span => span.textContent.includes('Show more tweets')
      );
      if (showMoreButton) {
        showMoreButton.click();
      }
    });
  } catch (error) {
    logger.warn('No "Show more" button found');
  }
  
  await page.evaluate(() => {
    const randomOffset = Math.floor(Math.random() * 100);
    window.scrollTo(0, document.documentElement.scrollHeight - randomOffset);
  });
}

async function smoothScroll(page) {
  await page.evaluate(async () => {
    const delay = ms => new Promise(resolve => setTimeout(resolve, ms));
    const scrollStep = 100;
    const steps = 5;
    
    for (let i = 0; i < steps; i++) {
      window.scrollBy(0, scrollStep);
      await delay(100 + Math.random() * 200);
    }
  });
}

async function checkRateLimiting(page) {
  return await page.evaluate(() => {
    return document.body.textContent.includes('Rate limit exceeded') ||
           document.body.textContent.includes('Try again later');
  });
}

module.exports = {
  getUserTweets
};