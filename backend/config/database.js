const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// Kiểm tra xem có DATABASE_URL không (Railway PostgreSQL)
const isProduction = process.env.NODE_ENV === 'production';
const usePostgres = process.env.DATABASE_URL && isProduction;

let db;

if (usePostgres) {
  // Sử dụng PostgreSQL trên production
  const { Client } = require('pg');
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });

  // Kết nối tới PostgreSQL
  async function connectPostgres() {
    try {
      await client.connect();
      console.log('🚀 Đã kết nối tới PostgreSQL trên Railway');
      return client;
    } catch (err) {
      console.error('❌ Lỗi kết nối PostgreSQL:', err);
      throw err;
    }
  }

  db = client;
} else {
  // Sử dụng SQLite cho development
  const dbPath = path.join(__dirname, '../../database.sqlite');
  const sqliteDb = new sqlite3.Database(dbPath, (err) => {
    if (err) {
      console.error('Lỗi kết nối SQLite database:', err.message);
    } else {
      console.log('💻 Đã kết nối tới SQLite database (development)');
    }
  });
  db = sqliteDb;
}

async function initializeDatabase() {
  if (usePostgres) {
    // Khởi tạo bảng PostgreSQL
    try {
      await db.query(`
        CREATE TABLE IF NOT EXISTS users (
          id SERIAL PRIMARY KEY,
          username VARCHAR(255) UNIQUE NOT NULL,
          email VARCHAR(255) UNIQUE NOT NULL,
          password VARCHAR(255) NOT NULL,
          avatar TEXT,
          is_admin INTEGER DEFAULT 0,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);
      console.log('✅ Đã tạo bảng users trong PostgreSQL');

      await db.query(`
        CREATE TABLE IF NOT EXISTS chats (
          id SERIAL PRIMARY KEY,
          name TEXT,
          type VARCHAR(50) DEFAULT 'personal',
          created_by INTEGER,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (created_by) REFERENCES users (id)
        )
      `);
      console.log('✅ Đã tạo bảng chats trong PostgreSQL');

      await db.query(`
        CREATE TABLE IF NOT EXISTS chat_participants (
          id SERIAL PRIMARY KEY,
          chat_id INTEGER,
          user_id INTEGER,
          joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (chat_id) REFERENCES chats (id) ON DELETE CASCADE,
          FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
          UNIQUE(chat_id, user_id)
        )
      `);
      console.log('✅ Đã tạo bảng chat_participants trong PostgreSQL');

      await db.query(`
        CREATE TABLE IF NOT EXISTS messages (
          id SERIAL PRIMARY KEY,
          chat_id INTEGER,
          sender_id INTEGER,
          content TEXT,
          message_type VARCHAR(50) DEFAULT 'text',
          file_path TEXT,
          file_name TEXT,
          file_size INTEGER,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (chat_id) REFERENCES chats (id) ON DELETE CASCADE,
          FOREIGN KEY (sender_id) REFERENCES users (id) ON DELETE CASCADE
        )
      `);
      console.log('✅ Đã tạo bảng messages trong PostgreSQL');

      await db.query(`
        CREATE TABLE IF NOT EXISTS user_sessions (
          id SERIAL PRIMARY KEY,
          user_id INTEGER,
          token TEXT UNIQUE,
          expires_at TIMESTAMP,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
        )
      `);
      console.log('✅ Đã tạo bảng user_sessions trong PostgreSQL');

      console.log('🎉 PostgreSQL database đã sẵn sàng!');
    } catch (error) {
      console.error('❌ Lỗi tạo bảng PostgreSQL:', error);
      throw error;
    }
  } else {
    // Khởi tạo bảng SQLite (development)
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