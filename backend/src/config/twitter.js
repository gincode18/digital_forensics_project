const { TwitterApi } = require('twitter-api-v2');

if (!process.env.TWITTER_BEARER_TOKEN) {
  throw new Error('TWITTER_BEARER_TOKEN is required in environment variables');
}

const twitterClient = new TwitterApi(process.env.TWITTER_BEARER_TOKEN);
const readOnlyClient = twitterClient.readOnly;

module.exports = readOnlyClient;