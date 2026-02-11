import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { moviesStyles } from "../../assets/dummyStyles";
import { ExpandableCard } from "../ui/expandable-card";

const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://localhost:5000";
const PLACEHOLDER = "https://images.unsplash.com/photo-1536440136628-849c177e76a1?w=800&h=600&fit=crop";

function getUploadUrl(maybe) {
  if (!maybe) return null;
  if (typeof maybe !== "string") return null;
  if (maybe.startsWith("http://") || maybe.startsWith("https://")) {
    if (/localhost:\d+/.test(maybe)) {
      try {
        const url = new URL(maybe);
        const filename = url.pathname.split("/uploads/").pop();
        return `${API_BASE}/uploads/${filename}`;
      } catch {
        return maybe;
      }
    }
    return maybe;
  }
  const cleaned = String(maybe).replace(/^uploads\//, "");
  return `${API_BASE}/uploads/${cleaned}`;
}

export default function Movies() {
  const [movies, setMovies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const ac = new AbortController();
    setLoading(true);
    setError(null);

    async function loadFeaturedMovies() {
      try {
        const url = `${API_BASE}/api/movies?featured&limit=100`;
        const res = await fetch(url, { signal: ac.signal });
        if (!res.ok) throw new Error(`Fetch failed: ${res.status}`);
        const json = await res.json();

        const items = json.items ?? (Array.isArray(json) ? json : []);

        const featuredOnly = items.filter(
          (it) =>
            it?.featured === true ||
            it?.isFeatured === true ||
            String(it?.type)?.toLowerCase() === "featured"
        );

        setMovies(featuredOnly.slice(0, 6));
        setLoading(false);
      } catch (err) {
        if (err.name === "AbortError") return;
        console.error("Movies load error:", err);
        setError("Unable to load featured movies.");
        setLoading(false);
      }
    }

    loadFeaturedMovies();
    return () => ac.abort();
  }, []);

  return (
    <section className={moviesStyles.container}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Dancing+Script:wght@700&family=Pacifico&display=swap');
      `}</style>

      <h2
        className={moviesStyles.title}
        style={{ fontFamily: "'Dancing Script', cursive" }}
      >
        Featured Movies
      </h2>

      {loading ? (
        <div className="text-gray-300 py-12 text-center">Loading movies…</div>
      ) : error ? (
        <div className="text-red-400 py-12 text-center">{error}</div>
      ) : movies.length === 0 ? (
        <div className="text-gray-400 py-12 text-center">
          No featured movies found.
        </div>
      ) : (
        <div className="flex flex-wrap justify-center gap-6 px-4">
          {movies.map((m) => {
            const rawImg =
              m.poster || m.latestTrailer?.thumbnail || m.thumbnail || null;
            const imgSrc = getUploadUrl(rawImg) || PLACEHOLDER;
            const title = m.movieName || m.title || "Untitled";
            const category =
              (Array.isArray(m.categories) && m.categories[0]) ||
              m.category ||
              "General";
            const movieId = m._id || m.id || title;
            const synopsis =
              m.synopsis || m.description || m.overview ||
              "An exciting cinematic experience awaits. Click to discover the full story behind this featured film.";
            const director = m.director || m.directedBy || "Unknown Director";
            const cast = Array.isArray(m.cast)
              ? m.cast.slice(0, 4).join(", ")
              : m.cast || "See film details";
            const duration = m.durationMins
              ? `${Math.floor(m.durationMins / 60)}h ${m.durationMins % 60}m`
              : m.duration || "N/A";

            return (
              <ExpandableCard
                key={movieId}
                title={title}
                src={imgSrc}
                description={category}
                classNameExpanded="[&_h4]:text-black dark:[&_h4]:text-white [&_h4]:font-semibold [&_h4]:text-lg"
              >
                {/* Synopsis */}
                <h4>About the Film</h4>
                <p className="leading-relaxed">{synopsis}</p>

                {/* Details grid */}
                <h4>Film Details</h4>
                <div className="grid grid-cols-2 gap-3 w-full text-sm">
                  <div className="bg-zinc-100 dark:bg-zinc-900 rounded-lg p-3">
                    <span className="block text-xs uppercase tracking-widest text-zinc-400 mb-1">
                      Director
                    </span>
                    <span className="font-medium text-zinc-700 dark:text-zinc-300">
                      {director}
                    </span>
                  </div>
                  <div className="bg-zinc-100 dark:bg-zinc-900 rounded-lg p-3">
                    <span className="block text-xs uppercase tracking-widest text-zinc-400 mb-1">
                      Duration
                    </span>
                    <span className="font-medium text-zinc-700 dark:text-zinc-300">
                      {duration}
                    </span>
                  </div>
                  <div className="bg-zinc-100 dark:bg-zinc-900 rounded-lg p-3 col-span-2">
                    <span className="block text-xs uppercase tracking-widest text-zinc-400 mb-1">
                      Cast
                    </span>
                    <span className="font-medium text-zinc-700 dark:text-zinc-300">
                      {cast}
                    </span>
                  </div>
                </div>

                {/* Book now CTA */}
                <Link
                  to={`/movie/${movieId}`}
                  className="mt-2 inline-flex items-center gap-2 px-6 py-3 rounded-full bg-rose-600 hover:bg-rose-700 text-white font-semibold text-sm transition-colors duration-200"
                  onClick={(e) => e.stopPropagation()}
                >
                  Book Tickets
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M5 12h14" />
                    <path d="m12 5 7 7-7 7" />
                  </svg>
                </Link>
              </ExpandableCard>
            );
          })}
        </div>
      )}
    </section>
  );
}
