const express = require('express');
const bcrypt = require('bcryptjs');
const { db } = require('../config/database');
const { authenticateToken, requireAdmin } = require('../middleware/auth');

const router = express.Router();

// API lấy danh sách tất cả users (chỉ cho admin)
router.get('/users', authenticateToken, requireAdmin, (req, res) => {
    const query = `
        SELECT id, username, email, avatar, is_admin, created_at,
               (SELECT COUNT(*) FROM chat_participants WHERE user_id = users.id) as chat_count,
               (SELECT COUNT(*) FROM messages WHERE sender_id = users.id) as message_count
        FROM users
        ORDER BY created_at DESC
    `;

    db.all(query, [], (err, users) => {
        if (err) {
            return res.status(500).json({ error: 'Lỗi lấy danh sách users' });
        }

        res.json({ users });
    });
});

// API lấy thông tin user cụ thể kèm mật khẩu đã hash
router.get('/users/:id', authenticateToken, requireAdmin, (req, res) => {
    const { id } = req.params;

    db.get('SELECT * FROM users WHERE id = ?', [id], (err, user) => {
        if (err) {
            return res.status(500).json({ error: 'Lỗi lấy thông tin user' });
        }

        if (!user) {
            return res.status(404).json({ error: 'Không tìm thấy user' });
        }

        res.json({ user });
    });
});

// API reset mật khẩu user
router.post('/users/:id/reset-password', authenticateToken, requireAdmin, (req, res) => {
    const { id } = req.params;
    const { newPassword } = req.body;

    if (!newPassword || newPassword.length < 6) {
        return res.status(400).json({ error: 'Mật khẩu mới phải có ít nhất 6 ký tự' });
    }

    // Hash mật khẩu mới
    bcrypt.hash(newPassword, 10, (err, hashedPassword) => {
        if (err) {
            return res.status(500).json({ error: 'Lỗi mã hóa mật khẩu' });
        }

        db.run('UPDATE users SET password = ? WHERE id = ?', [hashedPassword, id], function(err) {
            if (err) {
                return res.status(500).json({ error: 'Lỗi cập nhật mật khẩu' });
            }

            res.json({ message: 'Đã reset mật khẩu thành công' });
        });
    });
});

// API xóa user
router.delete('/users/:id', authenticateToken, requireAdmin, (req, res) => {
    const { id } = req.params;

    db.run('DELETE FROM users WHERE id = ?', [id], function(err) {
        if (err) {
            return res.status(500).json({ error: 'Lỗi xóa user' });
        }

        res.json({ message: 'Đã xóa user thành công' });
    });
});

// API set user thành admin
router.post('/users/:id/make-admin', authenticateToken, requireAdmin, (req, res) => {
    const { id } = req.params;

    db.run('UPDATE users SET is_admin = 1 WHERE id = ?', [id], function(err) {
        if (err) {
            return res.status(500).json({ error: 'Lỗi cấp quyền admin' });
        }

        res.json({ message: 'Đã cấp quyền admin thành công' });
    });
});

// API hủy quyền admin của user
router.post('/users/:id/remove-admin', authenticateToken, requireAdmin, (req, res) => {
    const { id } = req.params;

    // Không cho phép hủy quyền admin của chính mình
    if (parseInt(id) === req.userId) {
        return res.status(400).json({ error: 'Không thể hủy quyền admin của chính mình' });
    }

    db.run('UPDATE users SET is_admin = 0 WHERE id = ?', [id], function(err) {
        if (err) {
            return res.status(500).json({ error: 'Lỗi hủy quyền admin' });
        }

        res.json({ message: 'Đã hủy quyền admin thành công' });
    });
});

module.exports = router;