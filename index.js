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
const client = new MongoClient(uri, {
    serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
    }
});

// Database Name
const dbName = 'chill_gamer';

async function run() {
    try {
        await client.connect();
        console.log("Connected to MongoDB!");

        const database = client.db(dbName);
        const reviewsCollection = database.collection('reviews');
        const usersCollection = database.collection('users');
        const watchlistCollection = database.collection('watchlist');
        const gamesCollection = database.collection('games');

        // Generate and insert sample data
        await generateSampleData();

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

        // Health check
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

        console.log("All API routes are set up successfully!");

    } catch (error) {
        console.error('Failed to start server:', error);
    }
}

// Sample Data Generation
async function generateSampleData() {
    try {
        const database = client.db(dbName);

        // Clear existing data (optional - remove in production)
        await database.collection('reviews').deleteMany({});
        await database.collection('games').deleteMany({});
        await database.collection('users').deleteMany({});
        await database.collection('watchlist').deleteMany({});

        // Sample Games Data (your existing games array)
        const games = [
            // BATTLE ROYALE GAMES
            {
                _id: new ObjectId(),
                title: "PUBG: BATTLEGROUNDS",
                coverImage: "https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/578080/841ea38bc58cabb70aef65365cf50bc2d79329d9/header.jpg?t=1746590920",
                genre: ["Shooter", "Battle Royale", "Action"],
                releaseYear: 2017,
                developer: "KRAFTON, Inc.",
                platforms: ["PC", "PlayStation", "Xbox", "Mobile"],
                description: "The original battle royale experience that started it all. Parachute onto a massive map, scavenge for weapons, and be the last one standing in intense tactical combat.",
                rating: 4.3,
                price: 29.99
            },
            {
                _id: new ObjectId(),
                title: "PUBG Mobile",
                coverImage: "https://play-lh.googleusercontent.com/uqq6a-fHayQxsNQkxB9ZZXag8N7Du5mOEKcScr9yltHqx3RKgCdr9VJHKGO2vY_GUe0",
                genre: ["Shooter", "Battle Royale", "Action"],
                releaseYear: 2018,
                developer: "Tencent Games",
                platforms: ["Mobile"],
                description: "The mobile version of the world's most popular battle royale game. Optimized for touch devices with exclusive content and fast-paced matches.",
                rating: 4.5,
                price: 0
            },
            // ... (include all your other games here)
        ];

        await database.collection('games').insertMany(games);

        // Sample Reviews Data (your existing reviews array)
        const reviews = [
            {
                _id: new ObjectId(),
                gameTitle: "PUBG: BATTLEGROUNDS",
                gameCover: "https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/578080/841ea38bc58cabb70aef65365cf50bc2d79329d9/header.jpg?t=1746590920",
                description: "The game that defined the battle royale genre. Despite newer competitors, PUBG remains the most tactical and realistic BR experience. The gunplay is unmatched, and the tension in final circles is incredible.",
                rating: 4,
                year: 2023,
                genre: "Battle Royale",
                userEmail: "battle_royale_fan@example.com",
                userName: "Alex Turner",
                userPhoto: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&h=150&fit=crop&crop=face",
                createdAt: new Date('2024-01-20'),
                updatedAt: new Date('2024-01-20')
            },
            // ... (include all your other reviews here)
        ];

        await database.collection('reviews').insertMany(reviews);

        // Sample Users
        const users = [
            {
                _id: new ObjectId(),
                email: "gamer1@example.com",
                name: "John Doe",
                photoURL: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&h=150&fit=crop&crop=face",
                joinDate: new Date('2023-12-01'),
                role: "user"
            },
            // ... (include all your other users here)
        ];

        await database.collection('users').insertMany(users);

        console.log("Sample data generated successfully!");
    } catch (error) {
        console.error("Error generating sample data:", error);
    }
}

// Initialize the application
run().catch(console.error);

// Vercel-compatible export
module.exports = app;