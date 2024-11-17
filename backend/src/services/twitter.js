const PDFDocument = require('pdfkit');
const fs = require('fs');
const logger = require('../config/logger');
const twitterScraper = require('../config/twitter');
const forensicsAnalyzer = require('./forensics');
const moment = require('moment');
const { createCanvas } = require('canvas');
const { Chart } = require('chart.js');

async function getTwitterUserDetails(username) {
  logger.info(`Fetching Twitter user details`, { username });
  let page;
  
  try {
    page = await twitterScraper.getNewPage();
    
    // Navigate to the profile with mobile user agent first
    await page.setUserAgent('Mozilla/5.0 (iPhone; CPU iPhone OS 14_7_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.1.2 Mobile/15E148 Safari/604.1');
    
    const response = await page.goto(`https://twitter.com/${username}`, {
      waitUntil: ['networkidle0', 'domcontentloaded'],
      // timeout: 30000
    });

    if (!response.ok()) {
      throw new Error(`HTTP ${response.status()} on ${username}'s profile`);
    }

    // Wait for key elements with increased timeout
    const selectors = [
      '[data-testid="UserName"]',
      '[data-testid="UserDescription"]',
      '[data-testid="UserProfileHeader_Items"]'
    ];

    for (const selector of selectors) {
      const found = await twitterScraper.waitForSelector(page, selector, 15000);
      if (!found) {
        logger.warn(`Selector not found: ${selector}`);
      }
    }

    // Extract user details
    const userDetails = await page.evaluate(() => {
      const getTextContent = (selector) => {
        const element = document.querySelector(selector);
        return element ? element.textContent.trim() : '';
      };

      const getFollowerCount = (text) => {
        if (!text) return 0;
        text = text.toLowerCase();
        if (text.includes('k')) {
          return Math.round(parseFloat(text) * 1000);
        } else if (text.includes('m')) {
          return Math.round(parseFloat(text) * 1000000);
        }
        return parseInt(text.replace(/,/g, '')) || 0;
      };

      const name = getTextContent('[data-testid="UserName"]');
      const bio = getTextContent('[data-testid="UserDescription"]');
      const location = getTextContent('[data-testid="UserLocation"]');
      const website = getTextContent('[data-testid="UserUrl"]');
      
      const followingText = getTextContent('[href*="/following"] span');
      const followersText = getTextContent('[href*="/followers"] span');
      
      const joinDate = getTextContent('[data-testid="UserJoinDate"]')
        .replace('Joined ', '');

      const verified = !!document.querySelector('[data-testid="UserVerifiedBadge"]');

      return {
        name,
        username: window.location.pathname.slice(1),
        bio,
        joined: joinDate,
        website: website || `https://twitter.com/${window.location.pathname.slice(1)}`,
        verified,
        location,
        stats: {
          following: getFollowerCount(followingText),
          followers: getFollowerCount(followersText)
        }
      };
    });

    logger.info(`Successfully retrieved user details`, { username });
    return userDetails;

  } catch (error) {
    logger.error(`Failed to fetch Twitter user details`, {
      username,
      error: error.message,
      stack: error.stack
    });
    throw error;
  } finally {
    if (page) {
      await twitterScraper.closePage(page);
    }
  }
}

async function getUserTweets(username, mode, numberOfTweets) {
  logger.info(`Fetching user tweets`, {
    username,
    mode,
    numberOfTweets
  });

  let page;
  try {
    page = await twitterScraper.getNewPage();
    
    // More reliable mobile user agent
    await page.setUserAgent('Mozilla/5.0 (iPhone; CPU iPhone OS 14_7_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.1.2 Mobile/15E148 Safari/604.1');
    
    // Navigate to profile with increased timeout
    await page.goto(`https://twitter.com/${username}`, {
      waitUntil: ['networkidle0', 'domcontentloaded'],
      // timeout: 60000
    });

    // Wait for initial tweets to load
    await page.waitForSelector('article[data-testid="tweet"]');

    let loadedTweets = new Set();
    let previousHeight = 0;
    let sameHeightCount = 0;
    const maxRetries = 10;
    
    while (loadedTweets.size < numberOfTweets && sameHeightCount < maxRetries) {
      // Extract current tweets
      const newTweets = await page.evaluate(() => {
        const tweets = Array.from(document.querySelectorAll('article[data-testid="tweet"]'));
        return tweets.map(tweet => {
          const getTextContent = (selector) => {
            const element = tweet.querySelector(selector);
            return element ? element.textContent.trim() : '';
          };

          const getMetricCount = (text) => {
            if (!text) return 0;
            text = text.toLowerCase();
            if (text.includes('k')) {
              return Math.round(parseFloat(text) * 1000);
            } else if (text.includes('m')) {
              return Math.round(parseFloat(text) * 1000000);
            }
            return parseInt(text.replace(/,/g, '')) || 0;
          };

          const tweetText = getTextContent('[data-testid="tweetText"]');
          const timeElement = tweet.querySelector('time');
          const tweetId = tweet.querySelector('a[href*="/status/"]')
            ?.href?.match(/status\/(\d+)/)?.[1];

          const likesText = getTextContent('[data-testid="like"] span');
          const retweetsText = getTextContent('[data-testid="retweet"] span');
          const repliesText = getTextContent('[data-testid="reply"] span');

          return {
            id: tweetId,
            text: tweetText,
            date: timeElement ? timeElement.getAttribute('datetime') : null,
            likes: getMetricCount(likesText),
            retweets: getMetricCount(retweetsText),
            comments: getMetricCount(repliesText),
            twitter_link: tweetId ? `https://twitter.com/${window.location.pathname.slice(1)}/status/${tweetId}` : ''
          };
        });
      });

      // Add new tweets to Set to remove duplicates
      newTweets.forEach(tweet => {
        if (tweet.id) {
          loadedTweets.add(JSON.stringify(tweet));
        }
      });

      // Get current scroll height
      const currentHeight = await page.evaluate('document.documentElement.scrollHeight');
      
      if (currentHeight === previousHeight) {
        sameHeightCount++;
        
        // Try to trigger load by clicking "Show more tweets" button if present
        try {
          await page.evaluate(() => {
            const showMoreButton = Array.from(document.querySelectorAll('span')).find(
              span => span.textContent.includes('Show more tweets')
            );
            if (showMoreButton) {
              showMoreButton.click();
            }
          });
        } catch (error) {
          logger.warn('No "Show more" button found');
        }
        
        // Additional scroll attempts with random offsets
        await page.evaluate(() => {
          const randomOffset = Math.floor(Math.random() * 100);
          window.scrollTo(0, document.documentElement.scrollHeight - randomOffset);
        });
        
      } else {
        sameHeightCount = 0;
      }

      previousHeight = currentHeight;

      // Smooth scroll with random delays
      await page.evaluate(async () => {
        const delay = ms => new Promise(resolve => setTimeout(resolve, ms));
        const scrollStep = 100;
        const steps = 5;
        
        for (let i = 0; i < steps; i++) {
          window.scrollBy(0, scrollStep);
          await delay(100 + Math.random() * 200);
        }
      });

      // Random delay between scrolls
      await page.waitForTimeout(1000 + Math.random() * 1000);

      // Log progress
      logger.info(`Found ${loadedTweets.size} unique tweets, target: ${numberOfTweets}`);
      
      // Check for Twitter rate limiting or blocking indicators
      const isBlocked = await page.evaluate(() => {
        return document.body.textContent.includes('Rate limit exceeded') ||
               document.body.textContent.includes('Try again later');
      });

      if (isBlocked) {
        logger.warn('Possible rate limiting detected');
        break;
      }
    }

    // Convert Set back to array and parse stored JSON
    const uniqueTweets = Array.from(loadedTweets).map(tweet => JSON.parse(tweet));
    
    logger.info(`Successfully retrieved tweets`, {
      username,
      tweetCount: uniqueTweets.length,
      requestedCount: numberOfTweets
    });

    return uniqueTweets.slice(0, numberOfTweets);

  } catch (error) {
    logger.error(`Failed to fetch user tweets`, {
      username,
      error: error.message,
      stack: error.stack
    });
    throw error;
  } finally {
    if (page) {
      await twitterScraper.closePage(page);
    }
  }
}

async function createTwitterUserPdf(userDetails, tweets, numberOfTweets) {
  logger.info(`Starting enhanced forensic analysis and PDF generation`, {
    username: userDetails.username,
    numberOfTweets
  });

  return new Promise(async (resolve, reject) => {
    try {
      const forensicAnalysis = await forensicsAnalyzer.analyzeProfile(userDetails, tweets);
      
      const doc = new PDFDocument({
        size: 'A4',
        margins: {
          top: 50,
          bottom: 50,
          left: 50,
          right: 50
        },
        bufferPages: true
      });

      const filename = `${userDetails.username}_forensic_report_${moment().format('YYYY-MM-DD')}.pdf`;
      const dir = 'public/pdf_files';
      
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      
      const outputPath = `${dir}/${filename}`;
      const writeStream = fs.createWriteStream(outputPath);

      // Setup event handlers
      writeStream.on('error', (error) => {
        logger.error(`Error writing PDF file`, {
          error: error.message,
          stack: error.stack
        });
        reject(error);
      });

      writeStream.on('finish', () => {
        logger.info(`Successfully created enhanced forensic report PDF`, { filename });
        resolve(filename);
      });

      doc.pipe(writeStream);

      // Helper functions for consistent styling
      const addPageHeader = () => {
        doc.fontSize(10)
           .text(`@${userDetails.username} - Social Media Analysis`, 50, 20, { align: 'left' })
           .text(moment().format('MMMM Do YYYY'), 50, 20, { align: 'right' });
        doc.moveDown(2);
      };

      const addSection = (title, yPosition = null) => {
        if (yPosition && (yPosition > 700 || doc.y > 700)) {
          doc.addPage();
          addPageHeader();
        }
        doc.fontSize(16)
           .fillColor('#2c3e50')
           .text(title, { underline: true })
           .fontSize(12)
           .fillColor('#333333')
           .moveDown();
      };

      // Cover Page
      doc.fontSize(24)
         .fillColor('#2c3e50')
         .text('Social Media Intelligence Report', { align: 'center' })
         .moveDown(2);

      // Add logo or banner if available
      // doc.image('path/to/logo.png', { fit: [250, 250], align: 'center' });

      doc.fontSize(16)
         .fillColor('#34495e')
         .text(`Profile Analysis: @${userDetails.username}`, { align: 'center' })
         .moveDown()
         .fontSize(12)
         .fillColor('#7f8c8d')
         .text(`Generated on: ${moment().format('MMMM Do YYYY, h:mm:ss a')}`, { align: 'center' })
         .moveDown(2);

      // Table of Contents
      doc.addPage();
      addSection('Table of Contents');
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
        doc.text(`${index + 1}. ${section}`, {
          link: section.toLowerCase().replace(/\s+/g, '-'),
          underline: true
        }).moveDown(0.5);
      });

      // Executive Summary
      doc.addPage();
      addSection('1. Executive Summary');
      doc.fontSize(12)
         .text('This report provides a comprehensive analysis of the Twitter account ', { continued: true })
         .fillColor('#3498db')
         .text(`@${userDetails.username}`, { continued: true })
         .fillColor('#333333')
         .text('. The analysis includes profile metrics, content patterns, behavioral insights, and risk assessment.')
         .moveDown();

      // Add key findings summary
      doc.fontSize(14)
         .text('Key Findings')
         .moveDown(0.5);

      const keyFindings = [
        `Account Age: ${moment().diff(moment(userDetails.joined), 'days')} days`,
        `Engagement Rate: ${forensicAnalysis.profileMetrics.engagementRate}%`,
        `Content Sentiment: ${forensicAnalysis.contentAnalysis.overallSentiment.category}`,
        `Risk Level: ${calculateRiskLevel(forensicAnalysis.riskIndicators)}`
      ];

      keyFindings.forEach(finding => {
        doc.fontSize(12)
           .text(`• ${finding}`)
           .moveDown(0.5);
      });

      // Profile Overview
      doc.addPage();
      addSection('2. Profile Overview');
      
      // Create a profile info table
      const profileData = [
        ['Name', userDetails.name],
        ['Username', `@${userDetails.username}`],
        ['Created', moment(userDetails.joined).format('MMMM Do YYYY')],
        ['Location', userDetails.location || 'Not specified'],
        ['Verified', userDetails.verified ? 'Yes' : 'No'],
        ['Bio', userDetails.bio || 'Not provided']
      ];

      createTable(doc, profileData);

      // Account Metrics Analysis
      doc.addPage();
      addSection('3. Account Metrics Analysis');
      
      const metricsData = {
        labels: ['Followers', 'Following', 'Tweets'],
        data: [
          userDetails.stats.followers,
          userDetails.stats.following,
          tweets.length
        ]
      };

      // Add metrics visualization
      await addMetricsChart(doc, metricsData);
      
      // Content Analysis
      doc.addPage();
      addSection('4. Content Analysis');
      
      // Add sentiment distribution
      await addSentimentAnalysis(doc, forensicAnalysis.contentAnalysis);
      
      // Add word cloud or frequency analysis
      if (forensicAnalysis.contentAnalysis.topWords) {
        addWordFrequencyAnalysis(doc, forensicAnalysis.contentAnalysis.topWords);
      }

      // Tweet Analysis
      doc.addPage();
      addSection('5. Tweet Analysis');
      
      // Create detailed tweet analysis
      tweets.forEach((tweet, index) => {
        const tweetAnalysis = forensicAnalysis.contentAnalysis.sentimentBreakdown[index];
        
        doc.fontSize(11)
           .fillColor('#2c3e50')
           .text(`Tweet ${index + 1}:`, { underline: true })
           .moveDown(0.5);

        // Tweet content box
        doc.fontSize(10)
           .fillColor('#34495e')
           .text(tweet.text, {
             width: 500,
             align: 'left',
             columns: 1
           })
           .moveDown(0.5);

        // Tweet metrics table
        const tweetMetrics = [
          ['Posted', moment(tweet.date).format('MMM Do YYYY, h:mm a')],
          ['Likes', tweet.likes.toLocaleString()],
          ['Retweets', tweet.retweets.toLocaleString()],
          ['Comments', tweet.comments.toLocaleString()],
          ['Sentiment', `${tweetAnalysis.sentiment.category} (${tweetAnalysis.sentiment.score.toFixed(2)})`]
        ];

        createTable(doc, tweetMetrics, 300);
        doc.moveDown(2);
      });

      // Risk Assessment
      doc.addPage();
      addSection('6. Risk Assessment');
      
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

      // Recommendations
      doc.addPage();
      addSection('7. Recommendations');
      
      // Add custom recommendations based on analysis
      const recommendations = generateRecommendations(forensicAnalysis);
      recommendations.forEach(rec => {
        doc.fontSize(12)
           .text(`• ${rec}`)
           .moveDown();
      });

      // Add page numbers
      let pages = doc.bufferedPageRange();
      for (let i = 0; i < pages.count; i++) {
        doc.switchToPage(i);
        doc.fontSize(10)
           .text(`Page ${i + 1} of ${pages.count}`, 
                 50, 
                 doc.page.height - 50,
                 { align: 'center' });
      }

      doc.end();
    } catch (error) {
      logger.error(`Failed to create forensic report`, {
        username: userDetails.username,
        error: error.message,
        stack: error.stack
      });
      reject(error);
    }
  });
}

// Helper functions
function calculateRiskLevel(riskIndicators) {
  if (!riskIndicators.length) return 'Low';
  const severityScores = {
    'low': 1,
    'medium': 2,
    'high': 3,
    'critical': 4
  };
  
  const averageScore = riskIndicators.reduce((acc, indicator) => 
    acc + severityScores[indicator.severity.toLowerCase()], 0) / riskIndicators.length;
  
  if (averageScore <= 1.5) return 'Low';
  if (averageScore <= 2.5) return 'Medium';
  if (averageScore <= 3.5) return 'High';
  return 'Critical';
}

function getRiskColor(severity) {
  const colors = {
    'low': '#2ecc71',
    'medium': '#f1c40f',
    'high': '#e67e22',
    'critical': '#e74c3c'
  };
  return colors[severity.toLowerCase()] || '#333333';
}

function createTable(doc, data, maxWidth = 500) {
  const cellPadding = 5;
  const colWidth = maxWidth / 2;
  
  data.forEach((row, i) => {
    doc.fontSize(10)
       .fillColor('#2c3e50')
       .text(row[0], doc.x, doc.y, { width: colWidth, continued: true })
       .fillColor('#34495e')
       .text(row[1], { width: colWidth });
    
    if (i < data.length - 1) {
      doc.moveDown(0.5);
    }
  });
  doc.moveDown();
}

function generateRecommendations(analysis) {
  const recommendations = [];
  
  // Add recommendations based on analysis results
  if (analysis.profileMetrics.engagementRate < 1) {
    recommendations.push('Consider increasing engagement with followers through more interactive content');
  }
  
  if (analysis.contentAnalysis.overallSentiment.score < 0) {
    recommendations.push('Monitor content tone to maintain a more balanced sentiment profile');
  }
  
  // Add more custom recommendations based on your analysis
  
  return recommendations;
}

async function addMetricsChart(doc, metricsData) {
  const canvas = createCanvas(500, 300);
  const ctx = canvas.getContext('2d');
  
  new Chart(ctx, {
    type: 'bar',
    data: {
      labels: metricsData.labels,
      datasets: [{
        data: metricsData.data,
        backgroundColor: ['#3498db', '#2ecc71', '#e74c3c']
      }]
    },
    options: {
      responsive: true,
      scales: {
        y: {
          beginAtZero: true
        }
      }
    }
  });
  
  doc.image(canvas.toBuffer(), {
    fit: [500, 300],
    align: 'center'
  });
  doc.moveDown();
}

async function addSentimentAnalysis(doc, contentAnalysis) {
  // Add section header
  doc.fontSize(14)
     .fillColor('#2c3e50')
     .text('Sentiment Distribution')
     .moveDown();

  // Create sentiment distribution table
  const sentimentCounts = {
    Positive: 0,
    Neutral: 0,
    Negative: 0
  };

  contentAnalysis.sentimentBreakdown.forEach(item => {
    const sentiment = item.sentiment.category;
    sentimentCounts[sentiment]++;
  });

  const total = Object.values(sentimentCounts).reduce((a, b) => a + b, 0);
  
  // Create a table showing sentiment distribution
  doc.fontSize(10);
  
  const sentimentColors = {
    Positive: '#2ecc71',
    Neutral: '#3498db',
    Negative: '#e74c3c'
  };

  Object.entries(sentimentCounts).forEach(([sentiment, count]) => {
    const percentage = ((count / total) * 100).toFixed(1);
    
    // Draw sentiment bar
    const barWidth = 300 * (count / total);
    doc.rect(doc.x, doc.y, barWidth, 20)
       .fill(sentimentColors[sentiment]);
    
    // Add label and count
    doc.fillColor('#2c3e50')
       .text(`${sentiment}: ${count} tweets (${percentage}%)`, 320, doc.y - 15);
    
    doc.moveDown(1.5);
  });

  doc.moveDown();

  // Add average sentiment score
  const avgScore = contentAnalysis.overallSentiment.score;
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
    const sentimentLine = contentAnalysis.sentimentBreakdown.map(item => {
      const score = item.sentiment.score;
      const normalizedScore = (score + 1) / 2; // Convert -1 to 1 range to 0 to 1
      return normalizedScore;
    });

    // Draw sentiment trend line
    const lineWidth = 400;
    const lineHeight = 100;
    const pointCount = sentimentLine.length;
    
    doc.strokeColor('#34495e');
    
    for (let i = 0; i < pointCount - 1; i++) {
      const x1 = doc.x + (i * (lineWidth / (pointCount - 1)));
      const x2 = doc.x + ((i + 1) * (lineWidth / (pointCount - 1)));
      const y1 = doc.y + (lineHeight - (sentimentLine[i] * lineHeight));
      const y2 = doc.y + (lineHeight - (sentimentLine[i + 1] * lineHeight));
      
      doc.moveTo(x1, y1)
         .lineTo(x2, y2)
         .stroke();
    }

    doc.moveDown(8); // Move past the graph
  }
}

function addWordFrequencyAnalysis(doc, topWords) {
  // Add section header
  doc.fontSize(14)
     .fillColor('#2c3e50')
     .text('Most Frequent Words')
     .moveDown();

  // Sort words by frequency
  const sortedWords = Object.entries(topWords)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 10); // Get top 10 words

  const maxCount = sortedWords[0][1]; // Highest frequency

  // Create word frequency visualization
  sortedWords.forEach(([word, count], index) => {
    const barWidth = (count / maxCount) * 300; // Scale bar width to maximum 300 points
    const percentage = ((count / maxCount) * 100).toFixed(1);

    // Draw frequency bar
    doc.rect(doc.x, doc.y, barWidth, 20)
       .fill('#3498db');
    
    // Add word and count
    doc.fillColor('#2c3e50')
       .text(`${word}: ${count} occurrences (${percentage}%)`, 320, doc.y - 15);
    
    doc.moveDown(1.5);
  });

  doc.moveDown();

  // Add word cloud representation
  doc.fontSize(14)
     .text('Word Cloud Representation')
     .moveDown();

  // Create a simple word cloud effect
  let currentX = doc.x;
  let currentY = doc.y;
  const pageWidth = 500;
  
  sortedWords.forEach(([word, count]) => {
    const fontSize = Math.max(10, Math.min(24, 10 + (count / maxCount) * 14));
    const wordWidth = doc.widthOfString(word);
    
    // Check if we need to move to next line
    if (currentX + wordWidth > doc.x + pageWidth) {
      currentX = doc.x;
      currentY += 30;
    }
    
    // Draw the word
    doc.fontSize(fontSize)
       .fillColor(getRandomColor())
       .text(word, currentX, currentY);
    
    currentX += wordWidth + 10;
  });

  doc.moveDown(4);
}

// Helper function to generate random colors for word cloud
function getRandomColor() {
  const colors = ['#3498db', '#2ecc71', '#e74c3c', '#f1c40f', '#9b59b6', '#1abc9c'];
  return colors[Math.floor(Math.random() * colors.length)];
}

module.exports = {
  getTwitterUserDetails,
  getUserTweets,
  createTwitterUserPdf
};