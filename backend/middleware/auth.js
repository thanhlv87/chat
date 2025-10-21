const jwt = require('jsonwebtoken');
const { db } = require('../config/database');

const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

  console.log('Auth middleware - Token:', token ? 'present' : 'missing');
  console.log('JWT_SECRET:', process.env.JWT_SECRET ? 'set' : 'missing');

  if (!token) {
    return res.status(401).json({ error: 'Không có token xác thực' });
  }

  jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
    if (err) {
      console.error('JWT verify error:', err.message);
      return res.status(403).json({ error: 'Token không hợp lệ hoặc đã hết hạn' });
    }

    console.log('JWT decoded:', decoded);

    // Kiểm tra token trong database
    db.get(
      'SELECT * FROM user_sessions WHERE token = ? AND expires_at > datetime("now")',
      [token],
      (err, session) => {
        if (err) {
          console.error('Database session error:', err);
          return res.status(500).json({ error: 'Lỗi database' });
        }

        if (!session) {
          console.error('No valid session found for token');
          return res.status(403).json({ error: 'Phiên đăng nhập không hợp lệ' });
        }

        console.log('Valid session found for user:', session.user_id);
        req.userId = decoded.userId;
        req.user = decoded;
        next();
      }
    );
  });
};

const requireAdmin = (req, res, next) => {
  // Kiểm tra user có phải admin không
  db.get('SELECT is_admin FROM users WHERE id = ?', [req.userId], (err, user) => {
    if (err) {
      return res.status(500).json({ error: 'Lỗi kiểm tra quyền admin' });
    }

    if (!user || !user.is_admin) {
      return res.status(403).json({ error: 'Không có quyền truy cập admin panel' });
    }

    next();
  });
};

const generateToken = (userId) => {
  const token = jwt.sign({ userId }, process.env.JWT_SECRET, { expiresIn: '24h' });
  console.log('Generated token for user:', userId, 'secret exists:', !!process.env.JWT_SECRET);
  return token;
};

const storeSession = (userId, token) => {
  const expiresAt = new Date();
  expiresAt.setHours(expiresAt.getHours() + 24); // Hết hạn sau 24 giờ

  console.log('Storing session for user:', userId, 'expires:', expiresAt.toISOString());

  return new Promise((resolve, reject) => {
    db.run(
      'INSERT INTO user_sessions (user_id, token, expires_at) VALUES (?, ?, ?)',
      [userId, token, expiresAt.toISOString()],
      function(err) {
        if (err) {
          console.error('Error storing session:', err);
          reject(err);
        } else {
          console.log('Session stored successfully with ID:', this.lastID);
          resolve(this.lastID);
        }
      }
    );
  });
};

const clearSession = (token) => {
  return new Promise((resolve, reject) => {
    db.run('DELETE FROM user_sessions WHERE token = ?', [token], (err) => {
      if (err) {
        reject(err);
      } else {
        resolve();
      }
    });
  });
};

module.exports = {
  authenticateToken,
  requireAdmin,
  generateToken,
  storeSession,
  clearSession
};