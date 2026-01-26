# 🚀 HƯỚNG DẪN DEPLOY - TỔNG HỢP

Chào mừng bạn đến với hệ thống Quản Lý Giao Dịch! Đây là hướng dẫn tổng hợp để deploy ứng dụng local và lên Vercel.

---

## 📚 CÁC FILE HƯỚNG DẪN

### 1. **HUONG_DAN_DEPLOY_CHI_TIET.md** ⭐ (FILE CHÍNH)
   - Hướng dẫn đầy đủ từ A-Z
   - Phần 1: Deploy Local (test trước)
   - Phần 2: Deploy lên Vercel (production)
   - **BẮT ĐẦU TỪ FILE NÀY!**

### 2. **HUONG_DAN_MONGODB_COMPASS.md**
   - Hướng dẫn chi tiết về MongoDB Atlas
   - Từng bước tạo account, cluster, database
   - Cài đặt và kết nối MongoDB Compass
   - **Đọc file này nếu bạn chưa biết về MongoDB Atlas**

### 3. **TOM_TAT_NHANH.md**
   - Tóm tắt nhanh các bước chính
   - Checklist hoàn thành
   - Tham khảo nhanh

---

## 🎯 BẮT ĐẦU NHƯ THẾ NÀO?

### Nếu bạn là người mới (Newbie):

1. **Bước 1**: Đọc **HUONG_DAN_MONGODB_COMPASS.md**
   - Tạo tài khoản MongoDB Atlas
   - Lấy connection string
   - Cài MongoDB Compass

2. **Bước 2**: Đọc **HUONG_DAN_DEPLOY_CHI_TIET.md** - Phần 1 (Local)
   - Cài đặt Node.js
   - Cấu hình dự án
   - Chạy backend và frontend local
   - Test ứng dụng

3. **Bước 3**: Đọc **HUONG_DAN_DEPLOY_CHI_TIET.md** - Phần 2 (Vercel)
   - Deploy lên Vercel
   - Cấu hình production

### Nếu bạn đã có kinh nghiệm:

- Đọc **TOM_TAT_NHANH.md** để xem tóm tắt
- Làm theo checklist trong **HUONG_DAN_DEPLOY_CHI_TIET.md**

---

## ⚡ QUY TRÌNH NHANH (5 PHÚT ĐỌC)

### LOCAL DEVELOPMENT:

```bash
# 1. Cài đặt dependencies
npm install

# 2. Tạo file .env.local với MongoDB connection string
# (Xem HUONG_DAN_MONGODB_COMPASS.md để lấy connection string)

# 3. Chạy backend
npm run dev:server

# 4. Chạy frontend (cửa sổ mới)
npm run dev:frontend

# Hoặc chạy cả 2 cùng lúc
npm run dev
```

### PRODUCTION (Vercel):

1. Tạo tài khoản Vercel
2. Import project từ GitHub
3. Cấu hình Environment Variables
4. Deploy

---

## 📋 CHECKLIST TỔNG QUÁT

### Chuẩn bị:
- [ ] Đã cài Node.js 22.x
- [ ] Đã có MongoDB Atlas account
- [ ] Đã cài MongoDB Compass
- [ ] Đã lấy MongoDB connection string

### Local:
- [ ] Đã chạy `npm install`
- [ ] Đã tạo file `.env.local`
- [ ] Backend chạy thành công (port 3001)
- [ ] Frontend chạy thành công (port 3000)
- [ ] Có thể đăng nhập và sử dụng

### Production:
- [ ] Đã tạo tài khoản Vercel
- [ ] Đã push code lên GitHub (nếu dùng)
- [ ] Đã cấu hình Environment Variables
- [ ] Đã deploy thành công
- [ ] Ứng dụng hoạt động trên Vercel

---

## 🔐 THÔNG TIN ĐĂNG NHẬP MẶC ĐỊNH

Khi lần đầu chạy ứng dụng (local hoặc production):
- **Username**: `Quản trị viên`
- **Password**: `admin`

**LƯU Ý**: Đổi mật khẩu ngay sau khi đăng nhập!

---

## 🆘 CẦN HỖ TRỢ?

1. **Đọc lại các file hướng dẫn**:
   - `HUONG_DAN_DEPLOY_CHI_TIET.md` - Hướng dẫn chi tiết
   - `HUONG_DAN_MONGODB_COMPASS.md` - Hướng dẫn MongoDB

2. **Kiểm tra phần "Xử lý lỗi"** trong các file hướng dẫn

3. **Kiểm tra checklist** xem đã hoàn thành các bước chưa

---

## 📁 CẤU TRÚC DỰ ÁN

```
Final-bql-main/
├── api/                    # Vercel serverless functions
├── backend/               # Backend handlers (logic xử lý)
├── components/            # React components
├── pages/                 # React pages
├── lib/                   # Shared libraries (MongoDB, Auth)
├── services/              # API service layer
├── server.ts              # Express server (local development)
├── vite.config.ts         # Vite config (frontend)
├── vercel.json            # Vercel configuration
├── package.json           # Dependencies
└── .env.local             # Environment variables (BẠN CẦN TẠO)
```

---

## 🎓 TÀI LIỆU THAM KHẢO

- **MongoDB Atlas**: https://www.mongodb.com/cloud/atlas
- **MongoDB Compass**: https://www.mongodb.com/try/download/compass
- **Vercel**: https://vercel.com
- **Node.js**: https://nodejs.org

---

Chúc bạn deploy thành công! 🎉
