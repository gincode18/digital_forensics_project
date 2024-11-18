const moment = require('moment');
const { createTable, generateCharts } = require('./pdfHelpers');
const { getRiskColor } = require('./riskAnalysis');

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

async function addRiskAssessment(doc, forensicAnalysis) {
  doc.addPage();
  doc.fontSize(16)
     .fillColor('#2c3e50')
     .text('6. Risk Assessment', { underline: true })
     .moveDown();

  if (forensicAnalysis.riskIndicators.length === 0) {
    doc.text('No significant risk indicators detected.');
  } else {
    forensicAnalysis.riskIndicators.forEach(indicator => {
      doc.fontSize(12)
         .fillColor(getRiskColor(indicator.severity))
         .text(`${indicator.type} (${indicator.severity})`, { underline: true })
         .fillColor('#333333')
         .fontSize(10)
         .text(indicator.details)
         .moveDown();
    });
  }
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

module.exports = {
  addCoverPage,
  addTableOfContents,
  addExecutiveSummary,
  addProfileOverview,
  addMetricsAnalysis,
  addContentAnalysis,
  addTweetAnalysis,
  addRiskAssessment,
  addRecommendations,
  addPageNumbers
};