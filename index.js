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
                    reviewId: new ObjectId(req.body.reviewId)
                });

                if (existingItem) {
                    return res.status(400).json({ error: 'Already in watchlist' });
                }

                const watchlistItem = {
                    ...req.body,
                    reviewId: new ObjectId(req.body.reviewId),
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
                endpoints: {
                    reviews: '/chill-gamer/reviews',
                    watchlist: '/chill-gamer/watchlist/:email',
                    games: '/chill-gamer/games',
                    users: '/chill-gamer/users/:email',
                    search: '/chill-gamer/search/reviews'
                }
            });
        });

    } catch (error) {
        console.error('Failed to start server:', error);
    }
}

// Sample Data Generation
async function generateSampleData() {
    const database = client.db(dbName);

    // Clear existing data (optional - remove in production)
    await database.collection('reviews').deleteMany({});
    await database.collection('games').deleteMany({});
    await database.collection('users').deleteMany({});
    await database.collection('watchlist').deleteMany({});

    // Sample Games Data
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
        {
            _id: new ObjectId(),
            title: "Free Fire",
            coverImage: "https://akm-img-a-in.tosshub.com/sites/itgaming/resources/202505/54f31449f5f91cf0cc223cc635cd5952jpg070525100705.jpeg",
            genre: ["Shooter", "Battle Royale", "Action"],
            releaseYear: 2017,
            developer: "Garena",
            platforms: ["Mobile"],
            description: "Fast-paced 10-minute battle royale matches. 50 players parachute onto an island for survival action with unique characters and abilities.",
            rating: 4.2,
            price: 0
        },
        {
            _id: new ObjectId(),
            title: "Call of Duty: Warzone",
            coverImage: "https://shared.fastly.steamstatic.com/store_item_assets/steam/apps/3606480/d7041a15f572f7702d5f4bc97e498cd3e1cc62e2/header.jpg?t=1763166085",
            genre: ["Shooter", "Battle Royale", "Action"],
            releaseYear: 2020,
            developer: "Infinity Ward",
            platforms: ["PC", "PlayStation", "Xbox"],
            description: "Massive combat experience with 150 players in the ultimate battle royale set in the iconic Call of Duty universe.",
            rating: 4.4,
            price: 0
        },

        // HORROR GAMES
        {
            _id: new ObjectId(),
            title: "Resident Evil Village",
            coverImage: "https://images.igdb.com/igdb/image/upload/t_cover_big/co2rpx.jpg",
            genre: ["Horror", "Action", "Survival"],
            releaseYear: 2021,
            developer: "Capcom",
            platforms: ["PC", "PlayStation", "Xbox"],
            description: "Experience survival horror like never before in the eighth major installment in the legendary Resident Evil series.",
            rating: 4.6,
            price: 59.99
        },
        {
            _id: new ObjectId(),
            title: "The Last of Us Part II",
            coverImage: "https://images.igdb.com/igdb/image/upload/t_cover_big/co2q8f.jpg",
            genre: ["Horror", "Action", "Adventure"],
            releaseYear: 2020,
            developer: "Naughty Dog",
            platforms: ["PlayStation"],
            description: "An emotionally devastating and brutally beautiful journey through a post-apocalyptic America.",
            rating: 4.8,
            price: 69.99
        },
        {
            _id: new ObjectId(),
            title: "Phasmophobia",
            coverImage: "https://images.igdb.com/igdb/image/upload/t_cover_big/co4i6s.jpg",
            genre: ["Horror", "Indie", "Simulation"],
            releaseYear: 2020,
            developer: "Kinetic Games",
            platforms: ["PC"],
            description: "4-player online co-op psychological horror. Paranormal activity is on the rise and it's up to you and your team to investigate.",
            rating: 4.7,
            price: 13.99
        },
        {
            _id: new ObjectId(),
            title: "Amnesia: The Dark Descent",
            coverImage: "https://images.igdb.com/igdb/image/upload/t_cover_big/co2s96.jpg",
            genre: ["Horror", "Adventure", "Indie"],
            releaseYear: 2010,
            developer: "Frictional Games",
            platforms: ["PC", "PlayStation", "Xbox"],
            description: "A first person survival horror. A game about immersion, discovery and living through a nightmare.",
            rating: 4.5,
            price: 19.99
        },

        // KIDS FAVORITE GAMES
        {
            _id: new ObjectId(),
            title: "Minecraft",
            coverImage: "https://images.igdb.com/igdb/image/upload/t_cover_big/co2cua.jpg",
            genre: ["Sandbox", "Adventure", "Family"],
            releaseYear: 2011,
            developer: "Mojang Studios",
            platforms: ["PC", "PlayStation", "Xbox", "Switch", "Mobile"],
            description: "Create, explore, and survive in a block-based world. The ultimate sandbox game for creativity and adventure.",
            rating: 4.8,
            price: 26.95
        },
        {
            _id: new ObjectId(),
            title: "Roblox",
            coverImage: "https://images.igdb.com/igdb/image/upload/t_cover_big/co4k7c.jpg",
            genre: ["Sandbox", "Adventure", "Family"],
            releaseYear: 2006,
            developer: "Roblox Corporation",
            platforms: ["PC", "Mobile", "Xbox"],
            description: "Imagine, create, and play together with millions of players across an infinite variety of immersive, user-generated 3D worlds.",
            rating: 4.3,
            price: 0
        },
        {
            _id: new ObjectId(),
            title: "Among Us",
            coverImage: "https://images.igdb.com/igdb/image/upload/t_cover_big/co4lci.jpg",
            genre: ["Party", "Strategy", "Family"],
            releaseYear: 2018,
            developer: "InnerSloth",
            platforms: ["PC", "Mobile", "Switch", "PlayStation", "Xbox"],
            description: "A party game of teamwork and betrayal. Crewmates work together to complete tasks while Impostors sabotage and eliminate them.",
            rating: 4.4,
            price: 4.99
        },
        {
            _id: new ObjectId(),
            title: "Stardew Valley",
            coverImage: "https://images.igdb.com/igdb/image/upload/t_cover_big/co2cua.jpg",
            genre: ["Simulation", "RPG", "Family"],
            releaseYear: 2016,
            developer: "ConcernedApe",
            platforms: ["PC", "PlayStation", "Xbox", "Switch", "Mobile"],
            description: "You've inherited your grandfather's old farm plot. Can you learn to live off the land and turn these overgrown fields into a thriving home?",
            rating: 4.9,
            price: 14.99
        },

        // CLASSIC & FAMOUS OLD GAMES
        {
            _id: new ObjectId(),
            title: "The King of Fighters '98",
            coverImage: "https://images.igdb.com/igdb/image/upload/t_cover_big/co1r7h.jpg",
            genre: ["Fighting", "Arcade"],
            releaseYear: 1998,
            developer: "SNK",
            platforms: ["Arcade", "PlayStation", "Switch"],
            description: "The Dream Match Never Ends! The ultimate KOF experience with the largest character roster of its time.",
            rating: 4.6,
            price: 14.99
        },
        {
            _id: new ObjectId(),
            title: "Street Fighter II",
            coverImage: "https://images.igdb.com/igdb/image/upload/t_cover_big/co1tfy.jpg",
            genre: ["Fighting", "Arcade"],
            releaseYear: 1991,
            developer: "Capcom",
            platforms: ["Arcade", "SNES", "Multiple"],
            description: "The game that revolutionized the fighting genre and defined competitive gaming for generations.",
            rating: 4.7,
            price: 9.99
        },
        {
            _id: new ObjectId(),
            title: "Super Mario Bros.",
            coverImage: "https://images.igdb.com/igdb/image/upload/t_cover_big/co1r7h.jpg",
            genre: ["Platformer", "Adventure"],
            releaseYear: 1985,
            developer: "Nintendo",
            platforms: ["NES", "Switch"],
            description: "Join Mario on his adventure to rescue Princess Peach from Bowser in this iconic platforming masterpiece.",
            rating: 4.8,
            price: 4.99
        },
        {
            _id: new ObjectId(),
            title: "The Legend of Zelda: Ocarina of Time",
            coverImage: "https://images.igdb.com/igdb/image/upload/t_cover_big/co1r7h.jpg",
            genre: ["Adventure", "Action", "RPG"],
            releaseYear: 1998,
            developer: "Nintendo",
            platforms: ["Nintendo 64", "Switch"],
            description: "Often considered the greatest game of all time. Experience Link's epic journey through time.",
            rating: 4.9,
            price: 19.99
        },
        {
            _id: new ObjectId(),
            title: "Final Fantasy VII",
            coverImage: "https://images.igdb.com/igdb/image/upload/t_cover_big/co1r7h.jpg",
            genre: ["RPG", "Adventure"],
            releaseYear: 1997,
            developer: "Square Enix",
            platforms: ["PlayStation", "PC", "Switch"],
            description: "Cloud Strife's epic adventure to save the planet in this revolutionary RPG that defined a generation.",
            rating: 4.8,
            price: 15.99
        },
        {
            _id: new ObjectId(),
            title: "Tetris",
            coverImage: "https://images.igdb.com/igdb/image/upload/t_cover_big/co1r7h.jpg",
            genre: ["Puzzle", "Arcade"],
            releaseYear: 1984,
            developer: "Alexey Pajitnov",
            platforms: ["Multiple"],
            description: "The timeless puzzle game that needs no introduction. Arrange falling blocks to complete lines.",
            rating: 4.5,
            price: 2.99
        },



        // NEW GAMES - Expanded Collection
        {
            _id: new ObjectId(),
            title: "God of War Ragnarök",
            coverImage: "https://images.igdb.com/igdb/image/upload/t_cover_big/co5xuu.jpg",
            genre: ["Action", "Adventure", "RPG"],
            releaseYear: 2022,
            developer: "Santa Monica Studio",
            platforms: ["PlayStation"],
            description: "Kratos and Atreus journey to each of the Nine Realms in search of answers.",
            rating: 4.8,
            price: 69.99
        },
        {
            _id: new ObjectId(),
            title: "Starfield",
            coverImage: "https://images.igdb.com/igdb/image/upload/t_cover_big/co4x8z.jpg",
            genre: ["RPG", "Action", "Sci-Fi"],
            releaseYear: 2023,
            developer: "Bethesda Game Studios",
            platforms: ["PC", "Xbox"],
            description: "Bethesda's next-generation role-playing game set in space.",
            rating: 4.2,
            price: 69.99
        },
        {
            _id: new ObjectId(),
            title: "Hogwarts Legacy",
            coverImage: "https://images.igdb.com/igdb/image/upload/t_cover_big/co5e78.jpg",
            genre: ["RPG", "Adventure", "Action"],
            releaseYear: 2023,
            developer: "Avalanche Software",
            platforms: ["PC", "PlayStation", "Xbox", "Switch"],
            description: "Experience Hogwarts in the 1800s and become the wizard you choose to be.",
            rating: 4.6,
            price: 59.99
        },
        {
            _id: new ObjectId(),
            title: "Spider-Man 2",
            coverImage: "https://images.igdb.com/igdb/image/upload/t_cover_big/co6hf2.jpg",
            genre: ["Action", "Adventure"],
            releaseYear: 2023,
            developer: "Insomniac Games",
            platforms: ["PlayStation"],
            description: "Play as both Peter Parker and Miles Morales in Marvel's New York.",
            rating: 4.7,
            price: 69.99
        },
        {
            _id: new ObjectId(),
            title: "Call of Duty: Modern Warfare III",
            coverImage: "https://shared.fastly.steamstatic.com/store_item_assets/steam/apps/3606480/d7041a15f572f7702d5f4bc97e498cd3e1cc62e2/header.jpg?t=1763166085",
            genre: ["Shooter", "Action"],
            releaseYear: 2023,
            developer: "Sledgehammer Games",
            platforms: ["PC", "PlayStation", "Xbox"],
            description: "The ultimate threat in the fight for the world order.",
            rating: 3.8,
            price: 69.99
        },
        {
            _id: new ObjectId(),
            title: "Alan Wake 2",
            coverImage: "https://images.igdb.com/igdb/image/upload/t_cover_big/co5wja.jpg",
            genre: ["Horror", "Action", "Adventure"],
            releaseYear: 2023,
            developer: "Remedy Entertainment",
            platforms: ["PC", "PlayStation", "Xbox"],
            description: "A survival horror sequel to the critically acclaimed Alan Wake.",
            rating: 4.5,
            price: 59.99
        },
        {
            _id: new ObjectId(),
            title: "Super Mario Bros. Wonder",
            coverImage: "https://images.igdb.com/igdb/image/upload/t_cover_big/co6dul.jpg",
            genre: ["Platformer", "Adventure"],
            releaseYear: 2023,
            developer: "Nintendo",
            platforms: ["Nintendo Switch"],
            description: "A new side-scrolling Mario adventure with wonder flowers.",
            rating: 4.8,
            price: 59.99
        },
        {
            _id: new ObjectId(),
            title: "Diablo IV",
            coverImage: "https://images.igdb.com/igdb/image/upload/t_cover_big/co4ka7.jpg",
            genre: ["RPG", "Action", "Adventure"],
            releaseYear: 2023,
            developer: "Blizzard Entertainment",
            platforms: ["PC", "PlayStation", "Xbox"],
            description: "Return to darkness with the next-gen action RPG experience.",
            rating: 4.3,
            price: 69.99
        },
        {
            _id: new ObjectId(),
            title: "Final Fantasy XVI",
            coverImage: "https://images.igdb.com/igdb/image/upload/t_cover_big/co4gbf.jpg",
            genre: ["RPG", "Action", "Adventure"],
            releaseYear: 2023,
            developer: "Square Enix",
            platforms: ["PlayStation", "PC"],
            description: "An epic dark fantasy where fate rests on the shoulders of one man.",
            rating: 4.6,
            price: 69.99
        },
        {
            _id: new ObjectId(),
            title: "Street Fighter 6",
            coverImage: "https://images.igdb.com/igdb/image/upload/t_cover_big/co5pdm.jpg",
            genre: ["Fighting", "Action"],
            releaseYear: 2023,
            developer: "Capcom",
            platforms: ["PC", "PlayStation", "Xbox"],
            description: "Next evolution of Street Fighter with new fighting mechanics.",
            rating: 4.4,
            price: 59.99
        },
        {
            _id: new ObjectId(),
            title: "Resident Evil 4 Remake",
            coverImage: "https://images.igdb.com/igdb/image/upload/t_cover_big/co4rx2.jpg",
            genre: ["Horror", "Action", "Adventure"],
            releaseYear: 2023,
            developer: "Capcom",
            platforms: ["PC", "PlayStation", "Xbox"],
            description: "Reimagined version of the survival horror classic.",
            rating: 4.7,
            price: 59.99
        },
        {
            _id: new ObjectId(),
            title: "Forza Horizon 5",
            coverImage: "https://images.igdb.com/igdb/image/upload/t_cover_big/co3p2d.jpg",
            genre: ["Racing", "Sports"],
            releaseYear: 2021,
            developer: "Playground Games",
            platforms: ["PC", "Xbox"],
            description: "Explore the vibrant open world landscapes of Mexico.",
            rating: 4.6,
            price: 59.99
        },
        {
            _id: new ObjectId(),
            title: "Hades",
            coverImage: "https://images.igdb.com/igdb/image/upload/t_cover_big/co2rpt.jpg",
            genre: ["Roguelike", "Action", "RPG"],
            releaseYear: 2020,
            developer: "Supergiant Games",
            platforms: ["PC", "PlayStation", "Xbox", "Switch"],
            description: "Defy the god of death in this rogue-like dungeon crawler.",
            rating: 4.8,
            price: 24.99
        },
        {
            _id: new ObjectId(),
            title: "Stray",
            coverImage: "https://images.igdb.com/igdb/image/upload/t_cover_big/co4i4m.jpg",
            genre: ["Adventure", "Indie"],
            releaseYear: 2022,
            developer: "BlueTwelve Studio",
            platforms: ["PC", "PlayStation"],
            description: "A lost cat ventures through a cybercity and its seedy underbelly.",
            rating: 4.3,
            price: 29.99
        },
        {
            _id: new ObjectId(),
            title: "Valorant",
            coverImage: "https://images.igdb.com/igdb/image/upload/t_cover_big/co2r7f.jpg",
            genre: ["Shooter", "Action", "Strategy"],
            releaseYear: 2020,
            developer: "Riot Games",
            platforms: ["PC"],
            description: "A tactical shooter featuring a cast of unique agents.",
            rating: 4.2,
            price: 0
        },
        {
            _id: new ObjectId(),
            title: "Apex Legends",
            coverImage: "https://images.igdb.com/igdb/image/upload/t_cover_big/co2r7g.jpg",
            genre: ["Shooter", "Action", "Battle Royale"],
            releaseYear: 2019,
            developer: "Respawn Entertainment",
            platforms: ["PC", "PlayStation", "Xbox", "Switch"],
            description: "Free-to-play hero shooter set in the Titanfall universe.",
            rating: 4.1,
            price: 0
        },

        {
            _id: new ObjectId(),
            title: "Cyberpunk 2077",
            coverImage: "https://images.igdb.com/igdb/image/upload/t_cover_big/co2r0z.jpg",
            genre: ["RPG", "Action", "Sci-Fi"],
            releaseYear: 2020,
            developer: "CD Projekt Red",
            platforms: ["PC", "PlayStation", "Xbox"],
            description: "An open-world, action-adventure RPG set in the megalopolis of Night City.",
            rating: 4.5,
            price: 59.99
        },
        {
            _id: new ObjectId(),
            title: "Elden Ring",
            coverImage: "https://images.igdb.com/igdb/image/upload/t_cover_big/co4jni.jpg",
            genre: ["RPG", "Action", "Fantasy"],
            releaseYear: 2022,
            developer: "FromSoftware",
            platforms: ["PC", "PlayStation", "Xbox"],
            description: "A fantasy action-RPG adventure set within a world created by Hidetaka Miyazaki and George R. R. Martin.",
            rating: 4.8,
            price: 59.99
        },
        {
            _id: new ObjectId(),
            title: "The Legend of Zelda: Tears of the Kingdom",
            coverImage: "https://images.igdb.com/igdb/image/upload/t_cover_big/co5xwp.jpg",
            genre: ["Adventure", "Action", "RPG"],
            releaseYear: 2023,
            developer: "Nintendo",
            platforms: ["Nintendo Switch"],
            description: "An epic adventure across the land and skies of Hyrule.",
            rating: 4.9,
            price: 69.99
        },
        {
            _id: new ObjectId(),
            title: "Baldur's Gate 3",
            coverImage: "https://images.igdb.com/igdb/image/upload/t_cover_big/co4xf2.jpg",
            genre: ["RPG", "Adventure", "Strategy"],
            releaseYear: 2023,
            developer: "Larian Studios",
            platforms: ["PC", "PlayStation", "Xbox"],
            description: "A next-generation RPG set in the world of Dungeons & Dragons.",
            rating: 4.7,
            price: 59.99
        },
        {
            _id: new ObjectId(),
            title: "Grand Theft Auto V",
            coverImage: "https://images.igdb.com/igdb/image/upload/t_cover_big/co1r7h.jpg",
            genre: ["Action", "Adventure"],
            releaseYear: 2013,
            developer: "Rockstar Games",
            platforms: ["PC", "PlayStation", "Xbox"],
            description: "A criminal saga set in the sprawling city of Los Santos.",
            rating: 4.6,
            price: 29.99
        },
        {
            _id: new ObjectId(),
            title: "Red Dead Redemption 2",
            coverImage: "https://images.igdb.com/igdb/image/upload/t_cover_big/co2dc2.jpg",
            genre: ["Action", "Adventure"],
            releaseYear: 2018,
            developer: "Rockstar Games",
            platforms: ["PC", "PlayStation", "Xbox"],
            description: "An epic tale of life in America's unforgiving heartland.",
            rating: 4.8,
            price: 39.99
        },
        {
            _id: new ObjectId(),
            title: "The Witcher 3: Wild Hunt",
            coverImage: "https://images.igdb.com/igdb/image/upload/t_cover_big/co2p2d.jpg",
            genre: ["RPG", "Adventure"],
            releaseYear: 2015,
            developer: "CD Projekt Red",
            platforms: ["PC", "PlayStation", "Xbox", "Switch"],
            description: "A story-driven, open world adventure set in a dark fantasy universe.",
            rating: 4.9,
            price: 39.99
        },
        {
            _id: new ObjectId(),
            title: "Minecraft",
            coverImage: "https://images.igdb.com/igdb/image/upload/t_cover_big/co2cua.jpg",
            genre: ["Sandbox", "Adventure"],
            releaseYear: 2011,
            developer: "Mojang",
            platforms: ["PC", "PlayStation", "Xbox", "Switch", "Mobile"],
            description: "A sandbox adventure game where players build with blocks in a 3D world.",
            rating: 4.5,
            price: 26.95
        }
    ];

    await database.collection('games').insertMany(games);






    // Sample Reviews Data
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
        {
            _id: new ObjectId(),
            gameTitle: "PUBG Mobile",
            gameCover: "https://play-lh.googleusercontent.com/uqq6a-fHayQxsNQkxB9ZZXag8N7Du5mOEKcScr9yltHqx3RKgCdr9VJHKGO2vY_GUe0",
            description: "Incredible how they managed to fit the full PUBG experience on mobile. The controls are surprisingly good, and it's completely free! Perfect for quick gaming sessions on the go.",
            rating: 5,
            year: 2024,
            genre: "Battle Royale",
            userEmail: "mobile_gamer@example.com",
            userName: "Sarah Chen",
            userPhoto: "https://images.unsplash.com/photo-1494790108755-2616b612b786?w=150&h=150&fit=crop&crop=face",
            createdAt: new Date('2024-01-18'),
            updatedAt: new Date('2024-01-18')
        },

        // Horror Game Reviews
        {
            _id: new ObjectId(),
            gameTitle: "Resident Evil Village",
            gameCover: "https://images.igdb.com/igdb/image/upload/t_cover_big/co2rpx.jpg",
            description: "Lady Dimitrescu alone is worth the price of admission! This game masterfully blends horror, action, and exploration. The atmosphere is thick with dread, and the boss fights are unforgettable.",
            rating: 5,
            year: 2023,
            genre: "Horror",
            userEmail: "horror_lover@example.com",
            userName: "Mike Peterson",
            userPhoto: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&h=150&fit=crop&crop=face",
            createdAt: new Date('2024-01-15'),
            updatedAt: new Date('2024-01-15')
        },
        {
            _id: new ObjectId(),
            gameTitle: "Phasmophobia",
            gameCover: "https://images.igdb.com/igdb/image/upload/t_cover_big/co4i6s.jpg",
            description: "The most terrifying co-op experience I've ever had. Playing with friends in VR is absolutely pants-wetting scary. The ghost hunting mechanics are surprisingly deep and rewarding.",
            rating: 5,
            year: 2023,
            genre: "Horror",
            userEmail: "ghost_hunter@example.com",
            userName: "Emma Rodriguez",
            userPhoto: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150&h=150&fit=crop&crop=face",
            createdAt: new Date('2024-01-12'),
            updatedAt: new Date('2024-01-12')
        },

        // Kids Games Reviews
        {
            _id: new ObjectId(),
            gameTitle: "Minecraft",
            gameCover: "https://images.igdb.com/igdb/image/upload/t_cover_big/co2cua.jpg",
            description: "My kids have spent hundreds of hours in this game, and it's amazing to see their creativity. From building castles to surviving the night, it's endless fun and actually educational!",
            rating: 5,
            year: 2024,
            genre: "Sandbox",
            userEmail: "parent_gamer@example.com",
            userName: "David Wilson",
            userPhoto: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&h=150&fit=crop&crop=face",
            createdAt: new Date('2024-01-10'),
            updatedAt: new Date('2024-01-10')
        },
        {
            _id: new ObjectId(),
            gameTitle: "Roblox",
            gameCover: "https://images.igdb.com/igdb/image/upload/t_cover_big/co4k7c.jpg",
            description: "It's like YouTube for games - endless content created by the community. My daughter loves the social aspect and the variety of games. Parental controls are excellent too.",
            rating: 4,
            year: 2024,
            genre: "Sandbox",
            userEmail: "family_gamer@example.com",
            userName: "Lisa Thompson",
            userPhoto: "https://images.unsplash.com/photo-1544725176-7c40e5a71c5e?w=150&h=150&fit=crop&crop=face",
            createdAt: new Date('2024-01-08'),
            updatedAt: new Date('2024-01-08')
        },

        // Classic Games Reviews
        {
            _id: new ObjectId(),
            gameTitle: "The King of Fighters '98",
            gameCover: "https://images.igdb.com/igdb/image/upload/t_cover_big/co1r7h.jpg",
            description: "The pinnacle of 2D fighting games. The character roster is massive, the gameplay is perfectly balanced, and the pixel art is timeless. Still playing this in tournaments today!",
            rating: 5,
            year: 2023,
            genre: "Fighting",
            userEmail: "fighting_fan@example.com",
            userName: "Ken Masters",
            userPhoto: "https://images.unsplash.com/photo-1519244703995-f4e0f30006d5?w=150&h=150&fit=crop&crop=face",
            createdAt: new Date('2024-01-05'),
            updatedAt: new Date('2024-01-05')
        },
        {
            _id: new ObjectId(),
            gameTitle: "The Legend of Zelda: Ocarina of Time",
            gameCover: "https://images.igdb.com/igdb/image/upload/t_cover_big/co1r7h.jpg",
            description: "A masterpiece that holds up incredibly well. The dungeons are brilliantly designed, the music is unforgettable, and the story is timeless. Every gamer should experience this classic.",
            rating: 5,
            year: 2023,
            genre: "Adventure",
            userEmail: "retro_gamer@example.com",
            userName: "Nostalgia King",
            userPhoto: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&h=150&fit=crop&crop=face",
            createdAt: new Date('2024-01-03'),
            updatedAt: new Date('2024-01-03')
        },

        {
            _id: new ObjectId(),
            gameTitle: "Cyberpunk 2077",
            gameCover: "https://images.igdb.com/igdb/image/upload/t_cover_big/co2r0z.jpg",
            description: "After the 2.0 update, this game is absolutely incredible! The world-building, characters, and gameplay mechanics are top-notch. Night City feels alive and immersive.",
            rating: 5,
            year: 2020,
            genre: "RPG",
            userEmail: "gamer1@example.com",
            userName: "John Doe",
            userPhoto: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&h=150&fit=crop&crop=face",
            createdAt: new Date('2024-01-15'),
            updatedAt: new Date('2024-01-15')
        },
        {
            _id: new ObjectId(),
            gameTitle: "Elden Ring",
            gameCover: "https://images.igdb.com/igdb/image/upload/t_cover_big/co4jni.jpg",
            description: "Masterpiece! The open world design combined with FromSoftware's signature challenging gameplay creates an unforgettable experience. The Lands Between are breathtaking.",
            rating: 5,
            year: 2022,
            genre: "RPG",
            userEmail: "gamer2@example.com",
            userName: "Sarah Wilson",
            userPhoto: "https://images.unsplash.com/photo-1494790108755-2616b612b786?w=150&h=150&fit=crop&crop=face",
            createdAt: new Date('2024-01-10'),
            updatedAt: new Date('2024-01-10')
        },
        {
            _id: new ObjectId(),
            gameTitle: "Baldur's Gate 3",
            gameCover: "https://images.igdb.com/igdb/image/upload/t_cover_big/co4xf2.jpg",
            description: "This game sets a new standard for RPGs. The depth of choice, character development, and storytelling is unmatched. Every playthrough feels unique.",
            rating: 5,
            year: 2023,
            genre: "RPG",
            userEmail: "gamer3@example.com",
            userName: "Mike Chen",
            userPhoto: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&h=150&fit=crop&crop=face",
            createdAt: new Date('2024-01-08'),
            updatedAt: new Date('2024-01-08')
        },
        {
            _id: new ObjectId(),
            gameTitle: "Grand Theft Auto V",
            gameCover: "https://images.igdb.com/igdb/image/upload/t_cover_big/co1r7h.jpg",
            description: "Even after all these years, GTA V remains one of the best open-world games. The story is engaging and the world is incredibly detailed.",
            rating: 4,
            year: 2013,
            genre: "Action",
            userEmail: "gamer4@example.com",
            userName: "Alex Rodriguez",
            userPhoto: "https://images.unsplash.com/photo-1519244703995-f4e0f30006d5?w=150&h=150&fit=crop&crop=face",
            createdAt: new Date('2024-01-05'),
            updatedAt: new Date('2024-01-05')
        },
        {
            _id: new ObjectId(),
            gameTitle: "The Legend of Zelda: Tears of the Kingdom",
            gameCover: "https://images.igdb.com/igdb/image/upload/t_cover_big/co5xwp.jpg",
            description: "Nintendo has outdone themselves again. The building mechanics and vertical exploration add so much depth to an already amazing world.",
            rating: 5,
            year: 2023,
            genre: "Adventure",
            userEmail: "gamer5@example.com",
            userName: "Emma Thompson",
            userPhoto: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150&h=150&fit=crop&crop=face",
            createdAt: new Date('2024-01-03'),
            updatedAt: new Date('2024-01-03')
        },
        {
            _id: new ObjectId(),
            gameTitle: "Red Dead Redemption 2",
            gameCover: "https://images.igdb.com/igdb/image/upload/t_cover_big/co2dc2.jpg",
            description: "A cinematic masterpiece. The attention to detail in this game is insane. Arthur Morgan's story is one of the best in gaming history.",
            rating: 5,
            year: 2018,
            genre: "Action",
            userEmail: "gamer6@example.com",
            userName: "David Kim",
            userPhoto: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&h=150&fit=crop&crop=face",
            createdAt: new Date('2024-01-01'),
            updatedAt: new Date('2024-01-01')
        }
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
        {
            _id: new ObjectId(),
            email: "gamer2@example.com",
            name: "Sarah Wilson",
            photoURL: "https://images.unsplash.com/photo-1494790108755-2616b612b786?w=150&h=150&fit=crop&crop=face",
            joinDate: new Date('2023-11-15'),
            role: "user"
        },
        {
            _id: new ObjectId(),
            email: "admin@chillgamer.com",
            name: "Admin User",
            photoURL: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&h=150&fit=crop&crop=face",
            joinDate: new Date('2023-10-01'),
            role: "admin"
        }
    ];

    await database.collection('users').insertMany(users);

    console.log("Sample data generated successfully!");
}

run().catch(console.dir);

app.listen(port, () => {
    console.log(`🎮 Chill Gamer server running on port ${port}`);
    console.log(`📍 API Base URL: http://localhost:${port}`);
    console.log(`📚 Available endpoints:`);
    console.log(`   GET  /chill-gamer/reviews`);
    console.log(`   GET  /chill-gamer/reviews/highest-rated`);
    console.log(`   GET  /chill-gamer/reviews/:id`);
    console.log(`   POST /chill-gamer/reviews`);
    console.log(`   GET  /chill-gamer/watchlist/:email`);
    console.log(`   POST /chill-gamer/watchlist`);
});