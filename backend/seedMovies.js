import mongoose from "mongoose";
import "dotenv/config";
import Movie from "./models/movieModel.js";

const DATABASE_URL = process.env.DATABASE_URL || "mongodb://localhost:27017/moviebooking";

// Helper to format date as YYYY-MM-DD
function getDateString(daysFromNow = 0) {
  const d = new Date();
  d.setDate(d.getDate() + daysFromNow);
  return d.toISOString().split("T")[0];
}

// Generate realistic slots spanning today and next 60 days (2 full months)
function generateSlots(totalDays = 60) {
  const slots = [];
  for (let day = 0; day <= totalDays; day++) {
    const date = getDateString(day);
    slots.push(
      { date, time: "10:15", ampm: "AM" },
      { date, time: "01:45", ampm: "PM" },
      { date, time: "05:30", ampm: "PM" },
      { date, time: "09:00", ampm: "PM" }
    );
  }
  return slots;
}

const sampleMovies = [
  {
    type: "featured",
    movieName: "Interstellar: Beyond Horizons",
    categories: ["Sci-Fi", "Adventure", "Drama"],
    poster: "https://images.unsplash.com/photo-1534447677768-be436bb09401?q=80&w=800&auto=format&fit=crop",
    trailerUrl: "https://www.youtube.com/watch?v=zSWdZVtXT7E",
    videoUrl: "https://www.youtube.com/watch?v=zSWdZVtXT7E",
    rating: 8.9,
    duration: 169,
    auditorium: "IMAX Laser 1",
    seatPrices: {
      standard: 280,
      recliner: 480,
    },
    slots: generateSlots(),
    story: "When Earth becomes uninhabitable in the future, a farmer and ex-NASA pilot, Joseph Cooper, is tasked to pilot a spacecraft, along with a team of researchers, to find a new planet for humans.",
    cast: [
      { name: "Matthew McConaughey", role: "Cooper", file: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=300" },
      { name: "Anne Hathaway", role: "Brand", file: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=300" },
      { name: "Jessica Chastain", role: "Murph", file: "https://images.unsplash.com/photo-1517841905240-472988babdf9?w=300" },
    ],
    directors: [{ name: "Christopher Nolan", role: "Director", file: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=300" }],
    producers: [{ name: "Emma Thomas", role: "Producer", file: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=300" }],
  },
  {
    type: "featured",
    movieName: "Cyberpunk: Neon Shadows",
    categories: ["Action", "Cyberpunk", "Thriller"],
    poster: "https://images.unsplash.com/photo-1578632767115-351597cf2477?q=80&w=800&auto=format&fit=crop",
    trailerUrl: "https://www.youtube.com/watch?v=8X2kIfS6fb8",
    videoUrl: "https://www.youtube.com/watch?v=8X2kIfS6fb8",
    rating: 8.4,
    duration: 142,
    auditorium: "Audi 2 (Dolby Atmos)",
    seatPrices: {
      standard: 250,
      recliner: 420,
    },
    slots: generateSlots(),
    story: "In a neon-drenched dystopian metropolis, a rogue hacker and an elite operative uncover a corporate conspiracy threatening human consciousness.",
    cast: [
      { name: "David Miller", role: "Kaelen Vance", file: "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=300" },
      { name: "Elena Rostova", role: "Mira Chen", file: "https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=300" },
    ],
    directors: [{ name: "Denis Villeneuve", role: "Director", file: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=300" }],
    producers: [{ name: "Ridley Scott", role: "Producer", file: "https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=300" }],
  },
  {
    type: "normal",
    movieName: "Shadow of the Dragon",
    categories: ["Action", "Fantasy", "Martial Arts"],
    poster: "https://images.unsplash.com/photo-1563089145-599997674d42?q=80&w=800&auto=format&fit=crop",
    trailerUrl: "https://www.youtube.com/watch?v=giXco2jaZ_4",
    videoUrl: "https://www.youtube.com/watch?v=giXco2jaZ_4",
    rating: 7.9,
    duration: 135,
    auditorium: "Audi 3",
    seatPrices: {
      standard: 220,
      recliner: 380,
    },
    slots: generateSlots(),
    story: "An ancient warrior awakens in modern Tokyo to reclaim a stolen celestial artifact and protect the realm from demonic resurrection.",
    cast: [
      { name: "Kenji Sato", role: "Ren", file: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=300" },
      { name: "Maya Lin", role: "Aoi", file: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=300" },
    ],
    directors: [{ name: "Takashi Yamazaki", role: "Director", file: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=300" }],
    producers: [{ name: "Kenzo Tange", role: "Producer", file: "https://images.unsplash.com/photo-1492562080023-ab3db95bfbce?w=300" }],
  },
  {
    type: "normal",
    movieName: "Midnight Enigma",
    categories: ["Mystery", "Crime", "Thriller"],
    poster: "https://images.unsplash.com/photo-1485846234645-a62644f84728?q=80&w=800&auto=format&fit=crop",
    trailerUrl: "https://www.youtube.com/watch?v=1g3_CFmnU7k",
    videoUrl: "https://www.youtube.com/watch?v=1g3_CFmnU7k",
    rating: 8.1,
    duration: 128,
    auditorium: "Audi 1",
    seatPrices: {
      standard: 200,
      recliner: 350,
    },
    slots: generateSlots(),
    story: "A brilliant detective investigates an impossible bank heist where no money was stolen, only classified memory drives of the city elite.",
    cast: [
      { name: "Marcus Brody", role: "Detective Hayes", file: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=300" },
      { name: "Victoria Sterling", role: "Cassidy Cole", file: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=300" },
    ],
    directors: [{ name: "David Fincher", role: "Director", file: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=300" }],
    producers: [{ name: "Ceán Chaffin", role: "Producer", file: "https://images.unsplash.com/photo-1517841905240-472988babdf9?w=300" }],
  },
  {
    type: "normal",
    movieName: "Chronicles of Olympus",
    categories: ["Adventure", "Mythology", "Action"],
    poster: "https://images.unsplash.com/photo-1518709268805-4e9042af9f23?q=80&w=800&auto=format&fit=crop",
    trailerUrl: "https://www.youtube.com/watch?v=d9MyW72ELq0",
    videoUrl: "https://www.youtube.com/watch?v=d9MyW72ELq0",
    rating: 7.7,
    duration: 150,
    auditorium: "IMAX Laser 2",
    seatPrices: {
      standard: 260,
      recliner: 450,
    },
    slots: generateSlots(),
    story: "Demigods unite against the awakening of primordial Titans seeking to plunge Mount Olympus and humanity into eternal chaos.",
    cast: [
      { name: "Alexander Thorne", role: "Perseus", file: "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=300" },
      { name: "Sophia Alvarez", role: "Athena's Chosen", file: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=300" },
    ],
    directors: [{ name: "Zack Snyder", role: "Director", file: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=300" }],
    producers: [{ name: "Deborah Snyder", role: "Producer", file: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=300" }],
  },
  {
    type: "normal",
    movieName: "Laugh Out Loud: The Wedding Chaos",
    categories: ["Comedy", "Romance"],
    poster: "https://images.unsplash.com/photo-1514306191717-452ec28c7814?q=80&w=800&auto=format&fit=crop",
    trailerUrl: "https://www.youtube.com/watch?v=k10ETZ41q5o",
    videoUrl: "https://www.youtube.com/watch?v=k10ETZ41q5o",
    rating: 7.5,
    duration: 115,
    auditorium: "Audi 4",
    seatPrices: {
      standard: 180,
      recliner: 320,
    },
    slots: generateSlots(),
    story: "Two rival best men accidentally double-book the same destination venue for opposing weddings on the exact same weekend.",
    cast: [
      { name: "Sammy Collins", role: "Jake", file: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=300" },
      { name: "Chloe Bennett", role: "Amber", file: "https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=300" },
    ],
    directors: [{ name: "Paul Feig", role: "Director", file: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=300" }],
    producers: [{ name: "Judd Apatow", role: "Producer", file: "https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=300" }],
  },
  {
    type: "releaseSoon",
    movieName: "Cosmic Odyssey: Starfall",
    categories: ["Sci-Fi", "Animation", "Family"],
    poster: "https://images.unsplash.com/photo-1451187580459-43490279c0fa?q=80&w=800&auto=format&fit=crop",
    trailerUrl: "https://www.youtube.com/watch?v=TcMBFSGVi1c",
    videoUrl: "https://www.youtube.com/watch?v=TcMBFSGVi1c",
    rating: 8.6,
    duration: 110,
    auditorium: "Audi 2",
    seatPrices: {
      standard: 200,
      recliner: 360,
    },
    slots: generateSlots(),
    story: "A curious robot astronomer discovers an encrypted lullaby beamed from a distant galaxy, sparking an interplanetary voyage.",
    cast: [
      { name: "Tara Strong (Voice)", role: "Orion", file: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=300" },
      { name: "Tom Kenny (Voice)", role: "Sparky", file: "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=300" },
    ],
    directors: [{ name: "Peter Sohn", role: "Director", file: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=300" }],
    producers: [{ name: "Pete Docter", role: "Producer", file: "https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=300" }],
  },
];

async function seedDatabase() {
  try {
    console.log("Connecting to MongoDB at:", DATABASE_URL.replace(/:\/\/.*@/, "://<hidden-credentials>@"));
    await mongoose.connect(DATABASE_URL);
    console.log("Connected to MongoDB successfully!");

    // Check if user passed '--clean' to replace all existing movies
    const shouldClean = process.argv.includes("--clean");
    if (shouldClean) {
      const deleted = await Movie.deleteMany({});
      console.log(`Cleared ${deleted.deletedCount} existing movies.`);
    }

    let insertedCount = 0;
    for (const movieData of sampleMovies) {
      // Check if movie already exists by name
      const existing = await Movie.findOne({ movieName: movieData.movieName });
      if (existing) {
        // Update existing movie with fresh slots & info
        await Movie.findByIdAndUpdate(existing._id, movieData);
        console.log(`Updated existing movie: "${movieData.movieName}"`);
      } else {
        await Movie.create(movieData);
        console.log(`Inserted new movie: "${movieData.movieName}"`);
      }
      insertedCount++;
    }

    console.log(`\n🎉 Success! Seeded ${insertedCount} movies with upcoming show slots.`);
    console.log(`Slots were dynamically scheduled for 60 days (from ${getDateString(0)} to ${getDateString(60)}).`);
    process.exit(0);
  } catch (error) {
    console.error("❌ Seeding failed:", error);
    process.exit(1);
  }
}

seedDatabase();
