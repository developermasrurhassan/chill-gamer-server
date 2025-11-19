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

        // Start the server for local development
        if (process.env.NODE_ENV !== 'production') {
            app.listen(port, () => {
                console.log(`Server is running on http://localhost:${port}`);
            });
        }

    } catch (error) {
        console.error('Failed to start server:', error);
    }
}

// Sample Data Generation with WORKING image URLs
async function generateSampleData() {
    try {
        const database = client.db(dbName);

        // Clear existing data
        await database.collection('reviews').deleteMany({});
        await database.collection('games').deleteMany({});
        await database.collection('users').deleteMany({});
        await database.collection('watchlist').deleteMany({});

        // Sample Games Data with REAL working image URLs
        const games = [
            // BATTLE ROYALE GAMES
            {
                _id: new ObjectId(),
                title: "PUBG: BATTLEGROUNDS",
                coverImage: "https://cdn.akamai.steamstatic.com/steam/apps/578080/header.jpg",
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
                title: "Call of Duty: Warzone",
                coverImage: "https://image-cdn.essentiallysports.com/wp-content/uploads/call-of-duty-warzone-mobile-3.jpg",
                genre: ["Shooter", "Battle Royale", "Action"],
                releaseYear: 2020,
                developer: "Infinity Ward",
                platforms: ["PC", "PlayStation", "Xbox"],
                description: "The free-to-play combat arena from Call of Duty franchise. Features fast-paced gameplay, loadout drops, and the iconic Gulag respawn system.",
                rating: 4.4,
                price: 0
            },
            {
                _id: new ObjectId(),
                title: "Apex Legends",
                coverImage: "https://media.contentapi.ea.com/content/dam/apex-legends/images/2019/01/apex-featured-image-16x9.jpg.adapt.crop191x100.628p.jpg",
                genre: ["Shooter", "Battle Royale", "Hero Shooter"],
                releaseYear: 2019,
                developer: "Respawn Entertainment",
                platforms: ["PC", "PlayStation", "Xbox", "Mobile"],
                description: "A free-to-play hero shooter battle royale featuring unique characters with special abilities, fast movement, and strategic team play.",
                rating: 4.6,
                price: 0
            },
            {
                _id: new ObjectId(),
                title: "Fortnite",
                coverImage: "https://cdn2.unrealengine.com/14br-consoles-1920x1080-wlogo-1920x1080-432974386.jpg",
                genre: ["Shooter", "Battle Royale", "Sandbox"],
                releaseYear: 2017,
                developer: "Epic Games",
                platforms: ["PC", "PlayStation", "Xbox", "Mobile", "Switch"],
                description: "The cultural phenomenon that combines battle royale shooting with building mechanics. Constantly evolving with new seasons and collaborations.",
                rating: 4.2,
                price: 0
            },
            // ACTION-ADVENTURE GAMES
            {
                _id: new ObjectId(),
                title: "God of War Ragnarök",
                coverImage: "https://image.api.playstation.com/vulcan/img/rnd/202011/1021/1I1WBSd1P2hRFYIVaE8EkVbX.png",
                genre: ["Action", "Adventure", "RPG"],
                releaseYear: 2022,
                developer: "Santa Monica Studio",
                platforms: ["PlayStation"],
                description: "Kratos and Atreus journey through the Nine Realms in this epic sequel, facing the impending threat of Ragnarök in Norse mythology.",
                rating: 4.9,
                price: 69.99
            },
            {
                _id: new ObjectId(),
                title: "The Last of Us Part I",
                coverImage: "https://cdn1.epicgames.com/offer/3ddd6a590da64e3686042d108968a6b2/EGS_TheLastofUsPartI_NaughtyDogLLC_S2_1200x1600-64d0d2c532e4c5e5f4b7c3988d72c2ab",
                genre: ["Action", "Adventure", "Survival"],
                releaseYear: 2022,
                developer: "Naughty Dog",
                platforms: ["PC", "PlayStation"],
                description: "The critically acclaimed remake of the original masterpiece. Experience Joel and Ellie's emotional journey across post-apocalyptic America.",
                rating: 4.8,
                price: 59.99
            },
            {
                _id: new ObjectId(),
                title: "Marvel's Spider-Man 2",
                coverImage: "https://image.api.playstation.com/vulcan/ap/rnd/202306/1219/60eca3ac155d6ad4517868bec20e95a4bb117e14a8cfe7b8.png",
                genre: ["Action", "Adventure", "Superhero"],
                releaseYear: 2023,
                developer: "Insomniac Games",
                platforms: ["PlayStation"],
                description: "Play as both Peter Parker and Miles Morales as they protect New York City from new threats including Venom and Kraven the Hunter.",
                rating: 4.7,
                price: 69.99
            },
            {
                _id: new ObjectId(),
                title: "Ghost of Tsushima",
                coverImage: "https://image.api.playstation.com/vulcan/ap/rnd/202010/0222/B6dws8LXo6pE3YVg8P8P4hQx.png",
                genre: ["Action", "Adventure", "Open World"],
                releaseYear: 2020,
                developer: "Sucker Punch Productions",
                platforms: ["PC", "PlayStation"],
                description: "A samurai's journey to protect Tsushima Island during the Mongol invasion. Beautiful visuals and intense sword combat.",
                rating: 4.8,
                price: 59.99
            },
            {
                _id: new ObjectId(),
                title: "Red Dead Redemption 2",
                coverImage: "https://cdn.cloudflare.steamstatic.com/steam/apps/1174180/header.jpg",
                genre: ["Action", "Adventure", "Western"],
                releaseYear: 2018,
                developer: "Rockstar Games",
                platforms: ["PC", "PlayStation", "Xbox"],
                description: "An epic tale of life in America's unforgiving heartland. The vast and atmospheric world sets the stage for Arthur Morgan's story.",
                rating: 4.9,
                price: 59.99
            },
            // RPG GAMES
            {
                _id: new ObjectId(),
                title: "Baldur's Gate 3",
                coverImage: "https://cdn.cloudflare.steamstatic.com/steam/apps/1086940/header.jpg",
                genre: ["RPG", "Adventure", "Turn-Based"],
                releaseYear: 2023,
                developer: "Larian Studios",
                platforms: ["PC", "PlayStation", "Xbox"],
                description: "The next generation of RPG set in the Dungeons & Dragons universe. Features deep storytelling and tactical combat.",
                rating: 4.9,
                price: 59.99
            },
            {
                _id: new ObjectId(),
                title: "Cyberpunk 2077",
                coverImage: "https://cdn.cloudflare.steamstatic.com/steam/apps/1091500/header.jpg",
                genre: ["RPG", "Action", "Open World"],
                releaseYear: 2020,
                developer: "CD Projekt Red",
                platforms: ["PC", "PlayStation", "Xbox"],
                description: "An open-world, action-adventure RPG set in Night City, a megalopolis obsessed with power, glamour, and body modification.",
                rating: 4.3,
                price: 49.99
            },
            {
                _id: new ObjectId(),
                title: "The Witcher 3: Wild Hunt",
                coverImage: "https://cdn.cloudflare.steamstatic.com/steam/apps/292030/header.jpg",
                genre: ["RPG", "Action", "Open World"],
                releaseYear: 2015,
                developer: "CD Projekt Red",
                platforms: ["PC", "PlayStation", "Xbox", "Switch"],
                description: "As Geralt of Rivia, a professional monster hunter, search for your adopted daughter in a vast open world rich with merchant cities, pirate islands, and mountain passes.",
                rating: 4.9,
                price: 39.99
            },
            {
                _id: new ObjectId(),
                title: "Elden Ring",
                coverImage: "https://cdn.cloudflare.steamstatic.com/steam/apps/1245620/header.jpg",
                genre: ["RPG", "Action", "Souls-like"],
                releaseYear: 2022,
                developer: "FromSoftware",
                platforms: ["PC", "PlayStation", "Xbox"],
                description: "A new fantasy action RPG where you'll encounter adversaries with profound backgrounds, characters with their own motivations, and fearsome creatures.",
                rating: 4.8,
                price: 59.99
            },
            {
                _id: new ObjectId(),
                title: "Starfield",
                coverImage: "https://cdn.cloudflare.steamstatic.com/steam/apps/1716740/header.jpg",
                genre: ["RPG", "Action", "Sci-Fi"],
                releaseYear: 2023,
                developer: "Bethesda Game Studios",
                platforms: ["PC", "Xbox"],
                description: "Bethesda Game Studios' first new universe in 25 years. Explore the stars and answer humanity's greatest mystery in this next generation RPG.",
                rating: 4.2,
                price: 69.99
            },
            // SHOOTER GAMES
            {
                _id: new ObjectId(),
                title: "Call of Duty: Modern Warfare III",
                coverImage: "https://cdn.cloudflare.steamstatic.com/steam/apps/1938010/header.jpg",
                genre: ["Shooter", "Action", "FPS"],
                releaseYear: 2023,
                developer: "Sledgehammer Games",
                platforms: ["PC", "PlayStation", "Xbox"],
                description: "The direct sequel to Modern Warfare II featuring a new campaign, multiplayer, and the largest Call of Duty Zombies map ever.",
                rating: 4.0,
                price: 69.99
            },
            {
                _id: new ObjectId(),
                title: "Counter-Strike 2",
                coverImage: "https://cdn.cloudflare.steamstatic.com/steam/apps/730/header.jpg",
                genre: ["Shooter", "Tactical", "FPS"],
                releaseYear: 2023,
                developer: "Valve",
                platforms: ["PC"],
                description: "The largest technical leap forward in Counter-Strike's history, built on the Source 2 engine with realistic physically-based rendering.",
                rating: 4.5,
                price: 0
            },
            {
                _id: new ObjectId(),
                title: "Overwatch 2",
                coverImage: "https://cdn.cloudflare.steamstatic.com/steam/apps/2357570/header.jpg",
                genre: ["Shooter", "Hero Shooter", "Action"],
                releaseYear: 2022,
                developer: "Blizzard Entertainment",
                platforms: ["PC", "PlayStation", "Xbox", "Switch"],
                description: "A free-to-play team-based action game set in an optimistic future, where every match is an ultimate 5v5 battlefield.",
                rating: 4.1,
                price: 0
            },
            {
                _id: new ObjectId(),
                title: "VALORANT",
                coverImage: "https://images.contentstack.io/v3/assets/bltb6530b271fddd0b1/bltceaa6cf20d328bd5/5eb7cdc19df5cf37047009d1/V_AGENTS_587x900_allagents.jpg",
                genre: ["Shooter", "Tactical", "FPS"],
                releaseYear: 2020,
                developer: "Riot Games",
                platforms: ["PC"],
                description: "A character-based 5v5 tactical shooter where precise gunplay meets unique agent abilities in competitive matches.",
                rating: 4.4,
                price: 0
            },
            {
                _id: new ObjectId(),
                title: "Destiny 2",
                coverImage: "https://cdn.cloudflare.steamstatic.com/steam/apps/1085660/header.jpg",
                genre: ["Shooter", "RPG", "Looter Shooter"],
                releaseYear: 2017,
                developer: "Bungie",
                platforms: ["PC", "PlayStation", "Xbox"],
                description: "Dive into the world of Destiny 2 to explore the mysteries of the solar system and experience responsive first-person shooter combat.",
                rating: 4.3,
                price: 0
            },
            // SPORTS & RACING GAMES
            {
                _id: new ObjectId(),
                title: "EA Sports FC 24",
                coverImage: "https://cdn.cloudflare.steamstatic.com/steam/apps/2195250/header.jpg",
                genre: ["Sports", "Football", "Simulation"],
                releaseYear: 2023,
                developer: "EA Vancouver",
                platforms: ["PC", "PlayStation", "Xbox", "Switch"],
                description: "The next chapter in football gaming with HyperMotionV, PlayStyles optimized by Opta, and the enhanced Frostbite Engine.",
                rating: 4.0,
                price: 69.99
            },
            {
                _id: new ObjectId(),
                title: "NBA 2K24",
                coverImage: "https://cdn.cloudflare.steamstatic.com/steam/apps/2338770/header.jpg",
                genre: ["Sports", "Basketball", "Simulation"],
                releaseYear: 2023,
                developer: "Visual Concepts",
                platforms: ["PC", "PlayStation", "Xbox", "Switch"],
                description: "The latest installment in the NBA 2K series with enhanced gameplay, graphics, and the return of the Mamba Moments mode.",
                rating: 4.1,
                price: 69.99
            },
            {
                _id: new ObjectId(),
                title: "Forza Horizon 5",
                coverImage: "https://cdn.cloudflare.steamstatic.com/steam/apps/1551360/header.jpg",
                genre: ["Racing", "Open World", "Simulation"],
                releaseYear: 2021,
                developer: "Playground Games",
                platforms: ["PC", "Xbox"],
                description: "Your ultimate Horizon adventure awaits! Explore the vibrant open world landscapes of Mexico with limitless, fun driving action.",
                rating: 4.8,
                price: 59.99
            },
            {
                _id: new ObjectId(),
                title: "Gran Turismo 7",
                coverImage: "https://image.api.playstation.com/vulcan/img/rnd/202110/2008/aGhopp3MHppi7kooGE2Appli.png",
                genre: ["Racing", "Simulation", "Sports"],
                releaseYear: 2022,
                developer: "Polyphony Digital",
                platforms: ["PlayStation"],
                description: "Whether you're a competitive or casual racer, collector, tuner, livery designer, or photographer - find your line with a staggering collection of game modes.",
                rating: 4.7,
                price: 69.99
            },
            {
                _id: new ObjectId(),
                title: "Rocket League",
                coverImage: "https://cdn.cloudflare.steamstatic.com/steam/apps/252950/header.jpg",
                genre: ["Sports", "Racing", "Action"],
                releaseYear: 2015,
                developer: "Psyonix",
                platforms: ["PC", "PlayStation", "Xbox", "Switch"],
                description: "Soccer meets driving in the long-awaited, physics-based multiplayer-focused sequel to Supersonic Acrobatic Rocket-Powered Battle-Cars!",
                rating: 4.6,
                price: 0
            }
        ];

        await database.collection('games').insertMany(games);

        // Sample Reviews Data with working game cover URLs
        const reviews = [
            {
                _id: new ObjectId(),
                gameTitle: "PUBG: BATTLEGROUNDS",
                gameCover: "https://cdn.akamai.steamstatic.com/steam/apps/578080/header.jpg",
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
                gameTitle: "Apex Legends",
                gameCover: "https://media.contentapi.ea.com/content/dam/apex-legends/images/2019/01/apex-featured-image-16x9.jpg.adapt.crop191x100.628p.jpg",
                description: "The perfect blend of hero shooter and battle royale. Each legend feels unique and the movement system is the best in any FPS game. The ping system revolutionized team communication in gaming.",
                rating: 5,
                year: 2024,
                genre: "Battle Royale",
                userEmail: "movement_king@example.com",
                userName: "Sarah Chen",
                userPhoto: "https://images.unsplash.com/photo-1494790108755-2616b612b786?w=150&h=150&fit=crop&crop=face",
                createdAt: new Date('2024-02-15'),
                updatedAt: new Date('2024-02-15')
            },
            {
                _id: new ObjectId(),
                gameTitle: "God of War Ragnarök",
                gameCover: "https://image.api.playstation.com/vulcan/img/rnd/202011/1021/1I1WBSd1P2hRFYIVaE8EkVbX.png",
                description: "A masterpiece in storytelling and gameplay. The character development between Kratos and Atreus is phenomenal. The combat is visceral and satisfying, and the Norse mythology is beautifully realized.",
                rating: 5,
                year: 2023,
                genre: "Action",
                userEmail: "norse_gamer@example.com",
                userName: "Marcus Johnson",
                userPhoto: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&h=150&fit=crop&crop=face",
                createdAt: new Date('2023-11-25'),
                updatedAt: new Date('2023-11-25')
            },
            {
                _id: new ObjectId(),
                gameTitle: "Baldur's Gate 3",
                gameCover: "https://cdn.cloudflare.steamstatic.com/steam/apps/1086940/header.jpg",
                description: "This game sets a new standard for RPGs. The depth of choice and consequence is staggering. Every playthrough feels unique, and the characters are incredibly well-written. A true game of the year contender.",
                rating: 5,
                year: 2023,
                genre: "RPG",
                userEmail: "rpg_master@example.com",
                userName: "David Wilson",
                userPhoto: "https://images.unsplash.com/photo-1519244703995-f4e0f30006d5?w=150&h=150&fit=crop&crop=face",
                createdAt: new Date('2023-08-10'),
                updatedAt: new Date('2023-08-10')
            },
            {
                _id: new ObjectId(),
                gameTitle: "Counter-Strike 2",
                gameCover: "https://cdn.cloudflare.steamstatic.com/steam/apps/730/header.jpg",
                description: "The transition to Source 2 engine has been smooth and the improvements are noticeable. The tick-rate changes make the gameplay feel more responsive. Still the gold standard for competitive FPS.",
                rating: 4,
                year: 2023,
                genre: "Shooter",
                userEmail: "esports_pro@example.com",
                userName: "Jessica Lee",
                userPhoto: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150&h=150&fit=crop&crop=face",
                createdAt: new Date('2023-10-05'),
                updatedAt: new Date('2023-10-05')
            },
            {
                _id: new ObjectId(),
                gameTitle: "Forza Horizon 5",
                gameCover: "https://cdn.cloudflare.steamstatic.com/steam/apps/1551360/header.jpg",
                description: "The ultimate playground for car enthusiasts. Mexico is beautifully realized and the car list is incredible. The seasonal events keep the game fresh and the community is very active.",
                rating: 5,
                year: 2022,
                genre: "Racing",
                userEmail: "car_lover@example.com",
                userName: "Mike Rodriguez",
                userPhoto: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&h=150&fit=crop&crop=face",
                createdAt: new Date('2022-12-20'),
                updatedAt: new Date('2022-12-20')
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
                email: "pro_gamer@example.com",
                name: "Jane Smith",
                photoURL: "https://images.unsplash.com/photo-1494790108755-2616b612b786?w=150&h=150&fit=crop&crop=face",
                joinDate: new Date('2023-11-15'),
                role: "user"
            }
        ];

        await database.collection('users').insertMany(users);

        console.log("Sample data generated successfully!");
    } catch (error) {
        console.error("Error generating sample data:", error);
    }
}

// Initialize the application
run().catch(console.error);

// Vercel-compatible export - THIS IS IMPORTANT!
module.exports = app;