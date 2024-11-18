const PDFDocument = require('pdfkit');
const fs = require('fs');
const moment = require('moment');
const logger = require('../../config/logger');
const forensicsAnalyzer = require('../forensics');
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
  addPageNumbers
} = require('./utils/pdfSections');

async function createTwitterUserPdf(userDetails, tweets, numberOfTweets) {
  logger.info(`Starting enhanced forensic analysis and PDF generation`, {
    username: userDetails.username,
    numberOfTweets
  });

  return new Promise(async (resolve, reject) => {
    try {
      const forensicAnalysis = await forensicsAnalyzer.analyzeProfile(userDetails, tweets);
      const doc = await generatePdfReport(userDetails, tweets, forensicAnalysis);
      const filename = await savePdfReport(doc, userDetails.username);
      resolve(filename);
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

async function generatePdfReport(userDetails, tweets, forensicAnalysis) {
  const doc = new PDFDocument({
    size: 'A4',
    margins: { top: 50, bottom: 50, left: 50, right: 50 },
    bufferPages: true
  });

  // Add report sections
  await addCoverPage(doc, userDetails);
  await addTableOfContents(doc);
  await addExecutiveSummary(doc, userDetails, forensicAnalysis);
  await addProfileOverview(doc, userDetails);
  await addMetricsAnalysis(doc, userDetails, forensicAnalysis);
  await addContentAnalysis(doc, forensicAnalysis);
  await addTweetAnalysis(doc, tweets, forensicAnalysis);
  await addRiskAssessment(doc, forensicAnalysis);
  await addRecommendations(doc, forensicAnalysis);

  // Add page numbers
  addPageNumbers(doc);

  return doc;
}

async function savePdfReport(doc, username) {
  const filename = `${username}_forensic_report_${moment().format('YYYY-MM-DD')}.pdf`;
  const dir = 'public/pdf_files';
  
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  
  const outputPath = `${dir}/${filename}`;
  const writeStream = fs.createWriteStream(outputPath);

  return new Promise((resolve, reject) => {
    writeStream.on('error', reject);
    writeStream.on('finish', () => {
      logger.info(`Successfully created enhanced forensic report PDF`, { filename });
      resolve(filename);
    });

    doc.pipe(writeStream);
    doc.end();
  });
}

module.exports = {
  createTwitterUserPdf
};