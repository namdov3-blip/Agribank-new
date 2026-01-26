# ⚡ TÓM TẮT NHANH - DEPLOY BACKEND LOCAL

## 🎯 Mục tiêu: Deploy Backend Local và kết nối MongoDB Compass

---

## 📝 CÁC BƯỚC CHÍNH (5 phút đọc)

### 1️⃣ TẠO MONGODB ATLAS (10-15 phút)
📖 **Xem chi tiết**: `HUONG_DAN_MONGODB_ATLAS.md`

1. Đăng ký tại: https://www.mongodb.com/cloud/atlas/register
2. Tạo cluster M0 FREE
3. Tạo database user (username + password)
4. Cấu hình Network Access (cho phép IP hoặc "Allow from anywhere")
5. Lấy connection string

**Connection string mẫu**:
```
mongodb+srv://username:password@cluster0.xxxxx.mongodb.net/quanlygiaodich?retryWrites=true&w=majority
```

### 2️⃣ CÀI MONGODB COMPASS (5 phút)
📖 **Xem chi tiết**: `HUONG_DAN_MONGODB_ATLAS.md` (phần 6-7)

1. Tải tại: https://www.mongodb.com/try/download/compass
2. Cài đặt
3. Kết nối với connection string từ Atlas
4. Tạo database `quanlygiaodich` (nếu chưa có)

### 3️⃣ CÀI ĐẶT NODE.JS (5 phút)
1. Tải Node.js 22.x: https://nodejs.org/
2. Cài đặt
3. Kiểm tra: `node --version` (phải là v22.x.x)

### 4️⃣ CẤU HÌNH DỰ ÁN (5 phút)
```bash
# 1. Di chuyển đến thư mục dự án
cd D:\Final-bql-main

# 2. Cài đặt dependencies
npm install

# 3. Tạo file .env.local
# (Xem nội dung bên dưới)
```

**Nội dung file `.env.local`**:
```env
MONGODB_URI=mongodb+srv://username:password@cluster0.xxxxx.mongodb.net/quanlygiaodich?retryWrites=true&w=majority
JWT_SECRET=my-secret-key-12345
FRONTEND_URL=http://localhost:3000
```

### 5️⃣ CHẠY BACKEND (1 phút)
```bash
npm run dev:server
```

**Kết quả mong đợi**:
```
====================================
🚀 API Server running on http://localhost:3001
====================================
```

---

## ✅ KIỂM TRA

### Backend đang chạy?
- Truy cập: http://localhost:3001
- Nếu thấy lỗi "Cannot GET /" → **BÌNH THƯỜNG** ✅

### MongoDB đã kết nối?
- Xem console của backend server
- Không có lỗi MongoDB → **THÀNH CÔNG** ✅

### Database trong Compass?
- Mở MongoDB Compass
- Refresh database `quanlygiaodich`
- Sau khi có request đầu tiên, collections sẽ tự động tạo ✅

---

## 🧪 TEST API

📖 **Xem chi tiết**: `HUONG_DAN_TEST_BACKEND.md`

### Test đăng nhập (Postman hoặc curl):

**Postman**:
- Method: `POST`
- URL: `http://localhost:3001/api/auth/login`
- Body (JSON):
  ```json
  {
    "name": "Quản trị viên",
    "password": "admin"
  }
  ```

**curl**:
```bash
curl -X POST http://localhost:3001/api/auth/login -H "Content-Type: application/json" -d "{\"name\":\"Quản trị viên\",\"password\":\"admin\"}"
```

**Kết quả**: Nhận được token → **THÀNH CÔNG** ✅

---

## 📚 TÀI LIỆU CHI TIẾT

1. **HUONG_DAN_MONGODB_ATLAS.md** - Hướng dẫn chi tiết MongoDB Atlas + Compass
2. **HUONG_DAN_TEST_BACKEND.md** - Hướng dẫn test API
3. **HUONG_DAN_DEPLOY_LOCAL.md** - Hướng dẫn deploy full (FE + BE)

---

## 🆘 XỬ LÝ LỖI NHANH

| Lỗi | Giải pháp |
|-----|----------|
| "MONGODB_URI is not defined" | Kiểm tra file `.env.local` đã tạo chưa |
| "ECONNREFUSED" | Kiểm tra Network Access trong Atlas |
| "Port 3001 already in use" | Đóng ứng dụng đang dùng port 3001 |
| "Authentication failed" | Kiểm tra username/password trong connection string |

---

## 🎯 CHECKLIST

- [ ] Đã tạo MongoDB Atlas account
- [ ] Đã tạo cluster và database user
- [ ] Đã lấy connection string
- [ ] Đã cài MongoDB Compass và kết nối thành công
- [ ] Đã cài Node.js 22.x
- [ ] Đã chạy `npm install`
- [ ] Đã tạo file `.env.local`
- [ ] Backend đang chạy trên port 3001
- [ ] Có thể test API đăng nhập thành công
- [ ] Có thể xem database trong MongoDB Compass

---

**Chúc bạn thành công!** 🎉
