/**
 * MongoDB Connection Module
 * 
 * Handles the database connection lifecycle for the Piazza application.
 * This module establishes a connection to MongoDB Atlas and exports
 * the client and database instances for use throughout the application.
 */

const { MongoClient, ServerApiVersion } = require('mongodb');

// --- Configuration ---
// In a production environment, these values should come from environment variables
// to avoid exposing credentials in source control. For example:
// const MONGODB_URI = process.env.MONGODB_URI;
const config = {
    uri: "mongodb+srv://piazzaUser:N79FJa2hlycx4dxq@piazza-cluster.7z6mqgs.mongodb.net/?appName=piazza-cluster",
    dbName: "piazza",
    options: {
        serverApi: {
            version: ServerApiVersion.v1,
            strict: true,
            deprecationErrors: true,
        }
    }
};

// --- Database Client ---
// We create the client instance once and reuse it across the application.
// This is more efficient than creating a new connection for every request.
const client = new MongoClient(config.uri, config.options);

// A reference to the database, populated after a successful connection.
let db = null;

/**
 * Establishes a connection to the MongoDB database.
 * 
 * This function is idempotent—calling it multiple times will not create
 * multiple connections. If a connection already exists, it simply returns.
 * 
 * @returns {Promise<object>} A promise that resolves to the database instance.
 * @throws {Error} If the connection to the database fails.
 */
async function connectToDatabase() {
    // If we already have a database connection, reuse it.
    if (db) {
        return db;
    }

    try {
        console.log('Attempting to connect to MongoDB...');
        await client.connect();

        // A ping command is a lightweight way to verify the connection is live.
        await client.db("admin").command({ ping: 1 });
        console.log('Successfully connected to MongoDB Atlas.');

        db = client.db(config.dbName);
        return db;

    } catch (error) {
        // Log the full error for debugging, but don't expose internals to the caller.
        console.error('[FATAL] Failed to connect to MongoDB:', error.message);
        // In a real application, you might want to implement retry logic here.
        // For now, we re-throw to signal that the application cannot proceed.
        throw new Error('Database connection failed. The application cannot start.');
    }
}

/**
 * Gracefully closes the database connection.
 * 
 * This should be called when the application is shutting down to ensure
 * all resources are released properly.
 */
async function closeDatabaseConnection() {
    if (client) {
        console.log('Closing MongoDB connection...');
        await client.close();
        db = null;
        console.log('MongoDB connection closed.');
    }
}

// --- Graceful Shutdown ---
// Listen for termination signals to close the database connection cleanly.
// This prevents connection leaks and ensures data integrity on shutdown.
process.on('SIGINT', async () => {
    await closeDatabaseConnection();
    process.exit(0);
});

process.on('SIGTERM', async () => {
    await closeDatabaseConnection();
    process.exit(0);
});


// --- Module Exports ---
// Export the connection function and the client for use in other parts of the app.
module.exports = {
    connectToDatabase,
    closeDatabaseConnection,
    getClient: () => client,
    getDb: () => db,
};
