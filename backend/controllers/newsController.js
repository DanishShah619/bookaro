const GNEWS_API_BASE = "https://gnews.io/api/v4/search";

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

    const response = await fetch(`${GNEWS_API_BASE}?${params.toString()}`);
    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      return res.status(response.status).json({
        success: false,
        message:
          data?.errors?.join(", ") ||
          data?.message ||
          "Failed to fetch acting news",
      });
    }

    const articles = Array.isArray(data.articles) ? data.articles : [];

    return res.json({
      success: true,
      items: articles.map(mapGNewsArticle),
    });
  } catch (err) {
    console.error("getActingNews error:", err);
    return res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
}

export default { getActingNews };
