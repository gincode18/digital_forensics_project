const PDFDocument = require('pdfkit');
const fs = require('fs');
const logger = require('../config/logger');
const twitterClient = require('../config/twitter');
const forensicsAnalyzer = require('./forensics');
const moment = require('moment');

async function getTwitterUserDetails(username) {
  logger.info(`Fetching Twitter user details`, { username });
  
  try {
    const user = await twitterClient.v2.userByUsername(username, {
      'user.fields': [
        'created_at',
        'description',
        'profile_image_url',
        'public_metrics',
        'url',
        'verified',
        'location',
        'entities'
      ]
    });

    if (!user.data) {
      logger.warn(`User not found`, { username });
      throw new Error('User not found');
    }

    logger.info(`Successfully retrieved user details`, {
      username,
      userId: user.data.id
    });

    return {
      name: user.data.name,
      username: user.data.username,
      bio: user.data.description || '',
      joined: user.data.created_at,
      website: user.data.url || `https://twitter.com/${username}`,
      verified: user.data.verified || false,
      location: user.data.location || 'Not specified',
      stats: {
        tweets: user.data.public_metrics.tweet_count,
        following: user.data.public_metrics.following_count,
        followers: user.data.public_metrics.followers_count,
        likes: user.data.public_metrics.like_count
      },
      image: user.data.profile_image_url
    };
  } catch (error) {
    logger.error(`Failed to fetch Twitter user details`, {
      username,
      error: error.message,
      stack: error.stack
    });
    throw error;
  }
}

async function getUserTweets(username, mode, numberOfTweets) {
  logger.info(`Fetching user tweets`, {
    username,
    mode,
    numberOfTweets
  });

  try {
    const user = await twitterClient.v2.userByUsername(username);
    const tweets = await twitterClient.v2.userTimeline(user.data.id, {
      max_results: numberOfTweets,
      'tweet.fields': [
        'created_at',
        'public_metrics',
        'entities',
        'geo',
        'context_annotations',
        'referenced_tweets'
      ]
    });

    logger.info(`Successfully retrieved tweets`, {
      username,
      tweetCount: tweets.data.data.length
    });

    return tweets.data.data.map(tweet => ({
      id: tweet.id,
      twitter_link: `https://twitter.com/${username}/status/${tweet.id}`,
      text: tweet.text,
      date: tweet.created_at,
      likes: tweet.public_metrics.like_count,
      comments: tweet.public_metrics.reply_count,
      retweets: tweet.public_metrics.retweet_count,
      quotes: tweet.public_metrics.quote_count,
      entities: tweet.entities || {},
      geo: tweet.geo,
      context_annotations: tweet.context_annotations,
      referenced_tweets: tweet.referenced_tweets
    }));
  } catch (error) {
    logger.error(`Failed to fetch user tweets`, {
      username,
      error: error.message,
      stack: error.stack
    });
    throw error;
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