const express = require('express');
const cors = require('cors');
const logger = require('./config/logger');
const config = require('./config/config');
const twitterRoutes = require('./routes/twitter');
const instagramRoutes = require('./routes/instagram');


const app = express();

app.use((req, res, next) => {
  logger.info(`Incoming ${req.method} request to ${req.originalUrl}`, {
    method: req.method,
    path: req.originalUrl,
    query: req.query,
    body: req.method === 'POST' ? req.body : undefined,
    ip: req.ip,
    userAgent: req.get('user-agent')
  });
  next();
});

app.use(cors({
  origin: 'http://localhost:5173',
  credentials: true
}));
app.use(express.json());
app.use('/public', express.static('public'));

// Root endpoint
app.get('/', (req, res) => {
  logger.info("Root endpoint accessed");
  res.json({ message: "Social Media API Service" });
});

// Twitter endpoints
app.use('/api/v1/twitter', twitterRoutes);
app.use('/api/v1/instagram', instagramRoutes);


// Error handling middleware
app.use((err, req, res, next) => {
  logger.error('Unhandled error:', {
    error: err.message,
    stack: err.stack,
    path: req.path,
    method: req.method
  });
  res.status(500).json({ error: 'Internal server error' });
});

// Start server
const PORT = config.app.apiPort;
app.listen(PORT, () => {
  logger.info(`Server started successfully`, {
    port: PORT,
    environment: process.env.NODE_ENV || 'development',
    timestamp: new Date().toISOString()
  });
});