const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

// Import routes và middleware
const authRoutes = require('./routes/auth');
const chatRoutes = require('./routes/chat');
const adminRoutes = require('./routes/admin');
const { initializeDatabase } = require('./config/database');
const { authenticateToken } = require('./middleware/auth');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: process.env.NODE_ENV === 'production'
      ? false // Chỉ cho phép cùng domain trong production
      : "http://localhost:3000",
    methods: ["GET", "POST"],
    credentials: true
  }
});

// Middleware
app.use(cors({
  origin: process.env.NODE_ENV === 'production'
    ? false // Chỉ cho phép cùng domain trong production
    : true,
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static files từ thư mục uploads
app.use('/uploads', express.static(path.join(__dirname, '../public/uploads')));

// Serve frontend static files (cho production)
app.use(express.static(path.join(__dirname, '../frontend')));

// API routes (phải đặt sau static files)
app.use('/api/auth', authRoutes);
app.use('/api/chat', authenticateToken, chatRoutes);

// Catch all handler: send back React's index.html file for client-side routing
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/index.html'));
});

// API routes (phải đặt sau static files)
app.use('/api/auth', authRoutes);
app.use('/api/chat', authenticateToken, chatRoutes);
app.use('/api/admin', authenticateToken, adminRoutes);

// Socket.io connection handling
io.on('connection', (socket) => {
  console.log('User connected:', socket.id);

  socket.on('join-chat', (chatId) => {
    socket.join(chatId);
    console.log(`User ${socket.id} joined chat ${chatId}`);
  });

  socket.on('send-message', (data) => {
    // Broadcast tin nhắn mới cho các user khác trong phòng chat
    socket.to(data.chatId).emit('receive-message', data);
  });

  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
  });
});

// Khởi tạo database và start server
const PORT = process.env.PORT || 3001;
const isProduction = process.env.NODE_ENV === 'production';

async function startServer() {
  try {
    await initializeDatabase();
    server.listen(PORT, () => {
      console.log(`🚀 Chat App Backend đang chạy trên port ${PORT}`);
      console.log(`📅 Thời gian: ${new Date().toISOString()}`);
      if (isProduction) {
        console.log(`🌐 Production mode: ON`);
      } else {
        console.log(`🔧 Development mode: ON`);
      }
    });
  } catch (error) {
    console.error('Lỗi khởi động server:', error);
  }
}

startServer();

module.exports = { app, io };