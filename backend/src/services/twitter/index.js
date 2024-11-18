// Main Twitter service entry point
const { getTwitterUserDetails } = require('./userService');
const { getUserTweets } = require('./tweetService');
const { createTwitterUserPdf } = require('./reportService');

module.exports = {
  getTwitterUserDetails,
  getUserTweets,
  createTwitterUserPdf
};