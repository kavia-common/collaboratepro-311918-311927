const { query } = require('../db/pool');

/**
 * Parse a placeholder Bearer token.
 * Token format (NOT secure): base64("userId:email")
 */
function decodeToken(token) {
  try {
    const decoded = Buffer.from(token, 'base64').toString('utf8');
    const [userIdStr, email] = decoded.split(':');
    const userId = Number(userIdStr);
    if (!userId || !email) return null;
    return { userId, email };
  } catch (e) {
    return null;
  }
}

/**
 * PUBLIC_INTERFACE
 * Express middleware requiring a valid Authorization header.
 * Adds req.user = { id, email, name }.
 */
async function requireAuth(req, res, next) {
  try {
    const header = req.get('authorization') || '';
    const match = header.match(/^Bearer\s+(.+)$/i);
    if (!match) {
      return res.status(401).json({ message: 'Missing Authorization Bearer token' });
    }

    const parsed = decodeToken(match[1]);
    if (!parsed) {
      return res.status(401).json({ message: 'Invalid token' });
    }

    const result = await query(
      'SELECT id, email, name, created_at FROM users WHERE id = $1 AND email = $2',
      [parsed.userId, parsed.email]
    );

    if (result.rowCount === 0) {
      return res.status(401).json({ message: 'Unknown user' });
    }

    req.user = result.rows[0];
    return next();
  } catch (err) {
    return next(err);
  }
}

module.exports = {
  requireAuth,
};
