const jwt = require('jsonwebtoken');
const { db } = require('../config/database');

const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

  if (!token) {
    return res.status(401).json({ error: 'Không có token xác thực' });
  }

  jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
    if (err) {
      return res.status(403).json({ error: 'Token không hợp lệ hoặc đã hết hạn' });
    }

    // Kiểm tra token trong database
    db.get(
      'SELECT * FROM user_sessions WHERE token = ? AND expires_at > datetime("now")',
      [token],
      (err, session) => {
        if (err || !session) {
          return res.status(403).json({ error: 'Phiên đăng nhập không hợp lệ' });
        }

        req.userId = decoded.userId;
        req.user = decoded;
        next();
      }
    );
  });
};

const generateToken = (userId) => {
  return jwt.sign({ userId }, process.env.JWT_SECRET, { expiresIn: '24h' });
};

const storeSession = (userId, token) => {
  const expiresAt = new Date();
  expiresAt.setHours(expiresAt.getHours() + 24); // Hết hạn sau 24 giờ

  return new Promise((resolve, reject) => {
    db.run(
      'INSERT INTO user_sessions (user_id, token, expires_at) VALUES (?, ?, ?)',
      [userId, token, expiresAt.toISOString()],
      function(err) {
        if (err) {
          reject(err);
        } else {
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
  generateToken,
  storeSession,
  clearSession
};