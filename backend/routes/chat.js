const express = require('express');
const multer = require('multer');
const path = require('path');
const { db } = require('../config/database');

const router = express.Router();

// Cấu hình multer để upload file
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, path.join(__dirname, '../../public/uploads'));
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024 // Giới hạn 10MB
  },
  fileFilter: function (req, file, cb) {
    // Chỉ cho phép ảnh và tài liệu
    const allowedTypes = /jpeg|jpg|png|gif|pdf|doc|docx|txt/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);

    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Chỉ cho phép upload file ảnh và tài liệu'));
    }
  }
});

// Lấy danh sách cuộc hội thoại của user
router.get('/conversations', (req, res) => {
  const userId = req.userId;

  const query = `
    SELECT
      c.id,
      c.name,
      c.type,
      c.created_at,
      u.username as created_by_name,
      (SELECT COUNT(*) FROM messages WHERE chat_id = c.id) as message_count,
      (SELECT content FROM messages WHERE chat_id = c.id ORDER BY created_at DESC LIMIT 1) as last_message,
      (SELECT created_at FROM messages WHERE chat_id = c.id ORDER BY created_at DESC LIMIT 1) as last_message_time
    FROM chats c
    JOIN chat_participants cp ON c.id = cp.chat_id
    LEFT JOIN users u ON c.created_by = u.id
    WHERE cp.user_id = ?
    ORDER BY last_message_time DESC
  `;

  db.all(query, [userId], (err, chats) => {
    if (err) {
      return res.status(500).json({ error: 'Lỗi lấy danh sách cuộc hội thoại' });
    }

    res.json({ chats });
  });
});

// Tạo cuộc hội thoại mới hoặc lấy cuộc hội thoại hiện có với user khác
router.post('/conversation', (req, res) => {
  const { otherUserId } = req.body;
  const currentUserId = req.userId;

  if (!otherUserId) {
    return res.status(400).json({ error: 'Thiếu thông tin user' });
  }

  // Tìm cuộc hội thoại cá nhân hiện có giữa 2 user
  const findChatQuery = `
    SELECT c.id FROM chats c
    JOIN chat_participants cp1 ON c.id = cp1.chat_id AND cp1.user_id = ?
    JOIN chat_participants cp2 ON c.id = cp2.chat_id AND cp2.user_id = ?
    WHERE c.type = 'personal' AND c.id IN (
      SELECT chat_id FROM chat_participants GROUP BY chat_id HAVING COUNT(*) = 2
    )
  `;

  db.get(findChatQuery, [currentUserId, otherUserId], (err, existingChat) => {
    if (err) {
      return res.status(500).json({ error: 'Lỗi tìm cuộc hội thoại' });
    }

    if (existingChat) {
      // Trả về cuộc hội thoại hiện có
      res.json({ chatId: existingChat.id, isNew: false });
    } else {
      // Tạo cuộc hội thoại mới
      db.run(
        'INSERT INTO chats (name, type, created_by) VALUES (?, ?, ?)',
        [`Chat giữa ${currentUserId} và ${otherUserId}`, 'personal', currentUserId],
        function(err) {
          if (err) {
            return res.status(500).json({ error: 'Lỗi tạo cuộc hội thoại' });
          }

          const chatId = this.lastID;

          // Thêm cả 2 user vào cuộc hội thoại
          const participants = [currentUserId, otherUserId];
          let completed = 0;

          participants.forEach(userId => {
            db.run(
              'INSERT INTO chat_participants (chat_id, user_id) VALUES (?, ?)',
              [chatId, userId],
              (err) => {
                completed++;
                if (err) {
                  console.error('Lỗi thêm participant:', err);
                }

                if (completed === participants.length) {
                  res.json({ chatId, isNew: true });
                }
              }
            );
          });
        }
      );
    }
  });
});

// Lấy tin nhắn của cuộc hội thoại
router.get('/messages/:chatId', (req, res) => {
  const { chatId } = req.params;
  const { limit = 50, offset = 0 } = req.query;

  // Kiểm tra user có quyền truy cập cuộc hội thoại không
  db.get(
    'SELECT id FROM chat_participants WHERE chat_id = ? AND user_id = ?',
    [chatId, req.userId],
    (err, participant) => {
      if (err || !participant) {
        return res.status(403).json({ error: 'Không có quyền truy cập cuộc hội thoại này' });
      }

      const query = `
        SELECT m.*, u.username as sender_name, u.avatar as sender_avatar
        FROM messages m
        JOIN users u ON m.sender_id = u.id
        WHERE m.chat_id = ?
        ORDER BY m.created_at DESC
        LIMIT ? OFFSET ?
      `;

      db.all(query, [chatId, parseInt(limit), parseInt(offset)], (err, messages) => {
        if (err) {
          return res.status(500).json({ error: 'Lỗi lấy tin nhắn' });
        }

        // Đảo ngược thứ tự để hiện tin nhắn cũ nhất trước
        messages.reverse();
        res.json({ messages });
      });
    }
  );
});

// Gửi tin nhắn
router.post('/messages', upload.single('file'), (req, res) => {
  const { chatId, content, messageType = 'text' } = req.body;
  const senderId = req.userId;

  if (!chatId || (!content && !req.file && messageType === 'text')) {
    return res.status(400).json({ error: 'Thiếu nội dung tin nhắn' });
  }

  // Kiểm tra user có quyền gửi tin nhắn vào cuộc hội thoại không
  db.get(
    'SELECT id FROM chat_participants WHERE chat_id = ? AND user_id = ?',
    [chatId, senderId],
    (err, participant) => {
      if (err || !participant) {
        return res.status(403).json({ error: 'Không có quyền gửi tin nhắn vào cuộc hội thoại này' });
      }

      // Xử lý file upload
      let filePath = null;
      let fileName = null;
      let fileSize = null;

      if (req.file) {
        filePath = req.file.filename;
        fileName = req.file.originalname;
        fileSize = req.file.size;
      }

      // Lưu tin nhắn
      db.run(
        `INSERT INTO messages (chat_id, sender_id, content, message_type, file_path, file_name, file_size)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [chatId, senderId, content || '', messageType, filePath, fileName, fileSize],
        function(err) {
          if (err) {
            return res.status(500).json({ error: 'Lỗi gửi tin nhắn' });
          }

          // Lấy thông tin tin nhắn vừa gửi
          db.get(
            `SELECT m.*, u.username as sender_name, u.avatar as sender_avatar
             FROM messages m
             JOIN users u ON m.sender_id = u.id
             WHERE m.id = ?`,
            [this.lastID],
            (err, message) => {
              if (err) {
                return res.status(500).json({ error: 'Lỗi lấy thông tin tin nhắn' });
              }

              res.json({ message });

              // Gửi real-time thông qua Socket.io
              const { io } = require('../server');
              io.to(chatId).emit('receive-message', { message, chatId });
            }
          );
        }
      );
    }
  );
});

// Lấy danh sách user để tạo cuộc hội thoại mới
router.get('/users', (req, res) => {
  const currentUserId = req.userId;
  const { search = '' } = req.query;

  const query = `
    SELECT id, username, email, avatar
    FROM users
    WHERE id != ? AND (username LIKE ? OR email LIKE ?)
    LIMIT 20
  `;

  const searchTerm = `%${search}%`;
  db.all(query, [currentUserId, searchTerm, searchTerm], (err, users) => {
    if (err) {
      return res.status(500).json({ error: 'Lỗi tìm kiếm user' });
    }

    res.json({ users });
  });
});

module.exports = router;