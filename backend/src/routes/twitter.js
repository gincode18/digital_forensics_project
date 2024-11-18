const express = require('express');
const router = express.Router();
const logger = require('../config/logger');
const {
  getTwitterUserDetails,
  getUserTweets,
  createTwitterUserPdf
} = require('../services/twitter');

// Get user details
router.get('/userdetails/:username', async (req, res) => {
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

// Get user tweets
router.post('/usertweets', async (req, res) => {
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

// Generate forensic report
router.post('/generatereport', async (req, res) => {
  const { username, number_of_tweets = 30 } = req.body;
  logger.info(`Creating forensic report for user: ${username}`);
  
  try {
    if (!username) {
      logger.warn('Report generation attempted without username');
      return res.status(400).json({ error: 'Username is required' });
    }

    logger.info(`Starting parallel fetch of Twitter user details and tweets for: ${username}`);
    const [userDetails, tweets] = await Promise.all([
      getTwitterUserDetails(username),
      getUserTweets(username, "user", number_of_tweets)
    ]);

    logger.info(`Creating Twitter PDF report for user: ${username}`);
    const pdfName = await createTwitterUserPdf(userDetails, tweets, number_of_tweets);

    logger.info(`Successfully generated forensic report: ${pdfName}`);
    res.json({ 
      user_reports: pdfName,
      download_url: `/public/pdf_files/${pdfName}`
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

module.exports = router;