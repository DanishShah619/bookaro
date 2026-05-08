import https from "https";

const GNEWS_API_BASE = "https://gnews.io/api/v4/search";

let newsCache = {
  data: null,
  lastFetch: 0,
};
const CACHE_DURATION = 60 * 60 * 1000; // 1 hour

const mapGNewsArticle = (article, index) => ({
  id: article.url || `${article.title || "article"}-${index}`,
  title: article.title || "Untitled",
  excerpt: article.description || article.content || "",
  image: article.image || "",
  time: article.publishedAt
    ? new Date(article.publishedAt).toLocaleTimeString("en-IN", {
      hour: "numeric",
      minute: "2-digit",
    })
    : "",
  date: article.publishedAt
    ? new Date(article.publishedAt).toLocaleDateString("en-IN", {
      month: "short",
      day: "numeric",
      year: "numeric",
    })
    : "",
  category: "Acting News",
  source: article.source?.name || "GNews",
  url: article.url || "",
});

export async function getActingNews(req, res) {
  try {
    const now = Date.now();
    // Check if cache is valid (within 1 hour)
    if (newsCache.data && now - newsCache.lastFetch < CACHE_DURATION) {
      return res.json({
        success: true,
        items: newsCache.data,
      });
    }

    const apiKey = process.env.GNEWS_API_KEY;

    if (!apiKey) {
      return res.status(503).json({
        success: false,
        message: "GNEWS_API_KEY is not configured",
      });
    }

    const params = new URLSearchParams({
      q: "actor OR actress OR cinema OR Bollywood OR Hollywood",
      lang: "en",
      country: "in",
      max: String(Math.min(Number(req.query.limit) || 7, 10)),
      apikey: apiKey,
    });

    // Prefix the GNEWS URL with codetabs proxy to bypass ISP blocks and proxy 403s.
    const targetUrl = encodeURIComponent(`${GNEWS_API_BASE}?${params.toString()}`);
    const url = `https://api.codetabs.com/v1/proxy?quest=${targetUrl}`;
    
    const response = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)",
      },
    });
    
    const data = await response.json().catch(() => ({}));

    if (!response.ok || data.errors) {
      console.log("PROXY ERROR LOG:", response.status, data);
      return res.status(403).json({
        success: false,
        message: data?.errors?.join(", ") || data?.message || "Failed to fetch acting news (Check API quota)",
      });
    }

    const articles = Array.isArray(data.articles) ? data.articles : [];
    const items = articles.map(mapGNewsArticle);

    // Save to cache
    newsCache.data = items;
    newsCache.lastFetch = now;

    return res.json({
      success: true,
      items,
    });
  } catch (err) {
    console.error("getActingNews error:", err);
    return res.status(500).json({
      success: false,
      message: err.message || "Server error",
      error: String(err)
    });
  }
}

export default { getActingNews };
