const PDFDocument = require('pdfkit');
const fs = require('fs');
const logger = require('../config/logger');
const twitterScraper = require('../config/twitter');
const forensicsAnalyzer = require('./forensics');
const moment = require('moment');

async function getTwitterUserDetails(username) {
  logger.info(`Fetching Twitter user details`, { username });
  let page;
  
  try {
    page = await twitterScraper.getNewPage();
    
    // Navigate to the profile with mobile user agent first
    await page.setUserAgent('Mozilla/5.0 (iPhone; CPU iPhone OS 14_7_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.1.2 Mobile/15E148 Safari/604.1');
    
    const response = await page.goto(`https://twitter.com/${username}`, {
      waitUntil: ['networkidle0', 'domcontentloaded'],
      timeout: 30000
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

// Rest of the twitter.js file remains the same
async function getUserTweets(username, mode, numberOfTweets) {
  logger.info(`Fetching user tweets`, {
    username,
    mode,
    numberOfTweets
  });

  let page;
  try {
    page = await twitterScraper.getNewPage();
    await page.goto(`https://twitter.com/${username}`, {
      waitUntil: ['networkidle0', 'domcontentloaded'],
      timeout: 30000
    });

    await twitterScraper.waitForSelector(page, 'article[data-testid="tweet"]', 15000);

    let loadedTweets = [];
    let retries = 0;
    const maxRetries = 3;

    while (loadedTweets.length < numberOfTweets && retries < maxRetries) {
      loadedTweets = await page.evaluate(() => {
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

      if (loadedTweets.length < numberOfTweets) {
        await page.evaluate(() => window.scrollBy(0, window.innerHeight));
        await page.waitForTimeout(2000);
        retries++;
      }
    }

    logger.info(`Successfully retrieved tweets`, {
      username,
      tweetCount: loadedTweets.length
    });

    return loadedTweets.slice(0, numberOfTweets);

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

async function createTwitterUserPdf(userDetails, tweets, numberOfTweets) {
  logger.info(`Starting forensic analysis and PDF generation`, {
    username: userDetails.username,
    numberOfTweets
  });

  return new Promise(async (resolve, reject) => {
    try {
      const forensicAnalysis = await forensicsAnalyzer.analyzeProfile(userDetails, tweets);
      
      const doc = new PDFDocument();
      const filename = `${userDetails.username}_forensic_report.pdf`;
      const dir = 'public/pdf_files';
      
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      
      const outputPath = `${dir}/${filename}`;
      const writeStream = fs.createWriteStream(outputPath);
      
      writeStream.on('error', (error) => {
        logger.error(`Error writing PDF file`, {
          error: error.message,
          stack: error.stack
        });
        reject(error);
      });

      writeStream.on('finish', () => {
        logger.info(`Successfully created forensic report PDF`, { filename });
        resolve(filename);
      });

      doc.pipe(writeStream);

      // Title and Basic Info
      doc.fontSize(25).text('Social Media Forensics Report', { align: 'center' });
      doc.moveDown();
      doc.fontSize(12).text(`Generated on: ${moment().format('MMMM Do YYYY, h:mm:ss a')}`, { align: 'right' });
      doc.moveDown();

      // Profile Overview
      doc.fontSize(20).text('1. Profile Overview');
      doc.moveDown();
      doc.fontSize(12);
      doc.text(`Name: ${userDetails.name}`);
      doc.text(`Username: @${userDetails.username}`);
      doc.text(`Account Created: ${moment(userDetails.joined).format('MMMM Do YYYY')}`);
      doc.text(`Account Age: ${moment().diff(moment(userDetails.joined), 'days')} days`);
      doc.text(`Location: ${userDetails.location}`);
      doc.text(`Verified: ${userDetails.verified ? 'Yes' : 'No'}`);
      doc.moveDown();

      // Profile Metrics
      doc.fontSize(20).text('2. Profile Metrics Analysis');
      doc.moveDown();
      doc.fontSize(12);
      doc.text(`Followers/Following Ratio: ${forensicAnalysis.profileMetrics.followersToFollowing.toFixed(2)}`);
      doc.text(`Average Tweets per Day: ${forensicAnalysis.profileMetrics.tweetsPerDay.toFixed(2)}`);
      doc.text(`Engagement Rate: ${forensicAnalysis.profileMetrics.engagementRate}`);
      doc.moveDown();

      // Content Analysis
      doc.fontSize(20).text('3. Content Analysis');
      doc.moveDown();
      doc.fontSize(12);
      doc.text(`Overall Sentiment: ${forensicAnalysis.contentAnalysis.overallSentiment.category} (${forensicAnalysis.contentAnalysis.overallSentiment.score.toFixed(2)})`);
      
      doc.moveDown();
      doc.text('Top Hashtags:');
      forensicAnalysis.contentAnalysis.topHashtags.forEach(([tag, count]) => {
        doc.text(`  ${tag}: ${count} times`);
      });

      doc.moveDown();
      doc.text('Top Mentions:');
      forensicAnalysis.contentAnalysis.topMentions.forEach(([mention, count]) => {
        doc.text(`  ${mention}: ${count} times`);
      });

      // Behavioral Analysis
      doc.addPage();
      doc.fontSize(20).text('4. Behavioral Analysis');
      doc.moveDown();
      doc.fontSize(12);
      
      const pattern = forensicAnalysis.behavioralAnalysis.postingPattern;
      doc.text(`Peak Activity Hour: ${pattern.peakHour}:00`);
      doc.text(`Peak Activity Day: ${moment().day(pattern.peakDay).format('dddd')}`);
      
      // Add activity chart
      doc.image(forensicAnalysis.behavioralAnalysis.activityChart, {
        fit: [500, 300],
        align: 'center'
      });

      // Risk Indicators
      doc.addPage();
      doc.fontSize(20).text('5. Risk Indicators');
      doc.moveDown();
      doc.fontSize(12);
      
      if (forensicAnalysis.riskIndicators.length === 0) {
        doc.text('No significant risk indicators detected.');
      } else {
        forensicAnalysis.riskIndicators.forEach(indicator => {
          doc.text(`Type: ${indicator.type}`);
          doc.text(`Severity: ${indicator.severity}`);
          doc.text(`Details: ${indicator.details}`);
          doc.moveDown();
        });
      }

      // Recent Activity Analysis
      doc.addPage();
      doc.fontSize(20).text('6. Recent Activity Analysis');
      doc.moveDown();
      
      tweets.forEach((tweet, index) => {
        const sentiment = forensicAnalysis.contentAnalysis.sentimentBreakdown[index];
        doc.fontSize(12).text(`Tweet ${index + 1}:`);
        doc.fontSize(10);
        doc.text(`Date: ${moment(tweet.date).format('MMMM Do YYYY, h:mm:ss a')}`);
        doc.text(`Content: ${tweet.text}`);
        doc.text(`Sentiment: ${sentiment.sentiment.category} (${sentiment.sentiment.score.toFixed(2)})`);
        doc.text(`Engagement: ${tweet.likes} likes, ${tweet.comments} comments`);
        doc.moveDown();
      });

      doc.end();
    } catch (error) {
      logger.error(`Failed to create forensic report`, {
        username: userDetails.username,
        error: error.message,
        stack: error.stack
      });
      reject(error);
    }
  });
}

module.exports = {
  getTwitterUserDetails,
  getUserTweets,
  createTwitterUserPdf
};