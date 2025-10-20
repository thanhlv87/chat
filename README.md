# Chat Nội Bộ - Internal Chat Application

Ứng dụng chat nội bộ đơn giản với các tính năng đăng ký, tạo cuộc hội thoại cá nhân, gửi tin nhắn văn bản và file.

## Tính năng chính

- ✅ Đăng ký và đăng nhập tài khoản
- ✅ Tạo cuộc hội thoại cá nhân với người dùng khác
- ✅ Gửi tin nhắn văn bản thời gian thực
- ✅ Gửi file và hình ảnh
- ✅ Giao diện responsive và đẹp mắt
- ✅ Cơ sở dữ liệu SQLite đơn giản

## Kiến trúc dự án

```
appchat/
├── backend/                 # Backend Node.js
│   ├── config/
│   │   └── database.js     # Cấu hình SQLite
│   ├── middleware/
│   │   └── auth.js         # Xác thực JWT
│   ├── routes/
│   │   ├── auth.js         # API đăng ký/đăng nhập
│   │   └── chat.js         # API chat và file upload
│   ├── server.js           # Server chính
│   ├── package.json        # Dependencies
│   └── .env               # Biến môi trường
├── frontend/               # Frontend HTML/CSS/JS
│   ├── index.html         # Giao diện chính
│   ├── styles.css         # CSS styling
│   └── app.js             # JavaScript logic
├── public/
│   └── uploads/           # Thư mục lưu file upload
└── database.sqlite        # Cơ sở dữ liệu
```

## Công nghệ sử dụng

### Backend
- **Node.js** - Runtime environment
- **Express.js** - Web framework
- **Socket.io** - Real-time communication
- **SQLite3** - Cơ sở dữ liệu
- **JWT** - Xác thực người dùng
- **Multer** - Upload file
- **Bcrypt** - Mã hóa mật khẩu

### Frontend
- **HTML5** - Cấu trúc giao diện
- **CSS3** - Styling và responsive design
- **Vanilla JavaScript** - Logic ứng dụng
- **Socket.io Client** - Real-time chat

## Cài đặt và chạy

### 🚀 Deployment lên web (Khuyến nghị)

#### **Railway (Dễ nhất - Miễn phí)**

1. **Tạo tài khoản Railway:**
   - Truy cập [railway.app](https://railway.app)
   - Đăng ký tài khoản miễn phí

2. **Deploy ứng dụng:**
   ```bash
   # Cài đặt Railway CLI
   npm install -g @railway/cli

   # Đăng nhập Railway
   railway login

   # Tải dự án lên Railway
   railway init
   railway up
   ```

3. **Cấu hình production:**
   - Railway sẽ tự động detect Node.js app
   - JWT_SECRET sẽ được tạo tự động
   - Database sẽ được cung cấp miễn phí

4. **Truy cập ứng dụng:**
   - Railway sẽ cung cấp URL như: `https://your-app.railway.app`
   - Cả frontend và backend sẽ chạy trên cùng domain

#### **Các nền tảng khác:**

**Render:**
```bash
# Kết nối GitHub và deploy tự động
# Web Service: https://render.com
```

**Heroku:**
```bash
# Cần thẻ tín dụng để verify
heroku create your-app-name
git push heroku main
```

**Vercel (Frontend only):**
```bash
# Deploy frontend tĩnh
vercel --prod
```

### 💻 Chạy local development

#### 1. Cài đặt dependencies
```bash
cd backend
npm install
```

#### 2. Cấu hình môi trường
File `backend/.env` đã được cấu hình sẵn:
```env
PORT=3001
JWT_SECRET=your-super-secret-jwt-key-here
NODE_ENV=development
```

#### 3. Khởi chạy
```bash
# Chạy file start.bat (Windows)
# Hoặc:
cd backend && npm start
# Mở http://localhost:3000
```

#### 4. Truy cập
- **Frontend:** `http://localhost:3000`
- **Backend API:** `http://localhost:3001`

## Cách sử dụng

### Đăng ký tài khoản mới
1. Nhấn nút "Đăng Ký" trên giao diện chính
2. Điền đầy đủ thông tin: tên đăng nhập, email, mật khẩu
3. Nhấn "Đăng Ký" để tạo tài khoản

### Đăng nhập
1. Nhấn nút "Đăng Nhập"
2. Nhập tên đăng nhập và mật khẩu
3. Nhấn "Đăng Nhập" để truy cập

### Tạo cuộc hội thoại mới
1. Nhấn nút "Tạo Chat Mới" ở góc phải
2. Tìm kiếm người dùng theo tên đăng nhập
3. Nhấn vào tên người dùng để bắt đầu chat

### Gửi tin nhắn
1. Chọn cuộc hội thoại từ danh sách bên trái
2. Nhập tin nhắn vào ô chat
3. Nhấn Enter hoặc nút gửi

### Gửi file/ảnh
1. Nhấn nút kẹp giấy (📎) bên cạnh ô chat
2. Chọn file ảnh hoặc tài liệu
3. File sẽ được upload và gửi tự động

## Cấu trúc Database

### Bảng `users`
- Lưu thông tin người dùng
- Các trường: id, username, email, password, avatar, created_at, updated_at

### Bảng `chats`
- Lưu thông tin cuộc hội thoại
- Các trường: id, name, type, created_by, created_at

### Bảng `chat_participants`
- Lưu thành viên tham gia cuộc hội thoại
- Các trường: id, chat_id, user_id, joined_at

### Bảng `messages`
- Lưu tin nhắn và file
- Các trường: id, chat_id, sender_id, content, message_type, file_path, file_name, file_size, created_at

### Bảng `user_sessions`
- Lưu phiên đăng nhập JWT
- Các trường: id, user_id, token, expires_at, created_at

## API Endpoints

### Authentication
- `POST /api/auth/register` - Đăng ký tài khoản
- `POST /api/auth/login` - Đăng nhập
- `POST /api/auth/logout` - Đăng xuất
- `GET /api/auth/me` - Lấy thông tin user hiện tại

### Chat
- `GET /api/chat/conversations` - Lấy danh sách cuộc hội thoại
- `POST /api/chat/conversation` - Tạo cuộc hội thoại mới
- `GET /api/chat/messages/:chatId` - Lấy tin nhắn của cuộc hội thoại
- `POST /api/chat/messages` - Gửi tin nhắn mới
- `GET /api/chat/users` - Tìm kiếm người dùng

## Bảo mật

- Mật khẩu được mã hóa bằng bcrypt
- Sử dụng JWT để xác thực API
- Phiên đăng nhập có thời hạn (24 giờ)
- Kiểm tra quyền truy cập cuộc hội thoại

## Phát triển thêm

Để phát triển thêm tính năng:

1. **Chat nhóm**: Thêm type='group' vào bảng chats
2. **Emoji và reactions**: Thêm bảng message_reactions
3. **Trạng thái online**: Thêm last_seen vào bảng users
4. **Thông báo**: Tích hợp push notifications
5. **Video call**: Tích hợp WebRTC

## Khắc phục sự cố

### Lỗi kết nối database
- Kiểm tra quyền truy cập thư mục dự án
- Đảm bảo không có database.sqlite đang được sử dụng

### Lỗi Socket.io connection
- Kiểm tra backend đang chạy trên port 3001
- Kiểm tra firewall không chặn kết nối

### Lỗi upload file
- Kiểm tra thư mục public/uploads có quyền ghi
- Đảm bảo dung lượng file không vượt quá 10MB

## 🚀 Deploy Guide - Chi tiết

### **Railway Deployment (Khuyến nghị)**

#### Bước 1: Chuẩn bị
```bash
# Đảm bảo tất cả file đã được commit lên Git
git add .
git commit -m "Complete chat application"
git push origin main
```

#### Bước 2: Deploy trên Railway
1. Truy cập [railway.app](https://railway.app) và đăng nhập
2. Tạo project mới: **"Deploy from GitHub"**
3. Kết nối GitHub repository của bạn
4. Railway sẽ tự động:
   - Detect đây là Node.js app
   - Cài đặt dependencies
   - Build và deploy
   - Cung cấp database PostgreSQL (hoặc dùng SQLite)

#### Bước 3: Cấu hình môi trường
Railway sẽ tự động tạo:
- `NODE_ENV=production`
- `JWT_SECRET` (random)
- `PORT` (auto-assigned)
- `DATABASE_URL` (nếu dùng PostgreSQL)

#### Bước 4: Truy cập ứng dụng
- Railway cung cấp domain: `https://your-app.railway.app`
- Frontend và backend cùng domain
- Socket.io hoạt động tự động

### **Các vấn đề thường gặp**

**1. Socket.io không kết nối:**
```javascript
// Đã cấu hình CORS trong server.js
const io = socketIo(server, {
  cors: {
    origin: process.env.NODE_ENV === 'production' ? false : "http://localhost:3000",
    methods: ["GET", "POST"],
    credentials: true
  }
});
```

**2. File upload không hoạt động:**
- Đảm bảo thư mục `public/uploads` có quyền ghi
- Kiểm tra dung lượng file (giới hạn 10MB)

**3. Database connection:**
- Railway cung cấp PostgreSQL miễn phí
- Có thể dùng SQLite trong development

### **Monitoring và Logs**
- Railway Dashboard: Xem logs real-time
- Error tracking: Check Railway logs
- Performance: Monitor resource usage

## 📱 Mobile Access

Sau khi deploy, truy cập từ điện thoại:
```
https://your-app.railway.app
```

## 🔧 Development vs Production

| Aspect | Development | Production |
|--------|-------------|------------|
| Database | SQLite | PostgreSQL (Railway) |
| File Storage | Local | Cloud Storage |
| Environment | localhost | Railway domain |
| SSL | HTTP | HTTPS |

## 📞 Support

Nếu gặp vấn đề khi deploy:
1. Kiểm tra logs trên Railway Dashboard
2. Đảm bảo tất cả dependencies đã cài đặt
3. Kiểm tra biến môi trường

## License

Dự án này được phát triển cho mục đích học tập và nội bộ.