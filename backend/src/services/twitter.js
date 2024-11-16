const PDFDocument = require('pdfkit');
const fs = require('fs');
const logger = require('../config/logger');
const twitterClient = require('../config/twitter');

async function getTwitterUserDetails(username) {
  logger.info(`Fetching Twitter user details`, { username });
  
  try {
    const user = await twitterClient.v2.userByUsername(username, {
      'user.fields': [
        'created_at',
        'description',
        'profile_image_url',
        'public_metrics',
        'url'
      ]
    });

    if (!user.data) {
      logger.warn(`User not found`, { username });
      throw new Error('User not found');
    }

    logger.info(`Successfully retrieved user details`, {
      username,
      userId: user.data.id,
      metrics: user.data.public_metrics
    });

    return {
      name: user.data.name,
      username: user.data.username,
      bio: user.data.description || '',
      joined: user.data.created_at,
      website: user.data.url || `https://twitter.com/${username}`,
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
    logger.info(`Found user for tweets fetch`, {
      username,
      userId: user.data.id
    });

    const tweets = await twitterClient.v2.userTimeline(user.data.id, {
      max_results: numberOfTweets,
      'tweet.fields': ['created_at', 'public_metrics']
    });

    logger.info(`Successfully retrieved tweets`, {
      username,
      tweetCount: tweets.data.data.length
    });

    const formattedTweets = tweets.data.data.map(tweet => ({
      twitter_link: `https://twitter.com/${username}/status/${tweet.id}`,
      text: tweet.text,
      date: tweet.created_at,
      likes: tweet.public_metrics.like_count,
      comments: tweet.public_metrics.reply_count
    }));

    return formattedTweets;
  } catch (error) {
    logger.error(`Failed to fetch user tweets`, {
      username,
      mode,
      numberOfTweets,
      error: error.message,
      stack: error.stack
    });
    throw error;
  }
}

function createTwitterUserPdf(userDetails, tweets, numberOfTweets) {
  logger.info(`Starting PDF generation`, {
    username: userDetails.username,
    numberOfTweets
  });

  return new Promise((resolve, reject) => {
    try {
      if (!userDetails || !tweets) {
        logger.error(`Missing required data for PDF generation`, {
          hasUserDetails: !!userDetails,
          hasTweets: !!tweets
        });
        throw new Error('Missing required data for PDF generation');
      }

      const doc = new PDFDocument();
      const filename = `${userDetails.name}_report.pdf`;
      
      // Ensure the directory exists
      const dir = 'public/pdf_files';
      if (!fs.existsSync(dir)) {
        logger.info(`Creating PDF directory: ${dir}`);
        fs.mkdirSync(dir, { recursive: true });
      }
      
      const outputPath = `${dir}/${filename}`;
      logger.info(`Creating PDF at path: ${outputPath}`);
      
      const writeStream = fs.createWriteStream(outputPath);
      
      // Handle stream events
      writeStream.on('error', (error) => {
        logger.error(`Error writing PDF file`, {
          filename,
          error: error.message,
          stack: error.stack
        });
        reject(error);
      });

      writeStream.on('finish', () => {
        logger.info(`Successfully created PDF`, { filename });
        resolve(filename);
      });

      doc.pipe(writeStream);
      
      // Add content to PDF
      logger.debug(`Adding content to PDF`, { username: userDetails.username });
      
      doc.fontSize(25).text(`${userDetails.name} - Profile Overview`, { align: 'center' });
      doc.moveDown();
      
      // User details
      doc.fontSize(12);
      doc.text(`Name: ${userDetails.name}`);
      doc.text(`Username: ${userDetails.username}`);
      doc.text(`Bio: ${userDetails.bio}`);
      doc.text(`Joined: ${new Date(userDetails.joined).toLocaleDateString()}`);
      doc.text(`Website: ${userDetails.website}`);
      
      // Stats
      doc.moveDown();
      doc.fontSize(16).text('Statistics');
      doc.fontSize(12);
      Object.entries(userDetails.stats).forEach(([key, value]) => {
        doc.text(`${key}: ${value}`);
      });
      
      // Tweets
      doc.moveDown();
      doc.fontSize(16).text('Recent Tweets');
      tweets.forEach((tweet, i) => {
        doc.moveDown();
        doc.fontSize(12);
        doc.text(`Date: ${new Date(tweet.date).toLocaleDateString()}`);
        doc.text(`Tweet: ${tweet.text}`);
        doc.text(`Link: ${tweet.twitter_link}`);
        doc.text(`Likes: ${tweet.likes} | Comments: ${tweet.comments}`);
      });
      
      logger.debug(`Finalizing PDF generation`);
      doc.end();
    } catch (error) {
      logger.error(`Failed to create PDF`, {
        username: userDetails?.username,
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