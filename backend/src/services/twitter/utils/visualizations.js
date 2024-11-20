// Rest of the file remains unchanged
const { createCanvas, loadImage } = require('canvas');
const d3Cloud = require('d3-cloud');
const { ChartJSNodeCanvas } = require('chartjs-node-canvas');
const fs = require('fs');
const logger = require('../../../config/logger');

// Set canvas size for visualizations
const CANVAS_WIDTH = 800;
const CANVAS_HEIGHT = 600;

// Dynamically load d3 for Network Graph
async function getD3() {
  return await import('d3');
}

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
async function generateEngagementHeatmap(tweets) {
  try {
    const canvas = new ChartJSNodeCanvas({ width: 800, height: 600 });

    // Initialize engagement data for 24 hours
    const hourlyEngagement = Array(24).fill(0);

    // Aggregate engagement data by hour
    tweets.forEach(tweet => {
      const date = new Date(tweet.date);
      const hour = date.getHours(); // 0-23

      // Calculate total engagement for this tweet
      const engagement = tweet.likes + tweet.retweets + tweet.comments;

      // Add to the corresponding hour's engagement
      hourlyEngagement[hour] += engagement;
    });

    // Prepare data for Chart.js
    const hourLabels = Array.from({ length: 24 }, (_, i) => `${i}:00`);

    const data = {
      labels: hourLabels,
      datasets: [
        {
          label: 'Total Engagement',
          data: hourlyEngagement,
          backgroundColor: 'rgba(75, 192, 192, 0.7)', // Consistent color for all hours
          borderColor: 'rgba(75, 192, 192, 1)',
          borderWidth: 1,
        },
      ],
    };

    const config = {
      type: 'bar', // Bar chart
      data,
      options: {
        responsive: true,
        plugins: {
          title: {
            display: true,
            text: 'Engagement by Hour (All Days)',
            font: {
              size: 16,
            },
          },
          legend: {
            display: false, // Only one dataset, no legend needed
          },
        },
        scales: {
          x: {
            title: {
              display: true,
              text: 'Hour of Day',
            },
          },
          y: {
            title: {
              display: true,
              text: 'Total Engagement',
            },
          },
        },
      },
    };

    // Render the chart and return it as a buffer
    return await canvas.renderToBuffer(config);
  } catch (error) {
    console.error('Error generating Engagement Heatmap:', error);
    throw error;
  }
}




async function generateNetworkGraph(tweets, userDetails) {
  return new Promise(async (resolve, reject) => {
    try {
      const d3 = await getD3(); // Dynamically load d3
      const canvas = createCanvas(CANVAS_WIDTH, CANVAS_HEIGHT);
      const context = canvas.getContext('2d');

      // Build network data
      const nodes = new Map();
      const links = [];

      // Add the main user as a central node
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

      // Draw the graph
      context.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

      // Draw links (connections between nodes)
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

      // Draw nodes with labels
      nodeArray.forEach((node) => {
        context.beginPath();
        context.arc(node.x, node.y, 5, 0, 2 * Math.PI, false);
        context.fillStyle = node.group === 1 ? '#3498db' : node.group === 2 ? '#e74c3c' : '#2ecc71';
        context.fill();
        context.stroke();

        // Add labels (usernames or node IDs)
        context.font = '12px Arial';
        context.fillStyle = '#000';
        context.textAlign = 'center';
        context.fillText(node.id, node.x, node.y - 10);
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