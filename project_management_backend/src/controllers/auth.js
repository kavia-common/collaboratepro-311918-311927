const crypto = require('crypto');
const { query } = require('../db/pool');

/**
 * Hash password with a per-user salt (placeholder).
 * NOTE: This is NOT as strong as bcrypt/argon2, but avoids extra deps for initial slice.
 */
function hashPassword(password, salt) {
  return crypto.pbkdf2Sync(password, salt, 100_000, 64, 'sha512').toString('hex');
}

function makeToken(user) {
  // Placeholder token: base64("id:email")
  return Buffer.from(`${user.id}:${user.email}`, 'utf8').toString('base64');
}

class AuthController {
  /**
   * PUBLIC_INTERFACE
   * Register a new user.
   */
  async register(req, res, next) {
    try {
      const { email, password, name } = req.body || {};
      if (!email || !password) {
        return res.status(400).json({ message: 'email and password are required' });
      }

      const salt = crypto.randomBytes(16).toString('hex');
      const passwordHash = `${salt}$${hashPassword(password, salt)}`;

      const result = await query(
        'INSERT INTO users (email, password_hash, name) VALUES ($1, $2, $3) RETURNING id, email, name, created_at',
        [email.toLowerCase(), passwordHash, name || null]
      );

      const user = result.rows[0];
      return res.status(201).json({
        user,
        token: makeToken(user),
      });
    } catch (err) {
      // Handle unique constraint on email
      if (String(err.message || '').includes('duplicate key')) {
        return res.status(409).json({ message: 'Email already registered' });
      }
      return next(err);
    }
  }

  /**
   * PUBLIC_INTERFACE
   * Login with email/password.
   */
  async login(req, res, next) {
    try {
      const { email, password } = req.body || {};
      if (!email || !password) {
        return res.status(400).json({ message: 'email and password are required' });
      }

      const result = await query(
        'SELECT id, email, name, password_hash, created_at FROM users WHERE email = $1',
        [email.toLowerCase()]
      );

      if (result.rowCount === 0) {
        return res.status(401).json({ message: 'Invalid credentials' });
      }

      const userRow = result.rows[0];
      const [salt, storedHash] = (userRow.password_hash || '').split('$$');
      if (!salt || !storedHash) {
        return res.status(500).json({ message: 'User password data corrupted' });
      }

      const computed = hashPassword(password, salt);
      if (computed !== storedHash) {
        return res.status(401).json({ message: 'Invalid credentials' });
      }

      const user = {
        id: userRow.id,
        email: userRow.email,
        name: userRow.name,
        created_at: userRow.created_at,
      };

      return res.status(200).json({
        user,
        token: makeToken(user),
      });
    } catch (err) {
      return next(err);
    }
  }

  /**
   * PUBLIC_INTERFACE
   * Return current authenticated user.
   */
  async me(req, res) {
    return res.status(200).json({ user: req.user });
  }
}

module.exports = new AuthController();
