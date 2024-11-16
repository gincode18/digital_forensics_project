require('dotenv').config();

const config = {
  app: {
    apiHost: process.env.API_HOST || 'localhost',
    apiPort: process.env.API_PORT || 3000,
    logLevel: process.env.LOG_LEVEL || 'info'
  }
};

module.exports = config;