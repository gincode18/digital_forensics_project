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

async function generateCharts(data, type, options = {}) {
  const canvas = createCanvas(500, 300);
  const ctx = canvas.getContext('2d');
  
  new Chart(ctx, {
    type,
    data,
    options: {
      responsive: true,
      ...options
    }
  });
  
  return canvas.toBuffer();
}

module.exports = {
  createTable,
  generateCharts
};