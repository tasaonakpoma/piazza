/**
 * Piazza API - Application Entry Point
 * 
 * This is the main server file that bootstraps the Express application.
 * It handles configuration loading, middleware setup, route mounting,
 * database connection, and graceful shutdown procedures.
 * 
 * Architecture Notes:
 * - Routes are split into separate modules under ./src/routes/
 * - Database connection is managed here but could be extracted to a db.js module
 * - Error handling is centralized at the bottom of the middleware stack
 */
require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// Dev logging
if (process.env.NODE_ENV !== 'production') {
  app.use((req, res, next) => {
    console.log(`${req.method} ${req.path}`);
    next();
  });
}

// MongoDB connection
mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log('MongoDB connected'))
  .catch(err => {
    console.error('DB connection failed:', err.message);
    process.exit(1);
  });

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/posts', require('./routes/posts'));

app.get('/', (req, res) => {
  res.json({ name: 'Piazza API', version: '1.0.0' });
});

app.get('/health', (req, res) => res.json({ status: 'ok' }));

// 404
app.use((req, res) => {
  res.status(404).json({ error: 'Not found' });
});

// Error handler
app.use((err, req, res, next) => {
  console.error(err.message);
  res.status(500).json({ error: 'Server error' });
});

app.listen(PORT, () => console.log(`Server on port ${PORT}`));
