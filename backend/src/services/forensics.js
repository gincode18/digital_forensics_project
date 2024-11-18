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
    if (!text) return { score: 0, category: 'Neutral' };
    
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
      if (!tweet.date) return;
      
      const date = moment(tweet.date);
      if (date.isValid()) {
        hourlyDistribution[date.hour()]++;
        weeklyDistribution[date.day()]++;
      }
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
      if (!tweet.text) return;
      
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
      if (!tweet.text) return;
      
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

    try {
      const sentimentAnalysis = tweets.map(tweet => ({
        text: tweet.text || '',
        sentiment: this.analyzeSentiment(tweet.text)
      }));

      const validSentiments = sentimentAnalysis.filter(s => s.sentiment.score !== null);
      const overallSentiment = validSentiments.length > 0 
        ? validSentiments.reduce((acc, curr) => acc + curr.sentiment.score, 0) / validSentiments.length
        : 0;

      const postingPattern = this.analyzePostingPattern(tweets);
      const topHashtags = this.analyzeHashtags(tweets);
      const topMentions = this.analyzeMentions(tweets);

      const activityChartBuffer = await this.generateActivityChart(postingPattern);

      // Safely calculate engagement rate
      const followers = userDetails.stats.followers || 1;
      const engagementRate = tweets.reduce((acc, tweet) => {
        const interactions = (tweet.likes || 0) + (tweet.comments || 0);
        return acc + (interactions / followers);
      }, 0) / tweets.length * 100;

      // Safely parse join date
      const joinDate = moment(userDetails.joined, [
        'MMMM YYYY',
        'MMM YYYY',
        'YYYY-MM-DD',
        'YYYY-MM-DDTHH:mm:ss.SSSZ'
      ]);

      const accountAge = joinDate.isValid() 
        ? moment().diff(joinDate, 'days')
        : 0;

      return {
        profileMetrics: {
          followersToFollowing: (userDetails.stats.followers || 0) / (userDetails.stats.following || 1),
          tweetsPerDay: accountAge > 0 ? (userDetails.stats.tweets || 0) / accountAge : 0,
          engagementRate: parseFloat(engagementRate.toFixed(2))
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
    } catch (error) {
      logger.error('Error in forensic analysis:', {
        error: error.message,
        stack: error.stack
      });
      throw error;
    }
  }

  assessRiskIndicators(userDetails, tweets, sentimentAnalysis) {
    const indicators = [];
    
    try {
      // Account age check
      const joinDate = moment(userDetails.joined, [
        'MMMM YYYY',
        'MMM YYYY',
        'YYYY-MM-DD',
        'YYYY-MM-DDTHH:mm:ss.SSSZ'
      ]);

      if (joinDate.isValid()) {
        const accountAge = moment().diff(joinDate, 'days');
        if (accountAge < 30) {
          indicators.push({
            type: 'New Account',
            severity: 'Medium',
            details: 'Account is less than 30 days old'
          });
        }
      }

      // Rapid posting check
      const validTweets = tweets.filter(t => t.date);
      const tweetTimeGaps = [];
      for (let i = 1; i < validTweets.length; i++) {
        const curr = moment(validTweets[i].date);
        const prev = moment(validTweets[i-1].date);
        if (curr.isValid() && prev.isValid()) {
          const gap = curr.diff(prev, 'minutes');
          if (gap >= 0) tweetTimeGaps.push(gap);
        }
      }
      
      if (tweetTimeGaps.length > 0) {
        const avgTimeGap = tweetTimeGaps.reduce((a, b) => a + b, 0) / tweetTimeGaps.length;
        if (avgTimeGap < 10) {
          indicators.push({
            type: 'Rapid Posting',
            severity: 'High',
            details: 'Average time between posts is less than 10 minutes'
          });
        }
      }

      // Sentiment volatility check
      const sentimentScores = sentimentAnalysis
        .map(s => s.sentiment.score)
        .filter(score => score !== null);

      if (sentimentScores.length > 0) {
        const sentimentVolatility = this.calculateStandardDeviation(sentimentScores);
        if (sentimentVolatility > 0.5) {
          indicators.push({
            type: 'High Sentiment Volatility',
            severity: 'Medium',
            details: 'Large variations in sentiment between posts'
          });
        }
      }
    } catch (error) {
      logger.error('Error in risk assessment:', {
        error: error.message,
        stack: error.stack
      });
    }

    return indicators;
  }
}

module.exports = new ForensicsAnalyzer();