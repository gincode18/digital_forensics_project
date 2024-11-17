const { IgApiClient } = require('instagram-private-api');
const logger = require('./logger');

const instagram = new IgApiClient();

if (!process.env.INSTAGRAM_USERNAME || !process.env.INSTAGRAM_PASSWORD) {
  throw new Error('INSTAGRAM_USERNAME and INSTAGRAM_PASSWORD are required in environment variables');
}

async function initializeInstagram() {
  try {
    // Generate device ID and set proxy if needed
    instagram.state.generateDevice(process.env.INSTAGRAM_USERNAME);
    
    // Simulate pre-login flow
    await instagram.simulate.preLoginFlow();
    
    // Attempt login
    const loggedInUser = await instagram.account.login(
      process.env.INSTAGRAM_USERNAME,
      process.env.INSTAGRAM_PASSWORD
    );
    
    // Simulate post-login flow
    await instagram.simulate.postLoginFlow();
    
    logger.info('Instagram client initialized successfully', {
      username: process.env.INSTAGRAM_USERNAME
    });
    
    return instagram;
  } catch (error) {
    logger.error('Failed to initialize Instagram client', {
      error: error.message,
      type: error.name
    });
    throw error;
  }
}

module.exports = { instagram, initializeInstagram };