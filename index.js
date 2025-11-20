const express = require('express');
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const cors = require('cors');
require('dotenv').config();

const app = express();
const port = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

const uri = process.env.MONGODB_URI;
if (!uri) {
    console.error('MONGODB_URI environment variable is missing');
}

// Database configuration
const dbName = 'chill_gamer';

// Database connection function (for serverless compatibility)
async function connectToDatabase() {
    const client = new MongoClient(uri, {
        serverApi: {
            version: ServerApiVersion.v1,
            strict: true,
            deprecationErrors: true,
        }
    });

    try {
        await client.connect();
        const database = client.db(dbName);

        return {
            client,
            database,
            reviewsCollection: database.collection('reviews'),
            usersCollection: database.collection('users'),
            watchlistCollection: database.collection('watchlist'),
            gamesCollection: database.collection('games')
        };
    } catch (error) {
        console.error('Database connection failed:', error);
        throw error;
    }
}

// ========== HEALTH & TEST ROUTES ==========
app.get('/', (req, res) => {
    res.json({
        message: 'Chill Gamer Server is running!',
        environment: process.env.NODE_ENV || 'development',
        timestamp: new Date().toISOString()
    });
});

app.get('/health', async (req, res) => {
    try {
        const { reviewsCollection, gamesCollection, usersCollection, client } = await connectToDatabase();

        const gamesCount = await gamesCollection.countDocuments();
        const reviewsCount = await reviewsCollection.countDocuments();
        const usersCount = await usersCollection.countDocuments();

        await client.close();

        res.json({
            message: 'Chill Gamer API is running!',
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

// ========== REVIEWS API ROUTES ==========

// Get all reviews
app.get('/chill-gamer/reviews', async (req, res) => {
    let client;
    try {
        const { reviewsCollection, client: dbClient } = await connectToDatabase();
        client = dbClient;
        const reviews = await reviewsCollection.find().toArray();
        res.json(reviews);
    } catch (error) {
        console.error('Error fetching reviews:', error);
        res.status(500).json({ error: error.message });
    } finally {
        if (client) await client.close();
    }
});

// Get highest rated reviews (6)
app.get('/chill-gamer/reviews/highest-rated', async (req, res) => {
    let client;
    try {
        const { reviewsCollection, client: dbClient } = await connectToDatabase();
        client = dbClient;
        const reviews = await reviewsCollection.find()
            .sort({ rating: -1 })
            .limit(6)
            .toArray();
        res.json(reviews);
    } catch (error) {
        console.error('Error fetching highest rated reviews:', error);
        res.status(500).json({ error: error.message });
    } finally {
        if (client) await client.close();
    }
});

// Get single review by ID
app.get('/chill-gamer/reviews/:id', async (req, res) => {
    let client;
    try {
        const { reviewsCollection, client: dbClient } = await connectToDatabase();
        client = dbClient;
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
    } finally {
        if (client) await client.close();
    }
});

// Get user's reviews
app.get('/chill-gamer/reviews/user/:email', async (req, res) => {
    let client;
    try {
        const { reviewsCollection, client: dbClient } = await connectToDatabase();
        client = dbClient;
        const reviews = await reviewsCollection.find({
            userEmail: req.params.email
        }).toArray();
        res.json(reviews);
    } catch (error) {
        console.error('Error fetching user reviews:', error);
        res.status(500).json({ error: error.message });
    } finally {
        if (client) await client.close();
    }
});

// Create new review
app.post('/chill-gamer/reviews', async (req, res) => {
    let client;
    try {
        const { reviewsCollection, client: dbClient } = await connectToDatabase();
        client = dbClient;
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
    } finally {
        if (client) await client.close();
    }
});

// Update review
app.put('/chill-gamer/reviews/:id', async (req, res) => {
    let client;
    try {
        const { reviewsCollection, client: dbClient } = await connectToDatabase();
        client = dbClient;
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
    } finally {
        if (client) await client.close();
    }
});

// Delete review
app.delete('/chill-gamer/reviews/:id', async (req, res) => {
    let client;
    try {
        const { reviewsCollection, client: dbClient } = await connectToDatabase();
        client = dbClient;
        const result = await reviewsCollection.deleteOne({
            _id: new ObjectId(req.params.id)
        });
        res.json(result);
    } catch (error) {
        console.error('Error deleting review:', error);
        res.status(500).json({ error: error.message });
    } finally {
        if (client) await client.close();
    }
});

// ========== WATCHLIST API ROUTES ==========

// Get user's watchlist
app.get('/chill-gamer/watchlist/:email', async (req, res) => {
    let client;
    try {
        const { watchlistCollection, client: dbClient } = await connectToDatabase();
        client = dbClient;
        const watchlist = await watchlistCollection.find({
            userEmail: req.params.email
        }).toArray();
        res.json(watchlist);
    } catch (error) {
        console.error('Error fetching watchlist:', error);
        res.status(500).json({ error: error.message });
    } finally {
        if (client) await client.close();
    }
});

// Add to watchlist
app.post('/chill-gamer/watchlist', async (req, res) => {
    let client;
    try {
        const { watchlistCollection, client: dbClient } = await connectToDatabase();
        client = dbClient;
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
    } finally {
        if (client) await client.close();
    }
});

// Remove from watchlist
app.delete('/chill-gamer/watchlist/:id', async (req, res) => {
    let client;
    try {
        const { watchlistCollection, client: dbClient } = await connectToDatabase();
        client = dbClient;
        const result = await watchlistCollection.deleteOne({
            _id: new ObjectId(req.params.id)
        });
        res.json(result);
    } catch (error) {
        console.error('Error removing from watchlist:', error);
        res.status(500).json({ error: error.message });
    } finally {
        if (client) await client.close();
    }
});

// ========== GAMES API ROUTES ==========

// Get all games
app.get('/chill-gamer/games', async (req, res) => {
    let client;
    try {
        const { gamesCollection, client: dbClient } = await connectToDatabase();
        client = dbClient;
        const games = await gamesCollection.find().toArray();
        res.json(games);
    } catch (error) {
        console.error('Error fetching games:', error);
        res.status(500).json({ error: error.message });
    } finally {
        if (client) await client.close();
    }
});

// Get game by ID
app.get('/chill-gamer/games/:id', async (req, res) => {
    let client;
    try {
        const { gamesCollection, client: dbClient } = await connectToDatabase();
        client = dbClient;
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
    } finally {
        if (client) await client.close();
    }
});

// ========== USERS API ROUTES ==========

// Get user by email
app.get('/chill-gamer/users/:email', async (req, res) => {
    let client;
    try {
        const { usersCollection, client: dbClient } = await connectToDatabase();
        client = dbClient;
        const user = await usersCollection.findOne({
            email: req.params.email
        });
        res.json(user);
    } catch (error) {
        console.error('Error fetching user:', error);
        res.status(500).json({ error: error.message });
    } finally {
        if (client) await client.close();
    }
});

// Create or update user
app.post('/chill-gamer/users', async (req, res) => {
    let client;
    try {
        const { usersCollection, client: dbClient } = await connectToDatabase();
        client = dbClient;
        const user = {
            ...req.body,
            lastLogin: new Date(),
            joinDate: req.body.joinDate || new Date()
        };

        // Upsert user (create if doesn't exist, update if exists)
        const result = await usersCollection.updateOne(
            { email: req.body.email },
            { $set: user },
            { upsert: true }
        );

        res.json({ message: 'User processed successfully', result });
    } catch (error) {
        console.error('Error processing user:', error);
        res.status(500).json({ error: error.message });
    } finally {
        if (client) await client.close();
    }
});

// ========== SEARCH & FILTER ROUTES ==========

// Search reviews by game title
app.get('/chill-gamer/search/reviews', async (req, res) => {
    let client;
    try {
        const { reviewsCollection, client: dbClient } = await connectToDatabase();
        client = dbClient;
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
    } finally {
        if (client) await client.close();
    }
});

// Get all genres
app.get('/chill-gamer/genres', async (req, res) => {
    let client;
    try {
        const { reviewsCollection, client: dbClient } = await connectToDatabase();
        client = dbClient;
        const genres = await reviewsCollection.distinct('genre');
        res.json(genres);
    } catch (error) {
        console.error('Error fetching genres:', error);
        res.status(500).json({ error: 'Failed to load genres' });
    } finally {
        if (client) await client.close();
    }
});

// Start server only for local development
if (process.env.NODE_ENV !== 'production') {
    app.listen(port, () => {
        console.log(`Server is running on http://localhost:${port}`);
    });
}

// Vercel-compatible export
module.exports = app;