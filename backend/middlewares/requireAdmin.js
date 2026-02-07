/**
 * requireAdmin — must be placed AFTER authMiddleware in a route chain.
 * Rejects requests from authenticated users who are not marked as admin.
 */
export default function requireAdmin(req, res, next) {
  if (!req.user || !req.user.isAdmin) {
    return res
      .status(403)
      .json({ success: false, message: "Forbidden: admin access required" });
  }
  next();
}
