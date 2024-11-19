const { createCanvas, loadImage } = require('canvas');
// const d3 = require('d3');
const d3Cloud = require('d3-cloud');
const { ChartJSNodeCanvas } = require('chartjs-node-canvas');

const fs = require('fs');
const logger = require('../../../config/logger');
async function getD3() {
  return await import('d3');
}

// Set canvas size for visualizations
const CANVAS_WIDTH = 800;
const CANVAS_HEIGHT = 600;


async function generateWordCloud(tweets) {
  return new Promise((resolve, reject) => {
    try {
      // Create a canvas to use for word cloud generation
      const canvas = createCanvas(CANVAS_WIDTH, CANVAS_HEIGHT);
      const context = canvas.getContext('2d');

      const wordCounts = {};

      // Count word frequencies
      tweets.forEach(({ text }) => {
        text.split(/\s+/).forEach((word) => {
          const sanitizedWord = word.toLowerCase().replace(/[^a-z0-9]/g, '');
          if (sanitizedWord) {
            wordCounts[sanitizedWord] = (wordCounts[sanitizedWord] || 0) + 1;
          }
        });
      });

      // Prepare words for the word cloud
      const wordEntries = Object.entries(wordCounts).map(([word, count]) => ({
        text: word,
        size: Math.sqrt(count) * 10,
      }));

      // Use d3-cloud to generate the word cloud
      const layout = d3Cloud()
        .size([CANVAS_WIDTH, CANVAS_HEIGHT])
        .words(wordEntries)
        .padding(5)
        .rotate(() => (Math.random() > 0.5 ? 0 : 90))
        .font('Impact')
        .fontSize((d) => d.size)
        .canvas(() => canvas) // Use node-canvas as the canvas
        .on('end', (words) => {
          // Clear the canvas and draw the word cloud
          context.fillStyle = '#ffffff';
          context.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

          context.fillStyle = '#000000';
          context.textAlign = 'center';

          // Draw each word on the canvas
          words.forEach((word) => {
            context.save();
            context.translate(word.x + CANVAS_WIDTH / 2, word.y + CANVAS_HEIGHT / 2);
            context.rotate((word.rotate * Math.PI) / 180);
            context.font = `${word.size}px Impact`;
            context.fillText(word.text, 0, 0);
            context.restore();
          });

          // Return the canvas as a buffer
          resolve(canvas.toBuffer('image/png'));
        })
        .start();
    } catch (error) {
      // Log the error and reject the promise
      logger.error('Error generating Word Cloud', { error: error.message });
      reject(error);
    }
  });
}

/**
 * Generate an Engagement Heatmap.
 * @param {Array} tweets - Array of tweet objects with a "createdAt" property.
 * @returns {Promise<Buffer>} - A buffer containing the Heatmap image.
 */
async function generateEngagementHeatmap(tweets) {
  try {
    const canvas = new ChartJSNodeCanvas({ width: CANVAS_WIDTH, height: CANVAS_HEIGHT });

    const engagementByHour = Array.from({ length: 24 }, () => 0);
    tweets.forEach(({ createdAt }) => {
      const hour = new Date(createdAt).getHours();
      engagementByHour[hour]++;
    });

    const data = {
      labels: Array.from({ length: 24 }, (_, i) => `${i}:00`),
      datasets: [
        {
          label: 'Engagement by Hour',
          data: engagementByHour,
          backgroundColor: 'rgba(75, 192, 192, 0.6)',
          borderColor: 'rgba(75, 192, 192, 1)',
          borderWidth: 1,
        },
      ],
    };

    const config = {
      type: 'bar',
      data,
      options: {
        scales: {
          x: { title: { display: true, text: 'Hour of Day' } },
          y: { title: { display: true, text: 'Number of Tweets' } },
        },
      },
    };

    return canvas.renderToBuffer(config);
  } catch (error) {
    logger.error('Error generating Engagement Heatmap', { error: error.message });
    throw error;
  }
}

/**
 * Generate a Network Graph of user interactions.
 * @param {Array} tweets - Array of tweet objects with "author" and "mentions".
 * @param {Object} userDetails - The main user's details.
 * @returns {Promise<Buffer>} - A buffer containing the Network Graph image.
 */
async function generateNetworkGraph(tweets, userDetails) {
  return new Promise( async (resolve, reject) => {
    try {
      const d3 = await getD3(); // Dynamically load d3
      const canvas = createCanvas(CANVAS_WIDTH, CANVAS_HEIGHT);
      const context = canvas.getContext('2d');

      // Build network data
      const nodes = new Map();
      const links = [];

      nodes.set(userDetails.username, { id: userDetails.username, group: 1 });

      tweets.forEach(({ author, mentions = [] }) => {
        if (!nodes.has(author)) {
          nodes.set(author, { id: author, group: 2 });
        }

        mentions.forEach((mention) => {
          if (!nodes.has(mention)) {
            nodes.set(mention, { id: mention, group: 3 });
          }

          links.push({ source: author, target: mention });
        });
      });

      const nodeArray = Array.from(nodes.values());

      // D3 Force Layout for positioning
      const simulation = d3.forceSimulation(nodeArray)
        .force(
          'link',
          d3.forceLink(links).id((d) => d.id).distance(100)
        )
        .force('charge', d3.forceManyBody().strength(-200))
        .force('center', d3.forceCenter(CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2))
        .stop();

      // Run simulation for fixed iterations
      for (let i = 0; i < 150; i++) simulation.tick();

      // Draw graph
      context.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

      context.strokeStyle = '#cccccc';
      links.forEach((link) => {
        const source = nodeArray.find((n) => n.id === link.source);
        const target = nodeArray.find((n) => n.id === link.target);
        if (source && target) {
          context.beginPath();
          context.moveTo(source.x, source.y);
          context.lineTo(target.x, target.y);
          context.stroke();
        }
      });

      nodeArray.forEach((node) => {
        context.beginPath();
        context.arc(node.x, node.y, 5, 0, 2 * Math.PI, false);
        context.fillStyle = node.group === 1 ? '#3498db' : node.group === 2 ? '#e74c3c' : '#2ecc71';
        context.fill();
        context.stroke();
      });

      resolve(canvas.toBuffer('image/png'));
    } catch (error) {
      logger.error('Error generating Network Graph', { error: error.message });
      reject(error);
    }
  });
}

module.exports = {
  generateWordCloud,
  generateEngagementHeatmap,
  generateNetworkGraph,
};
