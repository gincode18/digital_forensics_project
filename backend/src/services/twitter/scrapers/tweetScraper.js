const logger = require('../../../config/logger');
const TweetParser = require('./tweetParser');

class TweetScraper {
  constructor(page) {
    this.page = page;
    this.MAX_ITEMS = 3; // Changed from 5 to 3 for faster processing
  }

  async extractTweetData(tweetElement) {
    try {
      return await tweetElement.evaluate((tweet) => {
        const getTextContent = (selector) => {
          const element = tweet.querySelector(selector);
          return element ? element.textContent.trim() : '';
        };

        const tweetText = getTextContent('[data-testid="tweetText"]');
        const timeElement = tweet.querySelector('time');
        const tweetId = tweet.querySelector('a[href*="/status/"]')
          ?.href?.match(/status\/(\d+)/)?.[1];

        // Use TweetParser methods within evaluate context
        const mediaInfo = {
          hasImage: !!tweet.querySelector('img[src*="/media/"]'),
          hasVideo: !!tweet.querySelector('[data-testid="videoPlayer"]'),
          hasGif: !!tweet.querySelector('[data-testid="gifPlayer"]'),
          hasLink: /(https?:\/\/[^\s]+)/g.test(tweet.textContent)
        };

        const tweetType = (() => {
          const isRetweet = !!tweet.querySelector('[data-testid="socialContext"]');
          const isReply = !!tweet.querySelector('[data-testid="reply"]');
          const isQuote = !!tweet.querySelector('[data-testid="quote"]');

          if (isRetweet) return 'retweet';
          if (isReply) return 'reply';
          if (isQuote) return 'quote';
          return 'original';
        })();

        const getMetricCount = (selector) => {
          const element = tweet.querySelector(`[data-testid="${selector}"] span`);
          if (!element) return 0;
          
          const text = element.textContent.toLowerCase();
          if (text.includes('k')) {
            return Math.round(parseFloat(text) * 1000);
          } else if (text.includes('m')) {
            return Math.round(parseFloat(text) * 1000000);
          }
          return parseInt(text.replace(/,/g, '')) || 0;
        };

        const metrics = {
          likes: getMetricCount('like'),
          retweets: getMetricCount('retweet'),
          comments: getMetricCount('reply'),
          quotes: getMetricCount('quote')
        };

        // Extract hashtags, mentions, and URLs
        const hashtags = (tweetText.match(/#[\w\u0590-\u05ff]+/g) || []).map(tag => tag.toLowerCase());
        const mentions = (tweetText.match(/@[\w]+/g) || []);
        const urls = (tweetText.match(/(https?:\/\/[^\s]+)/g) || []);

        return {
          id: tweetId,
          text: tweetText,
          date: timeElement ? timeElement.getAttribute('datetime') : null,
          type: tweetType,
          hashtags,
          mentions,
          urls,
          mediaInfo,
          ...metrics,
          twitter_link: tweetId ? `https://twitter.com/${window.location.pathname.slice(1)}/status/${tweetId}` : ''
        };
      });
    } catch (error) {
      logger.error('Error extracting tweet data', {
        error: error.message,
        stack: error.stack
      });
      return {};
    }
  }

  async scrapeReplies(tweetId) {
    try {
      logger.info(`Starting to scrape replies for tweet`, { tweetId });
      const startTime = Date.now();
      
      const replyPage = await this.page.browser().newPage();
      await replyPage.setUserAgent('Mozilla/5.0 (iPhone; CPU iPhone OS 14_7_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.1.2 Mobile/15E148 Safari/604.1');
      
      await replyPage.goto(`https://twitter.com/i/status/${tweetId}`, {
        waitUntil: 'networkidle0',
        timeout: 30000
      });

      await replyPage.waitForSelector('[data-testid="tweet"]', { timeout: 5000 });

      const replies = await replyPage.evaluate(() => {
        const replyElements = Array.from(document.querySelectorAll('[data-testid="tweet"]')).slice(1, 4); // Get only first 3 replies
        
        return replyElements.map(reply => {
          const text = reply.querySelector('[data-testid="tweetText"]')?.textContent || '';
          const username = reply.querySelector('[data-testid="User-Name"] a')?.textContent || '';
          const timeElement = reply.querySelector('time');
          const verified = !!reply.querySelector('[data-testid="icon-verified"]');
          
          const getLikes = () => {
            const likesElement = reply.querySelector('[data-testid="like"] span');
            if (!likesElement) return 0;
            const text = likesElement.textContent.toLowerCase();
            if (text.includes('k')) return Math.round(parseFloat(text) * 1000);
            if (text.includes('m')) return Math.round(parseFloat(text) * 1000000);
            return parseInt(text.replace(/,/g, '')) || 0;
          };

          const hashtags = (text.match(/#[\w\u0590-\u05ff]+/g) || []).map(tag => tag.toLowerCase());
          const mentions = (text.match(/@[\w]+/g) || []);

          return {
            text,
            username,
            verified,
            date: timeElement ? timeElement.getAttribute('datetime') : null,
            likes: getLikes(),
            hashtags,
            mentions
          };
        });
      });

      const topReplies = replies
        .sort((a, b) => b.likes - a.likes)
        .slice(0, this.MAX_ITEMS);

      const processingTime = Date.now() - startTime;
      logger.info(`Completed scraping replies`, {
        tweetId,
        repliesFound: replies.length,
        topRepliesReturned: topReplies.length,
        processingTimeMs: processingTime
      });

      await replyPage.close();
      return topReplies;
    } catch (error) {
      logger.error('Error scraping replies', {
        tweetId,
        error: error.message,
        stack: error.stack
      });
      return [];
    }
  }

  async scrapeRetweets(tweetId) {
    try {
      logger.info(`Starting to scrape retweets for tweet`, { tweetId });
      const startTime = Date.now();

      const retweetPage = await this.page.browser().newPage();
      await retweetPage.setUserAgent('Mozilla/5.0 (iPhone; CPU iPhone OS 14_7_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.1.2 Mobile/15E148 Safari/604.1');
      
      await retweetPage.goto(`https://twitter.com/i/status/${tweetId}/retweets`, {
        waitUntil: 'networkidle0',
        timeout: 30000
      });

      await retweetPage.waitForSelector('[data-testid="cellInnerDiv"]', { timeout: 5000 });

      const retweets = await retweetPage.evaluate(() => {
        const retweetElements = Array.from(document.querySelectorAll('[data-testid="cellInnerDiv"]')).slice(0, 3); // Get only first 3 retweets
        return retweetElements.map(retweet => {
          const username = retweet.querySelector('[data-testid="User-Name"] a')?.textContent || '';
          const displayName = retweet.querySelector('[data-testid="User-Name"] span')?.textContent || '';
          const verified = !!retweet.querySelector('[data-testid="icon-verified"]');
          const followerCount = (() => {
            const followerText = retweet.querySelector('[data-testid="UserFollowers"]')?.textContent || '';
            const num = followerText.match(/(\d+(?:\.\d+)?[KkMm]?)/)?.[1] || '0';
            if (num.match(/[Kk]$/)) return Math.round(parseFloat(num) * 1000);
            if (num.match(/[Mm]$/)) return Math.round(parseFloat(num) * 1000000);
            return parseInt(num) || 0;
          })();
          
          return {
            username,
            displayName,
            verified,
            followers: followerCount,
            retweetDate: new Date().toISOString()
          };
        });
      });

      const topRetweets = retweets
        .sort((a, b) => b.followers - a.followers)
        .slice(0, this.MAX_ITEMS);

      const processingTime = Date.now() - startTime;
      logger.info(`Completed scraping retweets`, {
        tweetId,
        retweetsFound: retweets.length,
        topRetweetsReturned: topRetweets.length,
        processingTimeMs: processingTime
      });

      await retweetPage.close();
      return topRetweets;
    } catch (error) {
      logger.error('Error scraping retweets', {
        tweetId,
        error: error.message,
        stack: error.stack
      });
      return [];
    }
  }
}

module.exports = TweetScraper;