const express = require('express');
const cors = require('cors');
const logger = require('./config/logger');
const config = require('./config/config');
const {
  getTwitterUserDetails,
  getUserTweets,
  createTwitterUserPdf
} = require('./services/twitter');

const app = express();

// Middleware to log all requests
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
  res.json({ message: "Twitter API Service" });
});

// Get user details
app.get('/api/v1/twitter/userdetails/:username', async (req, res) => {
  const { username } = req.params;
  logger.info(`Fetching user details for username: ${username}`);
  
  try {
    const userDetails = await getTwitterUserDetails(username);
    logger.info(`Successfully retrieved details for user: ${username}`);
    res.json({ userdetails: userDetails });
  } catch (error) {
    logger.error('Error fetching user details:', {
      username,
      error: error.message,
      stack: error.stack
    });
    res.status(500).json({ error: 'Failed to fetch user details' });
  }
});

// Get user tweets
app.post('/api/v1/twitter/usertweets', async (req, res) => {
  const { username, number_of_tweets = 1 } = req.body;
  logger.info(`Fetching tweets for user: ${username}`, {
    numberOfTweets: number_of_tweets
  });

  try {
    const userTweets = await getUserTweets(username, "user", number_of_tweets);
    logger.info(`Successfully retrieved ${number_of_tweets} tweets for user: ${username}`);
    res.json({ usertweets: userTweets });
  } catch (error) {
    logger.error('Error fetching user tweets:', {
      username,
      numberOfTweets: number_of_tweets,
      error: error.message,
      stack: error.stack
    });
    res.status(500).json({ error: 'Failed to fetch user tweets' });
  }
});

// Generate report
app.post('/api/v1/twitter/generatereport', async (req, res) => {
  const { username, number_of_tweets = 1 } = req.body;
  logger.info(`Generating report for user: ${username}`, {
    numberOfTweets: number_of_tweets
  });
  
  try {
    if (!username) {
      logger.warn('Report generation attempted without username');
      return res.status(400).json({ error: 'Username is required' });
    }

    logger.info(`Starting parallel fetch of user details and tweets for: ${username}`);
    const [userDetails, userTweets] = await Promise.all([
      getTwitterUserDetails(username),
      getUserTweets(username, "user", number_of_tweets)
    ]);

    logger.info(`Creating PDF report for user: ${username}`);
    const pdfName = await createTwitterUserPdf(
      userDetails,
      userTweets,
      number_of_tweets
    );

    logger.info(`Successfully generated report: ${pdfName}`);
    res.json({ 
      user_reports: pdfName,
      download_url: `http://localhost:3000/public/pdf_files/${pdfName}`
    });
  } catch (error) {
    logger.error('Error generating report:', {
      username,
      numberOfTweets: number_of_tweets,
      error: error.message,
      stack: error.stack
    });
    res.status(500).json({ 
      error: 'Failed to generate report',
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