const PDFDocument = require("pdfkit");
const fs = require("fs");
const moment = require("moment");
const logger = require("../../config/logger");
const forensicsAnalyzer = require("../forensics");
const {
  generateWordCloud,
  generateEngagementHeatmap,
  generateNetworkGraph,
} = require("./utils/visualizations");
const {
  addCoverPage,
  addTableOfContents,
  addExecutiveSummary,
  addProfileOverview,
  addMetricsAnalysis,
  addContentAnalysis,
  addTweetAnalysis,
  addRiskAssessment,
  addRecommendations,
  addPageNumbers,
  addSentimentAnalysis,
  addTrendingTopics,
  addEngagementMetricsOverTime,
  addEnhancedRecommendations,
} = require("./utils/pdfSections");

async function createTwitterUserPdf(userDetails, tweets, numberOfTweets) {
  logger.info(`Starting forensic analysis and PDF generation`, {
    username: userDetails.username,
    numberOfTweets,
  });

  return new Promise(async (resolve, reject) => {
    try {
      const forensicAnalysis = await forensicsAnalyzer.analyzeProfile(
        userDetails,
        tweets
      );
      const doc = await generatePdfReport(
        userDetails,
        tweets,
        forensicAnalysis
      );
      const filename = await savePdfReport(doc, userDetails.username);
      resolve(filename);
    } catch (error) {
      logger.error(`Failed to create forensic report`, {
        username: userDetails.username,
        error: error.message,
        stack: error.stack,
      });
      reject(error);
    }
  });
}

async function generatePdfReport(userDetails, tweets, forensicAnalysis) {
  const defaultAnalysis = {
    profileMetrics: { engagementRate: 0 },
    contentAnalysis: {
      overallSentiment: { category: "Neutral", score: 0 },
      sentimentDistribution: { positive: 0, neutral: 0, negative: 0 },
      sentimentBreakdown: [],
    },
    riskLevel: "Low",
    riskIndicators: [],
    recommendations: [],
  };

  forensicAnalysis = { ...defaultAnalysis, ...forensicAnalysis };

  const doc = new PDFDocument({
    size: "A4",
    margins: { top: 50, bottom: 50, left: 50, right: 50 },
    bufferPages: true,
  });

  try {
    // Generate visualizations
    logger.info("Generating visualizations...");
    const [wordCloudBuffer, heatmapBuffer, networkBuffer] = await Promise.all([
      generateWordCloud(tweets),
      generateEngagementHeatmap(tweets),
      generateNetworkGraph(tweets, userDetails),
    ]);

    // Add Cover Page
    await addCoverPage(doc, userDetails);

    // Add Table of Contents
    await addTableOfContents(doc);

    // Add Report Sections
    await addExecutiveSummary(doc, userDetails, forensicAnalysis);
    await addProfileOverview(doc, userDetails);
    await addMetricsAnalysis(doc, userDetails, forensicAnalysis);

    // Visualization: Word Cloud
    addVisualizationPage(doc, "Content Word Cloud", wordCloudBuffer);

    // Visualization: Engagement Heatmap
    addVisualizationPage(doc, "Engagement Pattern Heatmap", heatmapBuffer);

    // Visualization: Network Graph
    addVisualizationPage(doc, "Interaction Network Graph", networkBuffer);

    // Additional Sections
    await addContentAnalysis(doc, forensicAnalysis);
    await addSentimentAnalysis(doc, forensicAnalysis.contentAnalysis);
    await addTweetAnalysis(doc, tweets, forensicAnalysis);
    await addTrendingTopics(doc, tweets);
    await addEngagementMetricsOverTime(doc, tweets);
    await addRiskAssessment(doc, userDetails, tweets);
    await addEnhancedRecommendations(
      doc,
      forensicAnalysis,
      userDetails,
      tweets
    );

    // Add Page Numbers
    addPageNumbers(doc);
  } catch (error) {
    logger.error("Error while generating PDF content", {
      error: error.message,
      stack: error.stack,
    });
    throw error;
  }

  return doc;
}

function addVisualizationPage(doc, title, buffer) {
  try {
    doc.addPage();
    doc
      .fontSize(16)
      .fillColor("#2c3e50")
      .text(title, { align: "center" })
      .moveDown();
    doc.image(buffer, {
      fit: [500, 300],
      align: "center",
      valign: "center",
    });
    doc.moveDown();
  } catch (error) {
    logger.error(`Failed to add visualization: ${title}`, {
      error: error.message,
      stack: error.stack,
    });
  }
}

async function savePdfReport(doc, username) {
  const filename = `${username}_forensic_report_${moment().format(
    "YYYY-MM-DD"
  )}.pdf`;
  const dir = "public/pdf_files";

  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  const outputPath = `${dir}/${filename}`;
  const writeStream = fs.createWriteStream(outputPath);

  return new Promise((resolve, reject) => {
    writeStream.on("error", reject);
    writeStream.on("finish", () => {
      logger.info(`Successfully created forensic report PDF`, { filename });
      resolve(outputPath);
    });

    doc.pipe(writeStream);
    doc.end();
  });
}

module.exports = {
  createTwitterUserPdf,
};
