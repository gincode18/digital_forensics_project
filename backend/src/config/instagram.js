const { IgApiClient } = require('instagram-private-api');
const logger = require('./logger');

const instagram = new IgApiClient();

if (!process.env.INSTAGRAM_USERNAME || !process.env.INSTAGRAM_PASSWORD) {
  throw new Error('INSTAGRAM_USERNAME and INSTAGRAM_PASSWORD are required in environment variables');
}

async function initializeInstagram() {
  try {
    instagram.state.generateDevice(process.env.INSTAGRAM_USERNAME);
    await instagram.account.login(process.env.INSTAGRAM_USERNAME, process.env.INSTAGRAM_PASSWORD);
    logger.info('Instagram client initialized successfully');
    return instagram;
  } catch (error) {
    logger.error('Failed to initialize Instagram client', {
      error: error.message,
      stack: error.stack
    });
    throw error;
  }
}

module.exports = { instagram, initializeInstagram };