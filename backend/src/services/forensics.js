const natural = require('natural');
const moment = require('moment');
const { ChartJSNodeCanvas } = require('chartjs-node-canvas');
const logger = require('../config/logger');

const tokenizer = new natural.WordTokenizer();
const analyzer = new natural.SentimentAnalyzer('English', natural.PorterStemmer, 'afinn');

class ForensicsAnalyzer {
  constructor() {
    this.chartJSNodeCanvas = new ChartJSNodeCanvas({ width: 800, height: 400 });
  }

  calculateStandardDeviation(values) {
    const n = values.length;
    if (n < 2) return 0;
    
    const mean = values.reduce((a, b) => a + b, 0) / n;
    const variance = values.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / (n - 1);
    return Math.sqrt(variance);
  }

  analyzeSentiment(text) {
    const tokens = tokenizer.tokenize(text);
    const sentiment = analyzer.getSentiment(tokens);
    return {
      score: sentiment,
      category: this.categorizeSentiment(sentiment)
    };
  }

  categorizeSentiment(score) {
    if (score <= -0.5) return 'Very Negative';
    if (score < 0) return 'Negative';
    if (score === 0) return 'Neutral';
    if (score <= 0.5) return 'Positive';
    return 'Very Positive';
  }

  analyzePostingPattern(tweets) {
    const hourlyDistribution = new Array(24).fill(0);
    const weeklyDistribution = new Array(7).fill(0);

    tweets.forEach(tweet => {
      const date = moment(tweet.date);
      hourlyDistribution[date.hour()]++;
      weeklyDistribution[date.day()]++;
    });

    return {
      hourlyDistribution,
      weeklyDistribution,
      peakHour: hourlyDistribution.indexOf(Math.max(...hourlyDistribution)),
      peakDay: weeklyDistribution.indexOf(Math.max(...weeklyDistribution))
    };
  }

  analyzeHashtags(tweets) {
    const hashtagRegex = /#[\w\u0590-\u05ff]+/g;
    const hashtags = {};
    
    tweets.forEach(tweet => {
      const matches = tweet.text.match(hashtagRegex) || [];
      matches.forEach(tag => {
        hashtags[tag] = (hashtags[tag] || 0) + 1;
      });
    });

    return Object.entries(hashtags)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 10);
  }

  analyzeMentions(tweets) {
    const mentionRegex = /@[\w]+/g;
    const mentions = {};
    
    tweets.forEach(tweet => {
      const matches = tweet.text.match(mentionRegex) || [];
      matches.forEach(mention => {
        mentions[mention] = (mentions[mention] || 0) + 1;
      });
    });

    return Object.entries(mentions)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 10);
  }

  async generateActivityChart(pattern) {
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    
    const configuration = {
      type: 'bar',
      data: {
        labels: days,
        datasets: [{
          label: 'Posts per Day',
          data: pattern.weeklyDistribution,
          backgroundColor: 'rgba(54, 162, 235, 0.5)'
        }]
      },
      options: {
        scales: {
          y: {
            beginAtZero: true
          }
        }
      }
    };

    return await this.chartJSNodeCanvas.renderToBuffer(configuration);
  }

  async analyzeProfile(userDetails, tweets) {
    logger.info('Starting forensic analysis of Twitter profile', {
      username: userDetails.username
    });

    const sentimentAnalysis = tweets.map(tweet => ({
      text: tweet.text,
      sentiment: this.analyzeSentiment(tweet.text)
    }));

    const overallSentiment = sentimentAnalysis.reduce((acc, curr) => acc + curr.sentiment.score, 0) / sentimentAnalysis.length;

    const postingPattern = this.analyzePostingPattern(tweets);
    const topHashtags = this.analyzeHashtags(tweets);
    const topMentions = this.analyzeMentions(tweets);

    const activityChartBuffer = await this.generateActivityChart(postingPattern);

    const engagementRate = tweets.reduce((acc, tweet) => {
      return acc + (tweet.likes + tweet.comments) / userDetails.stats.followers;
    }, 0) / tweets.length * 100;

    return {
      profileMetrics: {
        followersToFollowing: userDetails.stats.followers / userDetails.stats.following,
        tweetsPerDay: userDetails.stats.tweets / moment().diff(moment(userDetails.joined), 'days'),
        engagementRate: engagementRate.toFixed(2) + '%'
      },
      contentAnalysis: {
        overallSentiment: {
          score: overallSentiment,
          category: this.categorizeSentiment(overallSentiment)
        },
        sentimentBreakdown: sentimentAnalysis,
        topHashtags,
        topMentions
      },
      behavioralAnalysis: {
        postingPattern,
        activityChart: activityChartBuffer
      },
      riskIndicators: this.assessRiskIndicators(userDetails, tweets, sentimentAnalysis)
    };
  }

  assessRiskIndicators(userDetails, tweets, sentimentAnalysis) {
    const indicators = [];
    
    // Account age check
    const accountAge = moment().diff(moment(userDetails.joined), 'days');
    if (accountAge < 30) {
      indicators.push({
        type: 'New Account',
        severity: 'Medium',
        details: 'Account is less than 30 days old'
      });
    }

    // Rapid posting check
    const tweetTimeGaps = [];
    for (let i = 1; i < tweets.length; i++) {
      const gap = moment(tweets[i].date).diff(moment(tweets[i-1].date), 'minutes');
      tweetTimeGaps.push(gap);
    }
    
    const avgTimeGap = tweetTimeGaps.reduce((a, b) => a + b, 0) / tweetTimeGaps.length;
    if (avgTimeGap < 10) {
      indicators.push({
        type: 'Rapid Posting',
        severity: 'High',
        details: 'Average time between posts is less than 10 minutes'
      });
    }

    // Sentiment volatility check
    const sentimentScores = sentimentAnalysis.map(s => s.sentiment.score);
    const sentimentVolatility = this.calculateStandardDeviation(sentimentScores);
    if (sentimentVolatility > 0.5) {
      indicators.push({
        type: 'High Sentiment Volatility',
        severity: 'Medium',
        details: 'Large variations in sentiment between posts'
      });
    }

    return indicators;
  }
}

module.exports = new ForensicsAnalyzer();