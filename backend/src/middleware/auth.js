/**
 * Deliberately simple: one admin, one session cookie, no roles/permissions
 * matrix. This matches the spec — internal trusted staff only, not a
 * multi-tenant product — so a heavier auth system would be over-engineering.
 */
export function requireAuth(req, res, next) {
  if (req.session?.isAuthenticated) {
    return next();
  }
  return res.status(401).json({ error: 'Not authenticated' });
}
