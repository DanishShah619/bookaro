import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { moviesPageStyles } from "../../assets/dummyStyles";
import { BeamsBackground } from "../ui/beams-background";
import { HoverBorderGradient } from "../ui/hover-border-gradient";

const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://localhost:5000";
const COLLAPSE_COUNT = 12;
const PLACEHOLDER = "https://placehold.co/400x600?text=No+Poster";
const MOVIES_CACHE_KEY = "bookaro:movies:v1";
const SKELETON_COUNT = 12;

function getUploadUrl(maybe) {
  if (!maybe) return null;
  if (typeof maybe !== "string") return null;
  if (maybe.startsWith("http://") || maybe.startsWith("https://")) {
    if (/localhost:\d+/.test(maybe)) {
      try {
        const url = new URL(maybe);
        const filename = url.pathname.split('/uploads/').pop();
        return `${API_BASE}/uploads/${filename}`;
      } catch {
        return maybe;
      }
    }
    return maybe;
  }

  // relative or "uploads/..." -> build with API_BASE
  const cleaned = String(maybe).replace(/^uploads\//, "");
  return `${API_BASE}/uploads/${cleaned}`;
}

const categoriesList = [
  { id: "all", name: "All Movies" },
  { id: "action", name: "Action" },
  { id: "horror", name: "Horror" },
  { id: "comedy", name: "Comedy" },
  { id: "adventure", name: "Adventure" },
  { id: "drama", name: "Drama" },
  { id: "thriller", name: "Thriller" },
  { id: "scary", name: "Scary" },
  { id: "historical", name: "Historical" },
  { id:"fantasy", name: "Fantasy"}
];

const mapBackendMovie = (m) => {
  const id = m._id || m.id || "";
  const title = m.movieName || m.title || "Untitled";
  const rawImg = m.poster || m.latestTrailer?.thumbnail || m.thumbnail || null;
  const image = getUploadUrl(rawImg) || PLACEHOLDER;

  // pick first category (normalize to lowercase for category id comparisons)
  const cat =
    (Array.isArray(m.categories) && m.categories[0]) ||
    m.category ||
    (Array.isArray(m.latestTrailer?.genres) && m.latestTrailer.genres[0]) ||
    "General";

  const category = String(cat || "General");

  return { id, title, image, category, raw: m };
};

const isBookableMovie = (movie) => {
  const type = String(movie?.type || "normal").trim();
  return type === "normal" || type === "featured";
};

const readCachedMovies = () => {
  if (typeof window === "undefined") return [];

  try {
    const cached = window.localStorage.getItem(MOVIES_CACHE_KEY);
    if (!cached) return [];
    const parsed = JSON.parse(cached);
    return Array.isArray(parsed?.movies) ? parsed.movies : [];
  } catch {
    return [];
  }
};

const writeCachedMovies = (nextMovies) => {
  if (typeof window === "undefined") return;

  try {
    window.localStorage.setItem(
      MOVIES_CACHE_KEY,
      JSON.stringify({ movies: nextMovies, cachedAt: Date.now() })
    );
  } catch {
    // Cache failures should not block the movie page.
  }
};

const preloadPosterImages = (nextMovies) => {
  if (typeof window === "undefined") return;

  nextMovies.slice(0, COLLAPSE_COUNT).forEach((movie) => {
    if (!movie.image || movie.image === PLACEHOLDER) return;
    const img = new Image();
    img.src = movie.image;
  });
};

const MovieSkeletonCard = () => (
  <div className="animate-pulse" aria-hidden="true">
    <div className="aspect-[2/3] rounded-lg bg-gradient-to-br from-gray-800 via-gray-700 to-gray-900" />
    <div className="mx-auto mt-3 h-4 w-3/4 rounded-full bg-gray-800" />
    <div className="mx-auto mt-2 h-3 w-1/2 rounded-full bg-gray-900" />
  </div>
);

const LoadingScrollBar = ({ label = "Refreshing movies" }) => (
  <div className="mb-5" role="status" aria-live="polite">
    <div className="mb-2 text-center text-xs uppercase tracking-[0.2em] text-red-200/80">
      {label}
    </div>
    <div className="mx-auto h-1.5 max-w-sm overflow-hidden rounded-full bg-white/10">
      <div className="h-full w-1/3 animate-[movie-scroll_1.1s_ease-in-out_infinite] rounded-full bg-gradient-to-r from-red-500 via-white to-red-600" />
    </div>
    <style>{`
      @keyframes movie-scroll {
        0% { transform: translateX(-120%); }
        100% { transform: translateX(320%); }
      }
    `}</style>
  </div>
);

export default function MoviesPage() {
  const cachedMovies = useMemo(() => readCachedMovies(), []);
  const [activeCategory, setActiveCategory] = useState("all");
  const [showAll, setShowAll] = useState(false);
  const [movies, setMovies] = useState(cachedMovies);
  const [loading, setLoading] = useState(cachedMovies.length === 0);
  const [refreshing, setRefreshing] = useState(cachedMovies.length > 0);
  const [error, setError] = useState(null);

  const fetchMovies = useCallback(async (signal) => {
    const res = await fetch(`${API_BASE}/api/movies?limit=200`, {
      signal,
      cache: "no-cache",
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);

    const json = await res.json();
    const items = Array.isArray(json.items) ? json.items : [];
    return items.filter(isBookableMovie).map(mapBackendMovie);
  }, []);

  useEffect(() => {
    const ac = new AbortController();

    async function load() {
      const hasStaleMovies = cachedMovies.length > 0;
      setLoading(!hasStaleMovies);
      setRefreshing(hasStaleMovies);
      setError(null);

      try {
        const mapped = await fetchMovies(ac.signal);
        setMovies(mapped);
        writeCachedMovies(mapped);
        preloadPosterImages(mapped);
      } catch (err) {
        if (err.name === "AbortError") return;
        console.error("Failed to load movies:", err);
        setError(hasStaleMovies ? null : "Unable to load movies.");
      } finally {
        if (!ac.signal.aborted) {
          setLoading(false);
          setRefreshing(false);
        }
      }
    }

    load();
    return () => ac.abort();
  }, [cachedMovies.length, fetchMovies]);

  // hide expanded list when category changes
  useEffect(() => {
    setShowAll(false);
  }, [activeCategory]);

  // filter by category (case-insensitive)
  const filteredMovies = useMemo(() => {
    if (activeCategory === "all") return movies;
    return movies.filter(
      (m) =>
        String(m.category || "").toLowerCase() ===
        String(activeCategory || "").toLowerCase()
    );
  }, [movies, activeCategory]);

  const visibleMovies = showAll
    ? filteredMovies
    : filteredMovies.slice(0, COLLAPSE_COUNT);

  return (
    <BeamsBackground intensity="subtle" className="min-h-screen">
    <div className={moviesPageStyles.container}>
      <section className={moviesPageStyles.categoriesSection}>
        <div className={moviesPageStyles.categoriesContainer}>
          <div className={moviesPageStyles.categoriesFlex}>
            {categoriesList.map((category) => (
              <HoverBorderGradient
                key={category.id}
                as="button"
                onClick={() => setActiveCategory(category.id)}
                type="button"
                active={activeCategory === category.id}
                containerClassName={`transition-transform duration-200 ${
                  activeCategory === category.id ? "scale-105" : ""
                }`}
                className={
                  activeCategory === category.id ? "text-white font-bold" : "text-gray-400"
                }
              >
                {category.name}
              </HoverBorderGradient>
            ))}
          </div>
        </div>
      </section>

      <section className={moviesPageStyles.moviesSection}>
        <div className={moviesPageStyles.moviesContainer}>
          {refreshing && movies.length > 0 && (
            <LoadingScrollBar label="Updating movies" />
          )}

          {loading ? (
            <>
              <LoadingScrollBar label="Loading movies" />
              <div className={moviesPageStyles.moviesGrid}>
                {Array.from({ length: SKELETON_COUNT }).map((_, index) => (
                  <MovieSkeletonCard key={index} />
                ))}
              </div>
            </>
          ) : error ? (
            <div className="py-12 text-center text-red-400">{error}</div>
          ) : (
            <>
              <div className={moviesPageStyles.moviesGrid}>
                {visibleMovies.map((movie) => (
                  <Link
                    key={movie.id}
                    to={`/movies/${movie.id}`}
                    state={{ movie: movie.raw }}
                    aria-label={`Open details for ${movie.title}`}
                    className={moviesPageStyles.movieCard}
                  >
                    <div className={moviesPageStyles.movieImageContainer}>
                      <img
                        src={movie.image}
                        alt={movie.title}
                        className={moviesPageStyles.movieImage}
                      />
                    </div>

                    <div className={moviesPageStyles.movieInfo}>
                      <h3 className={moviesPageStyles.movieTitle}>
                        {movie.title}
                      </h3>
                      <div className={moviesPageStyles.movieCategory}>
                        <span className={moviesPageStyles.movieCategoryText}>
                          {movie.category}
                        </span>
                      </div>
                    </div>
                  </Link>
                ))}

                {filteredMovies.length === 0 && (
                  <div className={moviesPageStyles.emptyState}>
                    No movies found in this category.
                  </div>
                )}
              </div>

              {filteredMovies.length > COLLAPSE_COUNT && (
                <div className={moviesPageStyles.showMoreContainer}>
                  <button
                    onClick={() => setShowAll((p) => !p)}
                    className={moviesPageStyles.showMoreButton}
                    aria-expanded={showAll}
                    type="button"
                  >
                    {showAll
                      ? "Show less"
                      : `Show more (${filteredMovies.length - COLLAPSE_COUNT
                      } more)`}
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </section>
    </div>
    </BeamsBackground>
  );
}
