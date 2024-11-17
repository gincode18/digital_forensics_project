const logger = require('../config/logger');
const PDFDocument = require('pdfkit');
const fs = require('fs');
const { instagram, initializeInstagram } = require('../config/instagram');

let igClient = null;
let lastInitTime = 0;
const INIT_COOLDOWN = 300000; // 5 minutes cooldown between initialization attempts
const MAX_RETRIES = 3;
const INITIAL_DELAY = 1000;

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

async function getInitializedClient(retryCount = 0) {
  const now = Date.now();
  if (!igClient || (now - lastInitTime) > INIT_COOLDOWN) {
    try {
      igClient = await initializeInstagram(retryCount);
      lastInitTime = now;
    } catch (error) {
      if (retryCount < MAX_RETRIES) {
        const delay = INITIAL_DELAY * Math.pow(2, retryCount);
        logger.warn(`Instagram initialization failed, retrying in ${delay}ms`, {
          retryCount,
          delay,
          error: error.message
        });
        await sleep(delay);
        return getInitializedClient(retryCount + 1);
      }
      
      logger.error('Instagram client initialization failed after retries', {
        error: error.message,
        type: error.name,
        retryCount
      });
      throw new Error('Unable to connect to Instagram. Please try again later.');
    }
  }
  return igClient;
}

async function handleInstagramError(error, context, username) {
  if (error.name === 'IgCheckpointError') {
    logger.error('Instagram security checkpoint triggered', {
      context,
      username,
      error: error.message
    });
    throw new Error('Instagram security check required. Please try again later.');
  }

  if (error.name === 'IgLoginRequiredError') {
    logger.error('Instagram login required', {
      context,
      username,
      error: error.message
    });
    throw new Error('Instagram authentication failed. Please check credentials.');
  }

  if (error.name === 'IgResponseError') {
    logger.error('Instagram API response error', {
      context,
      username,
      error: error.message
    });
    throw new Error('Instagram service temporarily unavailable. Please try again later.');
  }

  logger.error('Instagram API error', {
    context,
    username,
    error: error.message,
    type: error.name
  });
  throw new Error('Failed to fetch Instagram data. Please try again later.');
}

async function getInstagramUserDetails(username, retryCount = 0) {
  logger.info(`Fetching Instagram user details`, { username, retryCount });
  
  try {
    const client = await getInitializedClient();
    
    // Add random delay between requests
    const randomDelay = Math.floor(Math.random() * 1000) + 500;
    await sleep(randomDelay);
    
    const user = await client.user.searchExact(username);
    
    if (!user) {
      logger.warn('Instagram user not found', { username });
      throw new Error(`User ${username} not found on Instagram`);
    }

    const userInfo = await client.user.info(user.pk);

    logger.info(`Successfully retrieved Instagram user details`, {
      username,
      userId: user.pk
    });

    return {
      name: userInfo.full_name,
      username: userInfo.username,
      bio: userInfo.biography || '',
      website: userInfo.external_url || `https://instagram.com/${username}`,
      stats: {
        posts: userInfo.media_count,
        following: userInfo.following_count,
        followers: userInfo.follower_count
      },
      image: userInfo.profile_pic_url
    };
  } catch (error) {
    if (retryCount < MAX_RETRIES && 
        (error.name === 'IgActionSpamError' || error.name === 'IgResponseError')) {
      const delay = INITIAL_DELAY * Math.pow(2, retryCount);
      logger.warn(`Instagram request failed, retrying in ${delay}ms`, {
        username,
        retryCount,
        delay,
        error: error.message
      });
      await sleep(delay);
      return getInstagramUserDetails(username, retryCount + 1);
    }
    await handleInstagramError(error, 'getInstagramUserDetails', username);
  }
}

async function getUserPosts(username, numberOfPosts) {
  logger.info(`Fetching Instagram posts`, {
    username,
    numberOfPosts
  });

  try {
    await initializeInstagram();
    const user = await instagram.user.searchExact(username);
    const feed = instagram.feed.user(user.pk);
    const posts = await feed.items();

    const limitedPosts = posts.slice(0, numberOfPosts);
    
    logger.info(`Successfully retrieved Instagram posts`, {
      username,
      postCount: limitedPosts.length
    });

    return limitedPosts.map(post => ({
      instagram_link: `https://instagram.com/p/${post.code}`,
      caption: post.caption?.text || '',
      date: new Date(post.taken_at * 1000).toISOString(),
      likes: post.like_count,
      comments: post.comment_count,
      media_type: post.media_type,
      image_url: post.image_versions2?.candidates[0]?.url
    }));
  } catch (error) {
    logger.error(`Failed to fetch Instagram posts`, {
      username,
      numberOfPosts,
      error: error.message,
      stack: error.stack
    });
    throw error;
  }
}

function createInstagramUserPdf(userDetails, posts, numberOfPosts) {
  logger.info(`Starting Instagram PDF generation`, {
    username: userDetails.username,
    numberOfPosts
  });

  return new Promise((resolve, reject) => {
    try {
      if (!userDetails || !posts) {
        logger.error(`Missing required data for PDF generation`, {
          hasUserDetails: !!userDetails,
          hasPosts: !!posts
        });
        throw new Error('Missing required data for PDF generation');
      }

      const doc = new PDFDocument();
      const filename = `${userDetails.username}_instagram_report.pdf`;
      
      const dir = 'public/pdf_files';
      if (!fs.existsSync(dir)) {
        logger.info(`Creating PDF directory: ${dir}`);
        fs.mkdirSync(dir, { recursive: true });
      }
      
      const outputPath = `${dir}/${filename}`;
      logger.info(`Creating PDF at path: ${outputPath}`);
      
      const writeStream = fs.createWriteStream(outputPath);
      
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
      
      doc.fontSize(25).text(`${userDetails.name} - Instagram Profile`, { align: 'center' });
      doc.moveDown();
      
      // User details
      doc.fontSize(12);
      doc.text(`Name: ${userDetails.name}`);
      doc.text(`Username: ${userDetails.username}`);
      doc.text(`Bio: ${userDetails.bio}`);
      doc.text(`Website: ${userDetails.website}`);
      
      // Stats
      doc.moveDown();
      doc.fontSize(16).text('Statistics');
      doc.fontSize(12);
      Object.entries(userDetails.stats).forEach(([key, value]) => {
        doc.text(`${key}: ${value}`);
      });
      
      // Posts
      doc.moveDown();
      doc.fontSize(16).text('Recent Posts');
      posts.forEach((post, i) => {
        doc.moveDown();
        doc.fontSize(12);
        doc.text(`Date: ${new Date(post.date).toLocaleDateString()}`);
        doc.text(`Caption: ${post.caption}`);
        doc.text(`Link: ${post.instagram_link}`);
        doc.text(`Likes: ${post.likes} | Comments: ${post.comments}`);
        doc.text(`Type: ${post.media_type}`);
      });
      
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
  getInstagramUserDetails,
  getUserPosts,
  createInstagramUserPdf
};