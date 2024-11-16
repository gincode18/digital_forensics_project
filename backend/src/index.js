const express = require('express');
const cors = require('cors');
const logger = require('./config/logger');
const config = require('./config/config');
const {
  getTwitterUserDetails,
  getUserTweets,
  createTwitterUserPdf
} = require('./services/twitter');
const {
  getInstagramUserDetails,
  getUserPosts,
  createInstagramUserPdf
} = require('./services/instagram');

const app = express();

app.use((req, res, next) => {
  logger.info(`Incoming ${req.method} request to ${req.originalUrl}`, {
    method: req.method,
    path: req.originalUrl,
    query: req.query,
    body: req.method === 'POST' ? req.body : undefined,
    ip: req.ip,
    userAgent: req.get('user-agent')
  });
  next();
});

app.use(cors({
  origin: 'http://localhost:3000',
  credentials: true
}));
app.use(express.json());
app.use('/public', express.static('public'));

// Root endpoint
app.get('/', (req, res) => {
  logger.info("Root endpoint accessed");
  res.json({ message: "Social Media API Service" });
});

// Twitter endpoints
app.get('/api/v1/twitter/userdetails/:username', async (req, res) => {
  const { username } = req.params;
  logger.info(`Fetching Twitter user details for username: ${username}`);
  
  try {
    const userDetails = await getTwitterUserDetails(username);
    logger.info(`Successfully retrieved Twitter details for user: ${username}`);
    res.json({ userdetails: userDetails });
  } catch (error) {
    logger.error('Error fetching Twitter user details:', {
      username,
      error: error.message,
      stack: error.stack
    });
    res.status(500).json({ error: 'Failed to fetch Twitter user details' });
  }
});

app.post('/api/v1/twitter/usertweets', async (req, res) => {
  const { username, number_of_tweets = 1 } = req.body;
  logger.info(`Fetching tweets for user: ${username}`);

  try {
    const userTweets = await getUserTweets(username, "user", number_of_tweets);
    logger.info(`Successfully retrieved tweets for user: ${username}`);
    res.json({ usertweets: userTweets });
  } catch (error) {
    logger.error('Error fetching tweets:', {
      username,
      error: error.message,
      stack: error.stack
    });
    res.status(500).json({ error: 'Failed to fetch tweets' });
  }
});

// Instagram endpoints
app.get('/api/v1/instagram/userdetails/:username', async (req, res) => {
  const { username } = req.params;
  logger.info(`Fetching Instagram user details for username: ${username}`);
  
  try {
    const userDetails = await getInstagramUserDetails(username);
    logger.info(`Successfully retrieved Instagram details for user: ${username}`);
    res.json({ userdetails: userDetails });
  } catch (error) {
    logger.error('Error fetching Instagram user details:', {
      username,
      error: error.message,
      stack: error.stack
    });
    res.status(500).json({ error: 'Failed to fetch Instagram user details' });
  }
});

app.post('/api/v1/instagram/userposts', async (req, res) => {
  const { username, number_of_posts = 1 } = req.body;
  logger.info(`Fetching Instagram posts for user: ${username}`);

  try {
    const userPosts = await getUserPosts(username, number_of_posts);
    logger.info(`Successfully retrieved Instagram posts for user: ${username}`);
    res.json({ userposts: userPosts });
  } catch (error) {
    logger.error('Error fetching Instagram posts:', {
      username,
      error: error.message,
      stack: error.stack
    });
    res.status(500).json({ error: 'Failed to fetch Instagram posts' });
  }
});

app.post('/api/v1/instagram/generatereport', async (req, res) => {
  const { username, number_of_posts = 1 } = req.body;
  logger.info(`Generating Instagram report for user: ${username}`);
  
  try {
    if (!username) {
      logger.warn('Report generation attempted without username');
      return res.status(400).json({ error: 'Username is required' });
    }

    logger.info(`Starting parallel fetch of Instagram user details and posts for: ${username}`);
    const [userDetails, posts] = await Promise.all([
      getInstagramUserDetails(username),
      getUserPosts(username, number_of_posts)
    ]);

    logger.info(`Creating Instagram PDF report for user: ${username}`);
    const pdfName = await createInstagramUserPdf(
      userDetails,
      posts,
      number_of_posts
    );

    logger.info(`Successfully generated Instagram report: ${pdfName}`);
    res.json({ 
      user_reports: pdfName,
      download_url: `/public/pdf_files/${pdfName}`
    });
  } catch (error) {
    logger.error('Error generating Instagram report:', {
      username,
      numberOfPosts: number_of_posts,
      error: error.message,
      stack: error.stack
    });
    res.status(500).json({ 
      error: 'Failed to generate Instagram report',
      details: error.message 
    });
  }
});

// Error handling middleware
app.use((err, req, res, next) => {
  logger.error('Unhandled error:', {
    error: err.message,
    stack: err.stack,
    path: req.path,
    method: req.method
  });
  res.status(500).json({ error: 'Internal server error' });
});

// Start server
const PORT = config.app.apiPort;
app.listen(PORT, () => {
  logger.info(`Server started successfully`, {
    port: PORT,
    environment: process.env.NODE_ENV || 'development',
    timestamp: new Date().toISOString()
  });
});