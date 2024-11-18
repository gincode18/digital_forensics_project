const logger = require('../../config/logger');
const twitterScraper = require('../../config/twitter');

async function getUserTweets(username, mode, numberOfTweets) {
  logger.info(`Fetching user tweets`, {
    username,
    mode,
    numberOfTweets
  });

  let page;
  try {
    page = await twitterScraper.getNewPage();
    
    await page.setUserAgent('Mozilla/5.0 (iPhone; CPU iPhone OS 14_7_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.1.2 Mobile/15E148 Safari/604.1');
    
    await page.goto(`https://twitter.com/${username}`, {
      waitUntil: ['networkidle0', 'domcontentloaded']
    });

    await page.waitForSelector('article[data-testid="tweet"]');

    let loadedTweets = new Set();
    let previousHeight = 0;
    let sameHeightCount = 0;
    const maxRetries = 10;
    
    while (loadedTweets.size < numberOfTweets && sameHeightCount < maxRetries) {
      const newTweets = await extractTweets(page);
      
      newTweets.forEach(tweet => {
        if (tweet.id) {
          loadedTweets.add(JSON.stringify(tweet));
        }
      });

      const currentHeight = await page.evaluate('document.documentElement.scrollHeight');
      
      if (currentHeight === previousHeight) {
        sameHeightCount++;
        await handleSameHeight(page);
      } else {
        sameHeightCount = 0;
      }

      previousHeight = currentHeight;
      await smoothScroll(page);
      await page.waitForTimeout(1000 + Math.random() * 1000);

      logger.info(`Found ${loadedTweets.size} unique tweets, target: ${numberOfTweets}`);
      
      if (await checkRateLimiting(page)) {
        logger.warn('Possible rate limiting detected');
        break;
      }
    }

    const uniqueTweets = Array.from(loadedTweets).map(tweet => JSON.parse(tweet));
    
    logger.info(`Successfully retrieved tweets`, {
      username,
      tweetCount: uniqueTweets.length,
      requestedCount: numberOfTweets
    });

    return uniqueTweets.slice(0, numberOfTweets);

  } catch (error) {
    logger.error(`Failed to fetch user tweets`, {
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

async function extractTweets(page) {
  return await page.evaluate(() => {
    const tweets = Array.from(document.querySelectorAll('article[data-testid="tweet"]'));
    return tweets.map(tweet => {
      const getTextContent = (selector) => {
        const element = tweet.querySelector(selector);
        return element ? element.textContent.trim() : '';
      };

      const getMetricCount = (text) => {
        if (!text) return 0;
        text = text.toLowerCase();
        if (text.includes('k')) {
          return Math.round(parseFloat(text) * 1000);
        } else if (text.includes('m')) {
          return Math.round(parseFloat(text) * 1000000);
        }
        return parseInt(text.replace(/,/g, '')) || 0;
      };

      const tweetText = getTextContent('[data-testid="tweetText"]');
      const timeElement = tweet.querySelector('time');
      const tweetId = tweet.querySelector('a[href*="/status/"]')
        ?.href?.match(/status\/(\d+)/)?.[1];

      const likesText = getTextContent('[data-testid="like"] span');
      const retweetsText = getTextContent('[data-testid="retweet"] span');
      const repliesText = getTextContent('[data-testid="reply"] span');

      return {
        id: tweetId,
        text: tweetText,
        date: timeElement ? timeElement.getAttribute('datetime') : null,
        likes: getMetricCount(likesText),
        retweets: getMetricCount(retweetsText),
        comments: getMetricCount(repliesText),
        twitter_link: tweetId ? `https://twitter.com/${window.location.pathname.slice(1)}/status/${tweetId}` : ''
      };
    });
  });
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