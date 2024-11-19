const logger = require('../../../config/logger');

class TweetParser {
  static extractHashtags(text) {
    const hashtagRegex = /#[\w\u0590-\u05ff]+/g;
    return (text.match(hashtagRegex) || []).map(tag => tag.toLowerCase());
  }

  static extractMentions(text) {
    const mentionRegex = /@[\w]+/g;
    return (text.match(mentionRegex) || []);
  }

  static extractUrls(text) {
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    return (text.match(urlRegex) || []);
  }

  static extractMediaInfo(tweet) {
    return {
      hasImage: !!tweet.querySelector('img[src*="/media/"]'),
      hasVideo: !!tweet.querySelector('[data-testid="videoPlayer"]'),
      hasGif: !!tweet.querySelector('[data-testid="gifPlayer"]'),
      hasLink: this.extractUrls(tweet.textContent).length > 0
    };
  }

  static determineTweetType(tweet) {
    const isRetweet = !!tweet.querySelector('[data-testid="socialContext"]');
    const isReply = !!tweet.querySelector('[data-testid="reply"]');
    const isQuote = !!tweet.querySelector('[data-testid="quote"]');

    if (isRetweet) return 'retweet';
    if (isReply) return 'reply';
    if (isQuote) return 'quote';
    return 'original';
  }

  static parseEngagementMetrics(tweet) {
    const getMetricCount = (selector) => {
      const element = tweet.querySelector(`[data-testid="${selector}"] span`);
      if (!element) return 0;
      
      const text = element.textContent.toLowerCase();
      if (text.includes('k')) {
        return Math.round(parseFloat(text) * 1000);
      } else if (text.includes('m')) {
        return Math.round(parseFloat(text) * 1000000);
      }
      return parseInt(text.replace(/,/g, '')) || 0;
    };

    return {
      likes: getMetricCount('like'),
      retweets: getMetricCount('retweet'),
      comments: getMetricCount('reply'),
      quotes: getMetricCount('quote')
    };
  }
}

module.exports = TweetParser;