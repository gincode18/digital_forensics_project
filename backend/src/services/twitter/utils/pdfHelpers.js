const { Chart } = require('chart.js');
const { createCanvas } = require('canvas');

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

async function generateCharts(data, type = 'bar', options = {}) {
  const canvas = createCanvas(600, 400);
  const ctx = canvas.getContext('2d');

  // Default options
  const defaultOptions = {
    responsive: true,
    plugins: {
      legend: {
        display: true,
        position: 'top'
      },
      title: {
        display: true,
        text: data.title || `${type.toUpperCase()} Chart`
      }
    }
  };
  // Merge default options with provided options
  const chartOptions = {
    ...defaultOptions,
    ...options
  };

  // Create chart
  new Chart(ctx, {
    type: type,
    data: data,
    options: chartOptions
  });

  // Convert to buffer
  return canvas.toBuffer('image/png');
}

function extractHashtags(text) {
  if (!text) return [];
  
  // Regular expression to match hashtags
  const hashtagRegex = /#(\w+)/g;
  const hashtags = [];
  let match;

  while ((match = hashtagRegex.exec(text)) !== null) {
    hashtags.push(match[1]);
  }

  return hashtags;
}

module.exports = {
  createTable,
  generateCharts,
  extractHashtags
};