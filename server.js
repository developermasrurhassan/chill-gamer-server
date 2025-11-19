const express = require('express');
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const cors = require('cors');
const serverless = require('serverless-http');

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// MongoDB Configuration
const uri = process.env.MONGODB_URI;
const dbName = 'chill_gamer';

const client = new MongoClient(uri, {
    serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
    }
});

let db;
let isConnected = false;

async function connectDB() {
    if (isConnected) return db;

    try {
        await client.connect();
        db = client.db(dbName);
        isConnected = true;
        console.log("✅ Connected to MongoDB!");
        return db;
    } catch (error) {
        console.error("❌ MongoDB connection error:", error);
        throw error;
    }
}

// Initialize database
connectDB().catch(console.error);

// ========== COPY ALL YOUR ROUTES FROM index.js HERE ==========

// Root endpoint
app.get('/', (req, res) => {
    res.json({
        message: 'Chill Gamer Server is running on Netlify!',
        database: isConnected ? 'Connected to MongoDB' : 'Connecting...',
        timestamp: new Date().toISOString()
    });
});

// Health check
app.get('/health', async (req, res) => {
    try {
        const database = await connectDB();
        const gamesCollection = database.collection('games');
        const reviewsCollection = database.collection('reviews');
        const usersCollection = database.collection('users');

        const gamesCount = await gamesCollection.countDocuments();
        const reviewsCount = await reviewsCollection.countDocuments();
        const usersCount = await usersCollection.countDocuments();

        res.json({
            message: 'Chill Gamer API is running on Netlify!',
            timestamp: new Date().toISOString(),
            database: {
                status: 'Connected',
                games: gamesCount,
                reviews: reviewsCount,
                users: usersCount
            }
        });
    } catch (error) {
        res.status(500).json({
            message: 'API running but database error',
            error: error.message
        });
    }
});

// COPY ALL YOUR OTHER ROUTES HERE (same as your index.js)
// Get all reviews
app.get('/chill-gamer/reviews', async (req, res) => {
    try {
        const database = await connectDB();
        const reviewsCollection = database.collection('reviews');
        const reviews = await reviewsCollection.find().toArray();
        res.json(reviews);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Continue with all your other routes...

// Netlify serverless export
module.exports.handler = serverless(app);