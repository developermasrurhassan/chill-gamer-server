const express = require('express');
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const cors = require('cors');
require('dotenv').config();

const app = express();
const port = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

// MongoDB connection
const uri = process.env.MONGODB_URI;
if (!uri) {
    console.error('MONGODB_URI environment variable is required');
    process.exit(1);
}

const client = new MongoClient(uri, {
    serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
    }
});

// Database Name
const dbName = 'chill_gamer';

// Database collections (will be initialized in run())
let reviewsCollection, usersCollection, watchlistCollection, gamesCollection;

async function run() {
    try {
        await client.connect();
        console.log("Connected to MongoDB!");

        const database = client.db(dbName);
        reviewsCollection = database.collection('reviews');
        usersCollection = database.collection('users');
        watchlistCollection = database.collection('watchlist');
        gamesCollection = database.collection('games');

        console.log("Database collections initialized!");

        // ========== HEALTH CHECK ==========
        app.get('/', (req, res) => {
            res.json({
                message: 'Chill Gamer API is running!',
                timestamp: new Date().toISOString(),
                endpoints: {
                    reviews: '/chill-gamer/reviews',
                    watchlist: '/chill-gamer/watchlist/:email',
                    games: '/chill-gamer/games',
                    users: '/chill-gamer/users/:email',
                    search: '/chill-gamer/search/reviews'
                }
            });
        });

        // ========== REVIEWS API ROUTES ==========

        // Get all reviews
        app.get('/chill-gamer/reviews', async (req, res) => {
            try {
                const reviews = await reviewsCollection.find().toArray();
                res.json(reviews);
            } catch (error) {
                res.status(500).json({ error: error.message });
            }
        });

        // Get highest rated reviews (6)
        app.get('/chill-gamer/reviews/highest-rated', async (req, res) => {
            try {
                const reviews = await reviewsCollection.find()
                    .sort({ rating: -1 })
                    .limit(6)
                    .toArray();
                res.json(reviews);
            } catch (error) {
                res.status(500).json({ error: error.message });
            }
        });

        // Get single review by ID
        app.get('/chill-gamer/reviews/:id', async (req, res) => {
            try {
                const review = await reviewsCollection.findOne({
                    _id: new ObjectId(req.params.id)
                });
                if (!review) {
                    return res.status(404).json({ error: 'Review not found' });
                }
                res.json(review);
            } catch (error) {
                res.status(500).json({ error: error.message });
            }
        });

        // Get user's reviews
        app.get('/chill-gamer/reviews/user/:email', async (req, res) => {
            try {
                const reviews = await reviewsCollection.find({
                    userEmail: req.params.email
                }).toArray();
                res.json(reviews);
            } catch (error) {
                res.status(500).json({ error: error.message });
            }
        });

        // Create new review
        app.post('/chill-gamer/reviews', async (req, res) => {
            try {
                const review = {
                    ...req.body,
                    createdAt: new Date(),
                    updatedAt: new Date()
                };
                const result = await reviewsCollection.insertOne(review);
                res.json({ ...review, _id: result.insertedId });
            } catch (error) {
                res.status(500).json({ error: error.message });
            }
        });

        // Update review
        app.put('/chill-gamer/reviews/:id', async (req, res) => {
            try {
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
                res.status(500).json({ error: error.message });
            }
        });

        // Delete review
        app.delete('/chill-gamer/reviews/:id', async (req, res) => {
            try {
                const result = await reviewsCollection.deleteOne({
                    _id: new ObjectId(req.params.id)
                });
                res.json(result);
            } catch (error) {
                res.status(500).json({ error: error.message });
            }
        });

        // ========== WATCHLIST API ROUTES ==========

        // Get user's watchlist
        app.get('/chill-gamer/watchlist/:email', async (req, res) => {
            try {
                const watchlist = await watchlistCollection.find({
                    userEmail: req.params.email
                }).toArray();
                res.json(watchlist);
            } catch (error) {
                res.status(500).json({ error: error.message });
            }
        });

        // Add to watchlist
        app.post('/chill-gamer/watchlist', async (req, res) => {
            try {
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
                res.status(500).json({ error: error.message });
            }
        });

        // Remove from watchlist
        app.delete('/chill-gamer/watchlist/:id', async (req, res) => {
            try {
                const result = await watchlistCollection.deleteOne({
                    _id: new ObjectId(req.params.id)
                });
                res.json(result);
            } catch (error) {
                res.status(500).json({ error: error.message });
            }
        });

        // ========== GAMES API ROUTES ==========

        // Get all games
        app.get('/chill-gamer/games', async (req, res) => {
            try {
                const games = await gamesCollection.find().toArray();
                res.json(games);
            } catch (error) {
                res.status(500).json({ error: error.message });
            }
        });

        // Get game by ID
        app.get('/chill-gamer/games/:id', async (req, res) => {
            try {
                const game = await gamesCollection.findOne({
                    _id: new ObjectId(req.params.id)
                });
                if (!game) {
                    return res.status(404).json({ error: 'Game not found' });
                }
                res.json(game);
            } catch (error) {
                res.status(500).json({ error: error.message });
            }
        });

        // ========== USERS API ROUTES ==========

        // Get user by email
        app.get('/chill-gamer/users/:email', async (req, res) => {
            try {
                const user = await usersCollection.findOne({
                    email: req.params.email
                });
                res.json(user);
            } catch (error) {
                res.status(500).json({ error: error.message });
            }
        });

        // Create or update user
        app.post('/chill-gamer/users', async (req, res) => {
            try {
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
                res.status(500).json({ error: error.message });
            }
        });

        // ========== SEARCH & FILTER ROUTES ==========

        // Search reviews by game title
        app.get('/chill-gamer/search/reviews', async (req, res) => {
            try {
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
                res.status(500).json({ error: error.message });
            }
        });

        // Get all genres
        app.get('/chill-gamer/genres', async (req, res) => {
            try {
                const genres = await reviewsCollection.distinct('genre');
                res.json(genres);
            } catch (error) {
                console.error('Genres error:', error);
                res.status(500).json({ error: 'Failed to load genres' });
            }
        });

        console.log("All API routes are set up successfully!");

        // Start server only if not in Vercel environment
        if (process.env.NODE_ENV !== 'production' || !process.env.VERCEL) {
            app.listen(port, () => {
                console.log(`Server is running on port ${port}`);
            });
        }

    } catch (error) {
        console.error('Failed to start server:', error);
        process.exit(1);
    }
}

// Initialize the application
run().catch(console.error);

// Vercel-compatible export
module.exports = app;