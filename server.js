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

// =============================================================================
// CONFIGURATION
// =============================================================================

const config = {
    port: process.env.PORT || 3000,
    env: process.env.NODE_ENV || 'development',
    mongoUri: process.env.MONGODB_URI,
    apiVersion: '1.0.0',
    serviceName: 'Piazza API'
};

// Fail fast if critical configuration is missing
if (!config.mongoUri) {
    console.error('[FATAL] MONGODB_URI environment variable is not set.');
    console.error('Please check your .env file or environment configuration.');
    process.exit(1);
}

// =============================================================================
// EXPRESS APP INITIALIZATION
// =============================================================================

const app = express();

// =============================================================================
// MIDDLEWARE STACK
// =============================================================================

// CORS - Allow cross-origin requests
// In production, you'd want to restrict this to specific origins
app.use(cors());

// Body parsing - handles JSON and URL-encoded form data
app.use(express.json({ limit: '10kb' })); // Limit payload size to prevent abuse
app.use(express.urlencoded({ extended: true }));

// Request logging - helpful for debugging during development
if (config.env === 'development') {
    app.use((req, res, next) => {
        console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
        next();
    });
}

// =============================================================================
// DATABASE CONNECTION
// =============================================================================

/**
 * Establishes connection to MongoDB with retry logic.
 * 
 * The deprecated options (useNewUrlParser, useUnifiedTopology) have been
 * removed as they're no longer needed in Mongoose 6+. If you're on an older
 * version, you may need to add them back.
 */
async function connectToDatabase() {
    const MAX_RETRIES = 3;
    const RETRY_DELAY_MS = 5000;
    
    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
        try {
            console.log(`[DB] Connection attempt ${attempt}/${MAX_RETRIES}...`);
            
            await mongoose.connect(config.mongoUri);
            
            console.log('[DB] MongoDB connected successfully');
            return;
            
        } catch (error) {
            console.error(`[DB] Connection attempt ${attempt} failed:`, error.message);
            
            if (attempt === MAX_RETRIES) {
                console.error('[FATAL] Could not connect to MongoDB after multiple attempts.');
                process.exit(1);
            }
            
            console.log(`[DB] Retrying in ${RETRY_DELAY_MS / 1000} seconds...`);
            await new Promise(resolve => setTimeout(resolve, RETRY_DELAY_MS));
        }
    }
}

// Handle connection events for monitoring
mongoose.connection.on('disconnected', () => {
    console.warn('[DB] MongoDB connection lost. Attempting to reconnect...');
});

mongoose.connection.on('error', (err) => {
    console.error('[DB] MongoDB error:', err.message);
});

// =============================================================================
// API ROUTES
// =============================================================================

// Mount route modules
app.use('/api/auth', require('./src/routes/auth'));
app.use('/api/posts', require('./src/routes/posts'));

// --- Informational Endpoints ---

/**
 * Root endpoint - provides API overview and available endpoints.
 * Useful for developers exploring the API.
 */
app.get('/', (req, res) => {
    res.json({
        service: config.serviceName,
        version: config.apiVersion,
        documentation: '/api-docs', // Future: add Swagger docs
        endpoints: {
            auth: '/api/auth',
            posts: '/api/posts',
            health: '/health',
            status: '/api/status'
        }
    });
});

/**
 * Health check endpoint - lightweight check for load balancers.
 * Returns 200 if the server is running, regardless of database state.
 */
app.get('/health', (req, res) => {
    res.json({
        status: 'ok',
        timestamp: new Date().toISOString()
    });
});

/**
 * Status endpoint - detailed system status including database connectivity.
 * More comprehensive than /health, useful for monitoring dashboards.
 */
app.get('/api/status', (req, res) => {
    const dbStates = ['disconnected', 'connected', 'connecting', 'disconnecting'];
    const dbState = dbStates[mongoose.connection.readyState] || 'unknown';
    
    res.json({
        service: config.serviceName,
        version: config.apiVersion,
        status: dbState === 'connected' ? 'operational' : 'degraded',
        uptime: Math.floor(process.uptime()),
        timestamp: new Date().toISOString(),
        environment: config.env,
        database: {
            status: dbState,
            name: mongoose.connection.name || 'N/A'
        }
    });
});

// =============================================================================
// ERROR HANDLING
// =============================================================================

/**
 * 404 Handler - catches requests to undefined routes.
 * Must be placed after all valid routes.
 */
app.use((req, res) => {
    res.status(404).json({
        success: false,
        error: 'Not Found',
        message: `The requested endpoint ${req.method} ${req.path} does not exist.`,
        suggestion: 'Check the API documentation at /'
    });
});

/**
 * Global Error Handler - catches all unhandled errors.
 * 
 * In production, we hide internal error details from the client
 * to avoid leaking sensitive information.
 */
app.use((err, req, res, next) => {
    // Log the full error for debugging
    console.error('[ERROR]', {
        message: err.message,
        stack: config.env === 'development' ? err.stack : undefined,
        path: req.path,
        method: req.method
    });
    
    // Determine appropriate status code
    const statusCode = err.statusCode || err.status || 500;
    
    // Build response - hide details in production
    const response = {
        success: false,
        error: statusCode === 500 ? 'Internal Server Error' : err.message
    };
    
    // Include stack trace only in development
    if (config.env === 'development') {
        response.stack = err.stack;
    }
    
    res.status(statusCode).json(response);
});

// =============================================================================
// GRACEFUL SHUTDOWN
// =============================================================================

/**
 * Handles cleanup when the server is shutting down.
 * Ensures database connections are closed properly.
 */
async function gracefulShutdown(signal) {
    console.log(`\n[SERVER] Received ${signal}. Starting graceful shutdown...`);
    
    try {
        await mongoose.connection.close();
        console.log('[DB] MongoDB connection closed.');
        
        console.log('[SERVER] Shutdown complete. Goodbye!');
        process.exit(0);
        
    } catch (error) {
        console.error('[SERVER] Error during shutdown:', error.message);
        process.exit(1);
    }
}

// Listen for termination signals
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// =============================================================================
// SERVER STARTUP
// =============================================================================

/**
 * Initializes the application - connects to database and starts the server.
 */
async function startServer() {
    // Connect to database first
    await connectToDatabase();
    
    // Start listening for requests
    app.listen(config.port, () => {
        console.log('='.repeat(50));
        console.log(`  ${config.serviceName} v${config.apiVersion}`);
        console.log(`  Environment: ${config.env}`);
        console.log(`  Port: ${config.port}`);
        console.log(`  Started: ${new Date().toISOString()}`);
        console.log('='.repeat(50));
    });
}

// Kick off the server
startServer().catch((error) => {
    console.error('[FATAL] Failed to start server:', error.message);
    process.exit(1);
});
