const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, '../../database.sqlite');

const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Lỗi kết nối database:', err.message);
  } else {
    console.log('Đã kết nối tới SQLite database');
  }
});

async function initializeDatabase() {
  return new Promise((resolve, reject) => {
    // Tạo bảng users
    db.run(`CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      avatar TEXT,
      is_admin INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`, (err) => {
      if (err) {
        console.error('Lỗi tạo bảng users:', err.message);
        reject(err);
        return;
      }
      console.log('Đã tạo bảng users');

      // Tạo bảng chats
      db.run(`CREATE TABLE IF NOT EXISTS chats (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT,
        type TEXT DEFAULT 'personal',
        created_by INTEGER,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (created_by) REFERENCES users (id)
      )`, (err) => {
        if (err) {
          console.error('Lỗi tạo bảng chats:', err.message);
          reject(err);
          return;
        }
        console.log('Đã tạo bảng chats');

        // Tạo bảng chat_participants
        db.run(`CREATE TABLE IF NOT EXISTS chat_participants (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          chat_id INTEGER,
          user_id INTEGER,
          joined_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (chat_id) REFERENCES chats (id) ON DELETE CASCADE,
          FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
          UNIQUE(chat_id, user_id)
        )`, (err) => {
          if (err) {
            console.error('Lỗi tạo bảng chat_participants:', err.message);
            reject(err);
            return;
          }
          console.log('Đã tạo bảng chat_participants');

          // Tạo bảng messages
          db.run(`CREATE TABLE IF NOT EXISTS messages (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            chat_id INTEGER,
            sender_id INTEGER,
            content TEXT,
            message_type TEXT DEFAULT 'text',
            file_path TEXT,
            file_name TEXT,
            file_size INTEGER,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (chat_id) REFERENCES chats (id) ON DELETE CASCADE,
            FOREIGN KEY (sender_id) REFERENCES users (id) ON DELETE CASCADE
          )`, (err) => {
            if (err) {
              console.error('Lỗi tạo bảng messages:', err.message);
              reject(err);
              return;
            }
            console.log('Đã tạo bảng messages');

            // Tạo bảng user_sessions (để quản lý đăng nhập)
            db.run(`CREATE TABLE IF NOT EXISTS user_sessions (
              id INTEGER PRIMARY KEY AUTOINCREMENT,
              user_id INTEGER,
              token TEXT UNIQUE,
              expires_at DATETIME,
              created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
              FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
            )`, (err) => {
              if (err) {
                console.error('Lỗi tạo bảng user_sessions:', err.message);
                reject(err);
                return;
              }
              console.log('Đã tạo bảng user_sessions');
              resolve();
            });
          });
        });
      });
    });
  });
}

module.exports = { db, initializeDatabase };