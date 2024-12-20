const moment = require('moment');
const { createTable, generateCharts, extractHashtags } = require('./pdfHelpers');
const { getRiskColor } = require('./riskAnalysis');
const logger = require('../../../config/logger');

async function addCoverPage(doc, userDetails) {
  doc.fontSize(24)
     .fillColor('#2c3e50')
     .text('Social Media Intelligence Report', { align: 'center' })
     .moveDown(2);

  doc.fontSize(16)
     .fillColor('#34495e')
     .text(`Profile Analysis: @${userDetails.username}`, { align: 'center' })
     .moveDown()
     .fontSize(12)
     .fillColor('#7f8c8d')
     .text(`Generated on: ${moment().format('MMMM Do YYYY, h:mm:ss a')}`, { align: 'center' })
     .moveDown(2);
}

async function addTableOfContents(doc) {
  doc.addPage();
  doc.fontSize(16)
     .fillColor('#2c3e50')
     .text('Table of Contents', { underline: true })
     .moveDown();

  const sections = [
    'Executive Summary',
    'Profile Overview',
    'Account Metrics Analysis',
    'Content Analysis',
    'Sentiment Analysis',
    'Behavioral Patterns',
    'Risk Assessment',
    'Tweet Analysis',
    'Temporal Analysis',
    'Network Analysis',
    'Recommendations'
  ];

  sections.forEach((section, index) => {
    doc.fontSize(12)
       .text(`${index + 1}. ${section}`, {
         link: section.toLowerCase().replace(/\s+/g, '-'),
         underline: true
       })
       .moveDown(0.5);
  });
}

async function addExecutiveSummary(doc, userDetails, forensicAnalysis) {
  doc.addPage();
  doc.fontSize(16)
     .fillColor('#2c3e50')
     .text('1. Executive Summary', { underline: true })
     .moveDown();

  doc.fontSize(12)
     .fillColor('#333333')
     .text('This report provides a comprehensive analysis of the Twitter account ', { continued: true })
     .fillColor('#3498db')
     .text(`@${userDetails.username}`, { continued: true })
     .fillColor('#333333')
     .text('. The analysis includes profile metrics, content patterns, behavioral insights, and risk assessment.')
     .moveDown();

  // Safely parse the date
  const accountAge = userDetails.joined ? 
    moment(new Date(userDetails.joined)).isValid() ? 
      moment().diff(moment(new Date(userDetails.joined)), 'days') : 
      0 : 
    0;

  const keyFindings = [
    ['Account Age', `${accountAge} days`],
    ['Engagement Rate', `${forensicAnalysis.profileMetrics?.engagementRate || 0}%`],
    ['Content Sentiment', forensicAnalysis.contentAnalysis?.overallSentiment?.category || 'Neutral'],
    ['Risk Level', forensicAnalysis.riskLevel || 'Low']
  ];

  createTable(doc, keyFindings);
}

async function addProfileOverview(doc, userDetails) {
  doc.addPage();
  doc.fontSize(16)
     .fillColor('#2c3e50')
     .text('2. Profile Overview', { underline: true })
     .moveDown();

  const profileData = [
    ['Name', userDetails.name],
    ['Username', `@${userDetails.username}`],
    ['Created', moment(userDetails.joined).format('MMMM Do YYYY')],
    ['Location', userDetails.location || 'Not specified'],
    ['Verified', userDetails.verified ? 'Yes' : 'No'],
    ['Bio', userDetails.bio || 'Not provided']
  ];

  createTable(doc, profileData);
}

async function addMetricsAnalysis(doc, userDetails, forensicAnalysis) {
  doc.addPage();
  doc.fontSize(16)
     .fillColor('#2c3e50')
     .text('3. Account Metrics Analysis', { underline: true })
     .moveDown();

  const metricsData = {
    labels: ['Followers', 'Following', 'Engagement Rate'],
    datasets: [{
      data: [
        userDetails.stats.followers,
        userDetails.stats.following,
        parseFloat(forensicAnalysis.profileMetrics.engagementRate)
      ],
      backgroundColor: ['#3498db', '#2ecc71', '#e74c3c']
    }]
  };

  const chartBuffer = await generateCharts(metricsData, 'bar', {
    scales: { y: { beginAtZero: true } }
  });

  doc.image(chartBuffer, { fit: [500, 300], align: 'center' });
  doc.moveDown();
}

async function addContentAnalysis(doc, forensicAnalysis) {
  doc.addPage();
  doc.fontSize(16)
     .fillColor('#2c3e50')
     .text('4. Content Analysis', { underline: true })
     .moveDown();

  // Sentiment Distribution with safe access
  doc.fontSize(14)
     .text('Sentiment Analysis')
     .moveDown();

  const distribution = forensicAnalysis.contentAnalysis?.sentimentDistribution || {
    positive: 0,
    neutral: 0,
    negative: 0
  };

  const sentiment = forensicAnalysis.contentAnalysis?.overallSentiment || {
    category: 'Neutral',
    score: 0
  };

  const sentimentData = [
    ['Overall Sentiment', sentiment.category],
    ['Sentiment Score', sentiment.score.toFixed(2)],
    ['Positive Content', `${distribution.positive}%`],
    ['Neutral Content', `${distribution.neutral}%`],
    ['Negative Content', `${distribution.negative}%`]
  ];

  createTable(doc, sentimentData);
}

// Modify addTweetAnalysis to handle missing data
async function addTweetAnalysis(doc, tweets, forensicAnalysis) {
  doc.addPage();
  doc.fontSize(16)
     .fillColor('#2c3e50')
     .text('5. Tweet Analysis', { underline: true })
     .moveDown();

  tweets.forEach((tweet, index) => {
    const tweetAnalysis = forensicAnalysis.contentAnalysis?.sentimentBreakdown?.[index] || {
      sentiment: { category: 'Neutral', score: 0 }
    };
    
    doc.fontSize(11)
       .fillColor('#2c3e50')
       .text(`Tweet ${index + 1}:`, { underline: true })
       .moveDown(0.5);

    doc.fontSize(10)
       .fillColor('#34495e')
       .text(tweet.text || '', {
         width: 500,
         align: 'left',
         columns: 1
       })
       .moveDown(0.5);

    const tweetMetrics = [
      ['Posted', moment(new Date(tweet.date)).format('MMM Do YYYY, h:mm a')],
      ['Likes', (tweet.likes || 0).toLocaleString()],
      ['Retweets', (tweet.retweets || 0).toLocaleString()],
      ['Comments', (tweet.comments || 0).toLocaleString()],
      ['Sentiment', `${tweetAnalysis.sentiment.category} (${tweetAnalysis.sentiment.score.toFixed(2)})`]
    ];

    createTable(doc, tweetMetrics, 300);
    doc.moveDown();
  });
}

async function addRiskAssessment(doc, userDetails, tweets) {
  doc.addPage();

  doc.fontSize(16)
     .fillColor('#2c3e50')
     .text('6. Risk Assessment', { underline: true })
     .moveDown();

  // Check if there are any tweets
  if (!tweets || tweets.length === 0) {
    doc.fontSize(12)
       .fillColor('#333333')
       .text('No tweets available for risk assessment.', { align: 'center' })
       .moveDown();
    return;
  }

  // Calculate metrics for risk assessment
  const timestamps = tweets.map(tweet => new Date(tweet.date).getTime());
  timestamps.sort((a, b) => a - b); // Sort timestamps

  let rapidPostingRisk = false;
  if (timestamps.length > 1) {
    // Calculate time differences between consecutive tweets
    const timeDiffs = timestamps.map((time, i) => {
      if (i === 0) return null;
      return (time - timestamps[i - 1]) / 60000; // Time difference in minutes
    }).filter(diff => diff !== null);

    const averageTimeBetweenPosts = timeDiffs.reduce((a, b) => a + b, 0) / timeDiffs.length;

    // Assess rapid posting risk
    rapidPostingRisk = averageTimeBetweenPosts < 10;

    // Add Rapid Posting Risk Indicator
    if (rapidPostingRisk) {
      doc.fontSize(12)
         .fillColor('#e74c3c') // High-risk color
         .text(`Rapid Posting (High)`, { underline: true })
         .fillColor('#333333')
         .fontSize(10)
         .text(`Average time between posts is ${averageTimeBetweenPosts.toFixed(2)} minutes, indicating potential spam-like behavior.`)
         .moveDown();
    } else {
      doc.fontSize(12)
         .fillColor('#2ecc71') // Low-risk color
         .text(`Posting Frequency (Low Risk)`, { underline: true })
         .fillColor('#333333')
         .fontSize(10)
         .text(`Average time between posts is ${averageTimeBetweenPosts.toFixed(2)} minutes, indicating normal posting behavior.`)
         .moveDown();
    }
  }

  // Other Risk Assessments (Content-Based)
  const flaggedWords = ['fraud', 'waste', 'cocaine', 'critics']; 
  const flaggedTweets = tweets.filter(tweet =>
    flaggedWords.some(word => tweet.text.toLowerCase().includes(word.toLowerCase()))
  );

  if (flaggedTweets.length > 0) {
    doc.fontSize(12)
       .fillColor('#e67e22') // Medium-risk color
       .text(`Content Risks (Medium)`, { underline: true })
       .fillColor('#333333')
       .fontSize(10)
       .text(`${flaggedTweets.length} tweets contain potentially risky content, such as controversial or negative terms.`)
       .moveDown();
  } else {
    doc.fontSize(12)
       .fillColor('#2ecc71') // Low-risk color
       .text(`Content Risks (Low)`, { underline: true })
       .fillColor('#333333')
       .fontSize(10)
       .text(`No tweets contain flagged terms or potentially risky content.`)
       .moveDown();
  }

  // Final Risk Summary
  const overallRisk = rapidPostingRisk ? 'High' : flaggedTweets.length > 0 ? 'Medium' : 'Low';

  doc.fontSize(12)
     .fillColor('#34495e')
     .text(`Overall Risk Level: ${overallRisk}`, { align: 'center' })
     .moveDown();
}


async function addRecommendations(doc, forensicAnalysis) {
  doc.addPage();
  doc.fontSize(16)
     .fillColor('#2c3e50')
     .text('7. Recommendations', { underline: true })
     .moveDown();

  forensicAnalysis.recommendations.forEach(recommendation => {
    doc.fontSize(12)
       .fillColor('#333333')
       .text(`• ${recommendation}`)
       .moveDown();
  });
}

function addPageNumbers(doc) {
  const pages = doc.bufferedPageRange();
  for (let i = 0; i < pages.count; i++) {
    doc.switchToPage(i);
    doc.fontSize(10)
       .text(`Page ${i + 1} of ${pages.count}`,
             50,
             doc.page.height - 50,
             { align: 'center' });
  }
}


async function addSentimentAnalysis(doc, contentAnalysis) {
  try {
    // Validate input
    if (!contentAnalysis || !Array.isArray(contentAnalysis.sentimentBreakdown)) {
      logger.warn('Invalid content analysis data for sentiment analysis');
      return;
    }

    doc.addPage();
    // Add section header
    doc.fontSize(14)
       .fillColor('#2c3e50')
       .text('Sentiment Distribution')
       .moveDown();

    // Create sentiment distribution table with safe defaults
    const sentimentCounts = {
      Positive: 0,
      Neutral: 0,
      Negative: 0
    };

    // Safely count sentiments
    contentAnalysis.sentimentBreakdown.forEach(item => {
      if (item && item.sentiment && item.sentiment.category) {
        const sentiment = item.sentiment.category;
        if (sentiment in sentimentCounts) {
          sentimentCounts[sentiment]++;
        }
      }
    });

    const total = Object.values(sentimentCounts).reduce((a, b) => a + b, 0);
    
    if (total === 0) {
      doc.fontSize(10)
         .fillColor('#e74c3c')
         .text('No sentiment data available')
         .moveDown();
      return;
    }

    // Create a table showing sentiment distribution
    doc.fontSize(10);
    
    const sentimentColors = {
      Positive: '#2ecc71',
      Neutral: '#3498db',
      Negative: '#e74c3c'
    };

    // Save initial Y position for positioning
    const initialY = doc.y;

    Object.entries(sentimentCounts).forEach(([sentiment, count], index) => {
  const percentage = total > 0 ? ((count / total) * 100).toFixed(1) : '0.0';

      const yPosition = initialY + (index * 30); // Space each bar 30 points apart
      
      // Draw sentiment bar
      const barWidth = Math.max(5, 300 * (count / total)); // Minimum width of 5
      doc.rect(doc.x, yPosition, barWidth, 20)
         .fill(sentimentColors[sentiment]);
      
      // Add label and count
      doc.fillColor('#2c3e50')
         .text(`${sentiment}: ${count} tweets (${percentage}%)`, 320, yPosition + 5);
    });

    // Move past the bars
    doc.moveDown(6);

    // Add average sentiment score
    const avgScore = contentAnalysis.overallSentiment?.score ?? 0;
    doc.fontSize(12)
       .fillColor('#2c3e50')
       .text(`Average Sentiment Score: ${avgScore.toFixed(2)}`)
       .moveDown(2);

    // Add sentiment over time if available
    if (contentAnalysis.sentimentBreakdown.length > 0) {
      doc.fontSize(14)
         .text('Sentiment Trends')
         .moveDown();

      // Create a simple line representation of sentiment changes
      const sentimentLine = contentAnalysis.sentimentBreakdown
        .filter(item => item && item.sentiment && typeof item.sentiment.score === 'number')
        .map(item => {
          const score = item.sentiment.score;
          return (score + 1) / 2; // Convert -1 to 1 range to 0 to 1
        });

      if (sentimentLine.length > 1) {
        // Draw sentiment trend line
        const lineWidth = 400;
        const lineHeight = 100;
        const pointCount = sentimentLine.length;
        
        doc.strokeColor('#34495e')
           .lineWidth(1.5);
        
        // Draw axis
        doc.moveTo(doc.x, doc.y)
           .lineTo(doc.x, doc.y + lineHeight)
           .stroke();
        doc.moveTo(doc.x, doc.y + lineHeight)
           .lineTo(doc.x + lineWidth, doc.y + lineHeight)
           .stroke();

        // Draw trend line
        doc.strokeColor('#3498db')
           .lineWidth(2);

        for (let i = 0; i < pointCount - 1; i++) {
          const x1 = doc.x + (i * (lineWidth / (pointCount - 1)));
          const x2 = doc.x + ((i + 1) * (lineWidth / (pointCount - 1)));
          const y1 = doc.y + (lineHeight - (sentimentLine[i] * lineHeight));
          const y2 = doc.y + (lineHeight - (sentimentLine[i + 1] * lineHeight));
          
          doc.moveTo(x1, y1)
             .lineTo(x2, y2)
             .stroke();
        }

        // Add axis labels
        doc.fontSize(8)
           .fillColor('#666666')
           .text('Positive', doc.x - 30, doc.y - 10)
           .text('Negative', doc.x - 30, doc.y + lineHeight - 10)
           .text('Time →', doc.x + lineWidth - 20, doc.y + lineHeight + 5);
      }
      doc.moveDown(8); // Move past the graph
    }

  } catch (error) {
    logger.error('Error in sentiment analysis section', {
      error: error.message,
      stack: error.stack
    });
    // Add error message to document
    doc.fontSize(10)
       .fillColor('#e74c3c')
       .text('Error generating sentiment analysis visualization')
       .moveDown();
  }
}



async function addTrendingTopics(doc, tweets) {
  doc.addPage();
  doc.fontSize(16)
     .fillColor('#2c3e50')
     .text('Trending Topics', { underline: true })
     .moveDown();

  // Extract hashtags from tweets
  const allHashtags = tweets.flatMap(tweet => extractHashtags(tweet.text));
  const hashtagCounts = allHashtags.reduce((acc, tag) => {
    acc[tag] = (acc[tag] || 0) + 1;
    return acc;
  }, {});

  // Sort hashtags by frequency
  const topHashtags = Object.entries(hashtagCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10);

  if (topHashtags.length === 0) {
    doc.fontSize(10)
       .fillColor('#7f8c8d')
       .text('No significant hashtags found in recent tweets.')
       .moveDown();
    return;
  }

  // Create a bar chart of top hashtags
  const hashtagData = {
    labels: topHashtags.map(([tag]) => tag),
    datasets: [{
      data: topHashtags.map(([, count]) => count),
      backgroundColor: '#3498db'
    }]
  };

  const chartBuffer = await generateCharts(hashtagData, 'bar', {
    scales: { y: { beginAtZero: true } }
  });

  doc.image(chartBuffer, { fit: [500, 300], align: 'center' });
  doc.moveDown();

  // Detailed hashtag table
  const hashtagTable = topHashtags.map(([tag, count]) => [
    tag, 
    count, 
    `${((count / tweets.length) * 100).toFixed(1)}%`
  ]);

  createTable(doc, [
    ['Hashtag', 'Frequency', 'Percentage'],
    ...hashtagTable
  ]);
}

// Enhanced Engagement Metrics Over Time
async function addEngagementMetricsOverTime(doc, tweets) {
  doc.addPage();
  doc.fontSize(16)
     .fillColor('#2c3e50')
     .text('Engagement Metrics Over Time', { underline: true })
     .moveDown();

  // Sort tweets by date
  const sortedTweets = tweets.sort((a, b) => new Date(a.date) - new Date(b.date));

  // Prepare data for engagement metrics
  const engagementData = {
    labels: sortedTweets.map(tweet => moment(tweet.date).format('MMM DD')),
    datasets: [
      {
        label: 'Likes',
        data: sortedTweets.map(tweet => tweet.likes || 0),
        borderColor: '#2ecc71',
        fill: false
      },
      {
        label: 'Retweets',
        data: sortedTweets.map(tweet => tweet.retweets || 0),
        borderColor: '#3498db',
        fill: false
      },
      {
        label: 'Comments',
        data: sortedTweets.map(tweet => tweet.comments || 0),
        borderColor: '#e74c3c',
        fill: false
      }
    ]
  };

  const chartBuffer = await generateCharts(engagementData, 'line', {
    scales: { 
      y: { 
        beginAtZero: true,
        title: {
          display: true,
          text: 'Engagement Count'
        }
      }
    }
  });

  doc.image(chartBuffer, { fit: [500, 300], align: 'center' });
  doc.moveDown();

  // Engagement Summary
  const engagementSummary = [
    ['Metric', 'Total', 'Average per Tweet'],
    [
      'Likes', 
      sortedTweets.reduce((sum, tweet) => sum + (tweet.likes || 0), 0),
      (sortedTweets.reduce((sum, tweet) => sum + (tweet.likes || 0), 0) / sortedTweets.length).toFixed(1)
    ],
    [
      'Retweets', 
      sortedTweets.reduce((sum, tweet) => sum + (tweet.retweets || 0), 0),
      (sortedTweets.reduce((sum, tweet) => sum + (tweet.retweets || 0), 0) / sortedTweets.length).toFixed(1)
    ],
    [
      'Comments', 
      sortedTweets.reduce((sum, tweet) => sum + (tweet.comments || 0), 0),
      (sortedTweets.reduce((sum, tweet) => sum + (tweet.comments || 0), 0) / sortedTweets.length).toFixed(1)
    ]
  ];

  createTable(doc, engagementSummary);
}

// Enhanced Recommendations
async function addEnhancedRecommendations(doc, forensicAnalysis, userDetails, tweets) {
  doc.addPage();
  doc.fontSize(16)
     .fillColor('#2c3e50')
     .text('Enhanced Recommendations', { underline: true })
     .moveDown();

  const recommendations = {
    'Content Strategy': [],
    'Engagement Strategy': [],
    'Risk Mitigation': []
  };

  // Content Strategy Recommendations
  if (forensicAnalysis.contentAnalysis) {
    const sentiment = forensicAnalysis.contentAnalysis.overallSentiment;
    if (sentiment.category === 'Positive') {
      recommendations['Content Strategy'].push(
        'Continue creating content with positive messaging and tone.'
      );
    } else if (sentiment.category === 'Negative') {
      recommendations['Content Strategy'].push(
        'Focus on developing more constructive and positive content.'
      );
    }
  }

  // Engagement Strategy Recommendations
  const avgLikes = tweets.reduce((sum, tweet) => sum + (tweet.likes || 0), 0) / tweets.length;
  const avgRetweets = tweets.reduce((sum, tweet) => sum + (tweet.retweets || 0), 0) / tweets.length;

  recommendations['Engagement Strategy'].push(
    `Aim to maintain an average of ${avgLikes.toFixed(0)} likes and ${avgRetweets.toFixed(0)} retweets per tweet.`,
    'Engage with followers through comments and direct interactions.',
    'Post consistently to maintain audience interest.'
  );

  // Risk Mitigation Recommendations
  if (forensicAnalysis.riskLevel === 'High') {
    recommendations['Risk Mitigation'].push(
      'Review and moderate content to reduce potential controversial statements.',
      'Be mindful of the potential impact of tweets on public perception.'
    );
  }

  // Print recommendations in a structured format
  Object.entries(recommendations).forEach(([category, recs]) => {
    doc.fontSize(14)
       .fillColor('#2c3e50')
       .text(category, { underline: true })
       .moveDown(0.5);

    recs.forEach(rec => {
      doc.fontSize(12)
         .fillColor('#333333')
         .text(`• ${rec}`)
         .moveDown(0.5);
    });
    doc.moveDown();
  });
}

module.exports = {
  addCoverPage,
  addTableOfContents,
  addExecutiveSummary,
  addProfileOverview,
  addMetricsAnalysis,
  addContentAnalysis,
  addSentimentAnalysis,
  addTweetAnalysis,
  addRiskAssessment,
  addTrendingTopics,
  addEngagementMetricsOverTime,
  addEnhancedRecommendations,
  addPageNumbers,
  addRecommendations
};