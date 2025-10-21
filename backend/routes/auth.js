const express = require('express');
const bcrypt = require('bcryptjs');
const { db } = require('../config/database');
const { generateToken, storeSession, clearSession } = require('../middleware/auth');

const router = express.Router();

// Đăng ký tài khoản mới
router.post('/register', async (req, res) => {
  try {
    const { username, email, password } = req.body;

    // Kiểm tra dữ liệu đầu vào
    if (!username || !email || !password) {
      return res.status(400).json({ error: 'Vui lòng điền đầy đủ thông tin' });
    }

    if (password.length < 6) {
      return res.status(400).json({ error: 'Mật khẩu phải có ít nhất 6 ký tự' });
    }

    // Kiểm tra username đã tồn tại chưa
    db.get('SELECT id FROM users WHERE username = ?', [username], async (err, user) => {
      if (err) {
        return res.status(500).json({ error: 'Lỗi server' });
      }

      if (user) {
        return res.status(400).json({ error: 'Tên đăng nhập đã tồn tại' });
      }

      // Kiểm tra email đã tồn tại chưa
      db.get('SELECT id FROM users WHERE email = ?', [email], async (err, user) => {
        if (err) {
          return res.status(500).json({ error: 'Lỗi server' });
        }

        if (user) {
          return res.status(400).json({ error: 'Email đã được sử dụng' });
        }

        // Mã hóa mật khẩu
        const saltRounds = 10;
        const hashedPassword = await bcrypt.hash(password, saltRounds);

        // Tạo user mới
        db.run(
          'INSERT INTO users (username, email, password) VALUES (?, ?, ?)',
          [username, email, hashedPassword],
          function(err) {
            if (err) {
              return res.status(500).json({ error: 'Lỗi tạo tài khoản' });
            }

            const userId = this.lastID;
            const token = generateToken(userId);

            // Lưu session
            storeSession(userId, token)
              .then(() => {
                res.status(201).json({
                  message: 'Đăng ký thành công',
                  token,
                  user: { id: userId, username, email }
                });
              })
              .catch((error) => {
                res.status(500).json({ error: 'Lỗi lưu phiên đăng nhập' });
              });
          }
        );
      });
    });
  } catch (error) {
    res.status(500).json({ error: 'Lỗi server' });
  }
});

// Đăng nhập
router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;

    console.log('Login attempt:', { username, hasPassword: !!password });

    if (!username || !password) {
      return res.status(400).json({ error: 'Vui lòng nhập tên đăng nhập và mật khẩu' });
    }

    // Tìm user theo username
    db.get('SELECT * FROM users WHERE username = ?', [username], async (err, user) => {
      if (err) {
        console.error('Database error:', err);
        return res.status(500).json({ error: 'Lỗi server' });
      }

      if (!user) {
        return res.status(401).json({ error: 'Tên đăng nhập hoặc mật khẩu không đúng' });
      }

      console.log('User found:', { id: user.id, username: user.username, isAdmin: user.is_admin });

      // Kiểm tra mật khẩu
      const isValidPassword = await bcrypt.compare(password, user.password);
      if (!isValidPassword) {
        return res.status(401).json({ error: 'Tên đăng nhập hoặc mật khẩu không đúng' });
      }

      // Tạo token mới
      const token = generateToken(user.id);
      console.log('Token generated for user:', user.id);

      // Xóa session cũ và tạo session mới
      try {
        await clearSession(null); // Xóa tất cả session cũ của user này
        await storeSession(user.id, token);
        console.log('Session stored successfully');
      } catch (sessionError) {
        console.error('Session error:', sessionError);
      }

      res.json({
        message: 'Đăng nhập thành công',
        token,
        user: { id: user.id, username: user.username, email: user.email, avatar: user.avatar, is_admin: user.is_admin }
      });
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Lỗi server' });
  }
});

// Đăng xuất
router.post('/logout', (req, res) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (token) {
      clearSession(token)
        .then(() => {
          res.json({ message: 'Đăng xuất thành công' });
        })
        .catch((error) => {
          res.status(500).json({ error: 'Lỗi đăng xuất' });
        });
    } else {
      res.json({ message: 'Đăng xuất thành công' });
    }
  } catch (error) {
    res.status(500).json({ error: 'Lỗi server' });
  }
});

// Lấy thông tin user hiện tại
router.get('/me', (req, res) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
      return res.status(401).json({ error: 'Không có token xác thực' });
    }

    // Giải mã token để lấy userId
    const jwt = require('jsonwebtoken');
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    db.get('SELECT id, username, email, avatar FROM users WHERE id = ?', [decoded.userId], (err, user) => {
      if (err) {
        return res.status(500).json({ error: 'Lỗi server' });
      }

      if (!user) {
        return res.status(404).json({ error: 'Không tìm thấy user' });
      }

      res.json({ user });
    });
  } catch (error) {
    res.status(500).json({ error: 'Lỗi server' });
  }
});

// API kiểm tra trạng thái đăng nhập để debug
router.get('/debug-users', (req, res) => {
    db.all('SELECT id, username, email, is_admin, created_at FROM users', [], (err, users) => {
        if (err) {
            return res.status(500).json({ error: 'Lỗi lấy danh sách users' });
        }

        res.json({
            users,
            message: 'Debug info - chỉ dùng trong development'
        });
    });
});

// API test đơn giản không cần authentication
router.get('/test', (req, res) => {
    res.json({
        message: 'API hoạt động bình thường',
        timestamp: new Date().toISOString(),
        environment: process.env.NODE_ENV || 'development'
    });
});

// API tạo user test với mật khẩu đơn giản
router.post('/create-test-user', async (req, res) => {
    try {
        const testPassword = '123456';
        const hashedPassword = await bcrypt.hash(testPassword, 10);

        db.run(
            'INSERT OR IGNORE INTO users (username, email, password, is_admin) VALUES (?, ?, ?, ?)',
            ['testuser', 'test@example.com', hashedPassword, 1],
            function(err) {
                if (err) {
                    console.error('Error creating test user:', err);
                    return res.status(500).json({ error: 'Lỗi tạo user test' });
                }

                console.log('Test user created successfully');
                res.json({
                    message: 'Đã tạo user test thành công',
                    credentials: {
                        username: 'testuser',
                        password: testPassword,
                        email: 'test@example.com'
                    }
                });
            }
        );
    } catch (error) {
        console.error('Create test user error:', error);
        res.status(500).json({ error: 'Lỗi server' });
    }
});

// API tạo user mặc định nếu chưa có user nào
router.post('/init-default-user', async (req, res) => {
    try {
        // Kiểm tra xem đã có user nào chưa
        db.get('SELECT COUNT(*) as count FROM users', [], async (err, row) => {
            if (err) {
                console.error('Error checking users count:', err);
                return res.status(500).json({ error: 'Lỗi kiểm tra users' });
            }

            if (row.count > 0) {
                return res.json({ message: 'Đã có users trong hệ thống', userCount: row.count });
            }

            // Tạo user mặc định
            const defaultPassword = '123456';
            const hashedPassword = await bcrypt.hash(defaultPassword, 10);

            db.run(
                'INSERT INTO users (username, email, password, is_admin) VALUES (?, ?, ?, ?)',
                ['admin', 'admin@example.com', hashedPassword, 1],
                function(err) {
                    if (err) {
                        console.error('Error creating default user:', err);
                        return res.status(500).json({ error: 'Lỗi tạo user mặc định' });
                    }

                    console.log('Default admin user created');
                    res.json({
                        message: 'Đã tạo user mặc định thành công',
                        credentials: {
                            username: 'admin',
                            password: defaultPassword,
                            email: 'admin@example.com'
                        }
                    });
                }
            );
        });
    } catch (error) {
        console.error('Init default user error:', error);
        res.status(500).json({ error: 'Lỗi server' });
    }
});

module.exports = router;