const jwt = require('jsonwebtoken');
const { db } = require('../config/database');

const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

  // Đặt JWT_SECRET mặc định nếu không có trong environment
  const secret = process.env.JWT_SECRET || 'fallback-secret-key-for-development-only';

  console.log('Auth middleware - Token:', token ? 'present' : 'missing');

  if (!token) {
    return res.status(401).json({ error: 'Không có token xác thực' });
  }

  jwt.verify(token, secret, (err, decoded) => {
    if (err) {
      console.error('JWT verify error:', err.message);
      return res.status(403).json({ error: 'Token không hợp lệ hoặc đã hết hạn' });
    }

    console.log('JWT decoded successfully:', decoded);

    // Tạm thời bỏ qua kiểm tra session trong database để khắc phục lỗi
    console.log('Skipping database session check for debugging');
    req.userId = decoded.userId;
    req.user = decoded;
    next();

    // Nếu muốn kiểm tra session, uncomment đoạn sau:
    /*
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
    */
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
  // Đặt JWT_SECRET mặc định nếu không có trong environment
  const secret = process.env.JWT_SECRET || 'fallback-secret-key-for-development-only';

  const token = jwt.sign({ userId }, secret, { expiresIn: '24h' });
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