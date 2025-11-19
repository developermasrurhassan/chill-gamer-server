const express = require('express');
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const cors = require('cors');

const app = express();
const port = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

// MongoDB connection - lazy initialization
let db = null;
let isConnecting = false;

const connectDB = async () => {
    if (db) return db;
    if (isConnecting) {
        // Wait for connection to complete
        return new Promise((resolve) => {
            const checkConnection = setInterval(() => {
                if (db) {
                    clearInterval(checkConnection);
                    resolve(db);
                }
            }, 100);
        });
    }

    isConnecting = true;
    try {
        const uri = process.env.MONGODB_URI;
        if (!uri) {
            throw new Error('MONGODB_URI environment variable is required');
        }

        const client = new MongoClient(uri, {
            serverApi: {
                version: ServerApiVersion.v1,
                strict: true,
                deprecationErrors: true,
            }
        });

        await client.connect();
        console.log("Connected to MongoDB!");
        db = client.db('chill_gamer');
        isConnecting = false;
        return db;
    } catch (error) {
        isConnecting = false;
        console.error('MongoDB connection error:', error);
        throw error;
    }
};

// Helper to get collections
const getCollections = async () => {
    const database = await connectDB();
    return {
        reviewsCollection: database.collection('reviews'),
        usersCollection: database.collection('users'),
        watchlistCollection: database.collection('watchlist'),
        gamesCollection: database.collection('games')
    };
};

// Health check without DB connection
app.get('/', (req, res) => {
    res.json({
        message: 'Chill Gamer API is running!',
        timestamp: new Date().toISOString(),
        status: 'OK'
    });
});

// Simple test route
app.get('/test', async (req, res) => {
    try {
        const collections = await getCollections();
        res.json({
            message: 'Database connection test successful!',
            collections: Object.keys(collections)
        });
    } catch (error) {
        res.status(500).json({
            error: 'Database connection failed',
            message: error.message
        });
    }
});

// ========== REVIEWS API ROUTES ==========

// Get all reviews
app.get('/chill-gamer/reviews', async (req, res) => {
    try {
        const { reviewsCollection } = await getCollections();
        const reviews = await reviewsCollection.find().toArray();
        res.json(reviews);
    } catch (error) {
        console.error('Error fetching reviews:', error);
        res.status(500).json({ error: error.message });
    }
});

// Get highest rated reviews (6)
app.get('/chill-gamer/reviews/highest-rated', async (req, res) => {
    try {
        const { reviewsCollection } = await getCollections();
        const reviews = await reviewsCollection.find()
            .sort({ rating: -1 })
            .limit(6)
            .toArray();
        res.json(reviews);
    } catch (error) {
        console.error('Error fetching highest rated reviews:', error);
        res.status(500).json({ error: error.message });
    }
});

// Get single review by ID
app.get('/chill-gamer/reviews/:id', async (req, res) => {
    try {
        const { reviewsCollection } = await getCollections();
        const review = await reviewsCollection.findOne({
            _id: new ObjectId(req.params.id)
        });
        if (!review) {
            return res.status(404).json({ error: 'Review not found' });
        }
        res.json(review);
    } catch (error) {
        console.error('Error fetching review:', error);
        res.status(500).json({ error: error.message });
    }
});

// Get user's reviews
app.get('/chill-gamer/reviews/user/:email', async (req, res) => {
    try {
        const { reviewsCollection } = await getCollections();
        const reviews = await reviewsCollection.find({
            userEmail: req.params.email
        }).toArray();
        res.json(reviews);
    } catch (error) {
        console.error('Error fetching user reviews:', error);
        res.status(500).json({ error: error.message });
    }
});

// Create new review
app.post('/chill-gamer/reviews', async (req, res) => {
    try {
        const { reviewsCollection } = await getCollections();
        const review = {
            ...req.body,
            createdAt: new Date(),
            updatedAt: new Date()
        };
        const result = await reviewsCollection.insertOne(review);
        res.json({ ...review, _id: result.insertedId });
    } catch (error) {
        console.error('Error creating review:', error);
        res.status(500).json({ error: error.message });
    }
});

// Update review
app.put('/chill-gamer/reviews/:id', async (req, res) => {
    try {
        const { reviewsCollection } = await getCollections();
        const result = await reviewsCollection.updateOne(
            { _id: new ObjectId(req.params.id) },
            {
                $set: {
                    ...req.body,
                    updatedAt: new Date()
                }
            }
        );
        res.json(result);
    } catch (error) {
        console.error('Error updating review:', error);
        res.status(500).json({ error: error.message });
    }
});

// Delete review
app.delete('/chill-gamer/reviews/:id', async (req, res) => {
    try {
        const { reviewsCollection } = await getCollections();
        const result = await reviewsCollection.deleteOne({
            _id: new ObjectId(req.params.id)
        });
        res.json(result);
    } catch (error) {
        console.error('Error deleting review:', error);
        res.status(500).json({ error: error.message });
    }
});

// ========== WATCHLIST API ROUTES ==========

// Get user's watchlist
app.get('/chill-gamer/watchlist/:email', async (req, res) => {
    try {
        const { watchlistCollection } = await getCollections();
        const watchlist = await watchlistCollection.find({
            userEmail: req.params.email
        }).toArray();
        res.json(watchlist);
    } catch (error) {
        console.error('Error fetching watchlist:', error);
        res.status(500).json({ error: error.message });
    }
});

// Add to watchlist
app.post('/chill-gamer/watchlist', async (req, res) => {
    try {
        const { watchlistCollection } = await getCollections();
        // Check if already in watchlist
        const existingItem = await watchlistCollection.findOne({
            userEmail: req.body.userEmail,
            gameTitle: req.body.gameTitle
        });

        if (existingItem) {
            return res.status(400).json({ error: 'Already in watchlist' });
        }

        const watchlistItem = {
            ...req.body,
            addedAt: new Date()
        };
        const result = await watchlistCollection.insertOne(watchlistItem);
        res.json({ ...watchlistItem, _id: result.insertedId });
    } catch (error) {
        console.error('Error adding to watchlist:', error);
        res.status(500).json({ error: error.message });
    }
});

// Remove from watchlist
app.delete('/chill-gamer/watchlist/:id', async (req, res) => {
    try {
        const { watchlistCollection } = await getCollections();
        const result = await watchlistCollection.deleteOne({
            _id: new ObjectId(req.params.id)
        });
        res.json(result);
    } catch (error) {
        console.error('Error removing from watchlist:', error);
        res.status(500).json({ error: error.message });
    }
});

// ========== GAMES API ROUTES ==========

// Get all games
app.get('/chill-gamer/games', async (req, res) => {
    try {
        const { gamesCollection } = await getCollections();
        const games = await gamesCollection.find().toArray();
        res.json(games);
    } catch (error) {
        console.error('Error fetching games:', error);
        res.status(500).json({ error: error.message });
    }
});

// Get game by ID
app.get('/chill-gamer/games/:id', async (req, res) => {
    try {
        const { gamesCollection } = await getCollections();
        const game = await gamesCollection.findOne({
            _id: new ObjectId(req.params.id)
        });
        if (!game) {
            return res.status(404).json({ error: 'Game not found' });
        }
        res.json(game);
    } catch (error) {
        console.error('Error fetching game:', error);
        res.status(500).json({ error: error.message });
    }
});

// ========== USERS API ROUTES ==========

// Get user by email
app.get('/chill-gamer/users/:email', async (req, res) => {
    try {
        const { usersCollection } = await getCollections();
        const user = await usersCollection.findOne({
            email: req.params.email
        });
        res.json(user);
    } catch (error) {
        console.error('Error fetching user:', error);
        res.status(500).json({ error: error.message });
    }
});

// Create or update user
app.post('/chill-gamer/users', async (req, res) => {
    try {
        const { usersCollection } = await getCollections();
        const user = {
            ...req.body,
            lastLogin: new Date(),
            joinDate: req.body.joinDate || new Date()
        };

        const result = await usersCollection.updateOne(
            { email: req.body.email },
            { $set: user },
            { upsert: true }
        );

        res.json({ message: 'User processed successfully', result });
    } catch (error) {
        console.error('Error processing user:', error);
        res.status(500).json({ error: error.message });
    }
});

// ========== SEARCH & FILTER ROUTES ==========

// Search reviews by game title
app.get('/chill-gamer/search/reviews', async (req, res) => {
    try {
        const { reviewsCollection } = await getCollections();
        const { q, genre, minRating } = req.query;
        let filter = {};

        if (q) {
            filter.gameTitle = { $regex: q, $options: 'i' };
        }

        if (genre) {
            filter.genre = genre;
        }

        if (minRating) {
            filter.rating = { $gte: parseInt(minRating) };
        }

        const reviews = await reviewsCollection.find(filter).toArray();
        res.json(reviews);
    } catch (error) {
        console.error('Error searching reviews:', error);
        res.status(500).json({ error: error.message });
    }
});

// Get all genres
app.get('/chill-gamer/genres', async (req, res) => {
    try {
        const { reviewsCollection } = await getCollections();
        const genres = await reviewsCollection.distinct('genre');
        res.json(genres);
    } catch (error) {
        console.error('Error fetching genres:', error);
        res.status(500).json({ error: 'Failed to load genres' });
    }
});

// Error handling middleware
app.use((error, req, res, next) => {
    console.error('Unhandled error:', error);
    res.status(500).json({
        error: 'Internal server error',
        message: error.message
    });
});

// 404 handler
app.use('*', (req, res) => {
    res.status(404).json({ error: 'Route not found' });
});

// Vercel-compatible export
module.exports = app;