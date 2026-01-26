# 🔧 HƯỚNG DẪN KHẮC PHỤC LỖI "BAD AUTH: AUTHENTICATION FAILED" TRONG MONGODB COMPASS

## 🔍 NGUYÊN NHÂN CÓ THỂ

1. **Password có ký tự đặc biệt** (`@` trong password của bạn)
2. **Username hoặc password sai**
3. **Database user chưa được tạo đúng trong MongoDB Atlas**
4. **Network Access chưa được cấu hình**
5. **Connection string không đúng format cho Compass**

---

## ✅ GIẢI PHÁP 1: SỬ DỤNG CONNECTION STRING ĐÚNG CHO COMPASS

### Bước 1: Lấy Connection String từ MongoDB Atlas

1. **Đăng nhập MongoDB Atlas**: https://cloud.mongodb.com
2. **Vào cluster của bạn** (Agribank)
3. **Click nút "Connect"**
4. **Chọn "Connect using MongoDB Compass"**
5. **Sao chép connection string**

### Bước 2: Chỉnh sửa Connection String

**Connection string gốc từ Atlas**:
```
mongodb+srv://infonamhaido_db_user:<password>@agribank.uszezvu.mongodb.net/?appName=Agribank
```

**Bạn cần thay `<password>` bằng password thực tế**:
- Password của bạn: `Garena0202155@`
- **QUAN TRỌNG**: Trong MongoDB Compass, bạn có thể dùng password trực tiếp (không cần encode `%40`)

**Connection string cho Compass**:
```
mongodb+srv://infonamhaido_db_user:Garena0202155@agribank.uszezvu.mongodb.net/quanlygiaodich?appName=Agribank
```

**Lưu ý**:
- Dùng `@` trực tiếp trong password (không dùng `%40`)
- Thêm tên database `/quanlygiaodich` sau `.net/`
- Giữ nguyên `?appName=Agribank`

### Bước 3: Kết nối trong Compass

1. **Mở MongoDB Compass**
2. **Dán connection string** vào ô "Connection String"
3. **Click "Connect"**

---

## ✅ GIẢI PHÁP 2: SỬ DỤNG CONNECTION FORM (KHÔYẾN NGHỊ)

Nếu connection string không hoạt động, dùng form điền thủ công:

### Bước 1: Mở Connection Form

1. **Mở MongoDB Compass**
2. **Click "Fill in connection fields individually"** (hoặc icon bên cạnh connection string)

### Bước 2: Điền thông tin

**Connection Name** (tùy chọn):
```
Agribank Cluster
```

**Hostname**:
```
agribank.uszezvu.mongodb.net
```

**Authentication**:
- ✅ Tick vào **"Authentication"**
- **Authentication Method**: `Username / Password`
- **Username**: `infonamhaido_db_user`
- **Password**: `Garena0202155@` (điền trực tiếp, không encode)

**Additional Connection Options** (tùy chọn):
- Click "More Options"
- **Replica Set Name**: Để trống
- **Read Preference**: `primary`
- **Authentication Database**: `admin` (hoặc để trống)

### Bước 3: Kết nối

1. **Click "Connect"**
2. Nếu thành công, bạn sẽ thấy danh sách databases

---

## ✅ GIẢI PHÁP 3: KIỂM TRA MONGODB ATLAS

### Bước 1: Kiểm tra Database User

1. **Đăng nhập MongoDB Atlas**: https://cloud.mongodb.com
2. **Vào "Database Access"** (menu bên trái)
3. **Tìm user**: `infonamhaido_db_user`
4. **Kiểm tra**:
   - User có tồn tại không?
   - Password có đúng không?
   - User có quyền "Atlas admin" hoặc "Read and write to any database" không?

### Bước 2: Reset Password (Nếu cần)

Nếu không chắc password, reset lại:

1. **Vào "Database Access"**
2. **Click vào user** `infonamhaido_db_user`
3. **Click "Edit"**
4. **Click "Edit Password"**
5. **Tạo password mới** (không có ký tự đặc biệt để dễ kết nối):
   - Ví dụ: `Garena0202155` (bỏ dấu @)
6. **Lưu password mới**
7. **Cập nhật lại file `.env.local`** với password mới

### Bước 3: Kiểm tra Network Access

1. **Vào "Network Access"** (menu bên trái)
2. **Kiểm tra IP whitelist**:
   - Phải có IP của bạn hoặc `0.0.0.0/0` (Allow from anywhere)
3. **Nếu chưa có**, thêm IP:
   - Click "Add IP Address"
   - Chọn "Allow Access from Anywhere" (0.0.0.0/0)
   - Click "Confirm"
   - **Đợi 1-2 phút** để cập nhật

---

## ✅ GIẢI PHÁP 4: ENCODE PASSWORD ĐÚNG CÁCH

Nếu password có ký tự đặc biệt, bạn cần encode đúng:

### Các ký tự đặc biệt cần encode:

| Ký tự | URL Encoded |
|-------|-------------|
| `@` | `%40` |
| `:` | `%3A` |
| `/` | `%2F` |
| `?` | `%3F` |
| `#` | `%23` |
| `[` | `%5B` |
| `]` | `%5D` |

### Connection string với password encoded:

**Password gốc**: `Garena0202155@`

**Connection string với encode**:
```
mongodb+srv://infonamhaido_db_user:Garena0202155%40@agribank.uszezvu.mongodb.net/quanlygiaodich?appName=Agribank
```

**Lưu ý**: 
- Trong **MongoDB Compass**, thử cả 2 cách:
  1. Dùng password trực tiếp: `Garena0202155@`
  2. Dùng password encoded: `Garena0202155%40`

---

## ✅ GIẢI PHÁP 5: TẠO USER MỚI (Nếu vẫn không được)

Nếu vẫn không kết nối được, tạo user mới với password đơn giản hơn:

### Bước 1: Tạo User mới trong Atlas

1. **Vào "Database Access"**
2. **Click "Add New Database User"**
3. **Authentication Method**: Password
4. **Username**: `admin` (hoặc tên khác)
5. **Password**: Tạo password đơn giản, không có ký tự đặc biệt
   - Ví dụ: `Admin123456`
6. **Database User Privileges**: Atlas admin
7. **Click "Add User"**

### Bước 2: Cập nhật Connection String

**Connection string mới**:
```
mongodb+srv://admin:Admin123456@agribank.uszezvu.mongodb.net/quanlygiaodich?appName=Agribank
```

### Bước 3: Cập nhật file `.env.local`

Cập nhật `MONGODB_URI` với thông tin user mới.

---

## 🔍 KIỂM TRA TỪNG BƯỚC

### Checklist:

- [ ] Username đúng: `infonamhaido_db_user`
- [ ] Password đúng: `Garena0202155@`
- [ ] Network Access đã cho phép IP của bạn (hoặc 0.0.0.0/0)
- [ ] Connection string đúng format
- [ ] Database user có quyền đủ (Atlas admin)
- [ ] Đã thử cả password trực tiếp và encoded

---

## 🧪 TEST KẾT NỐI

### Cách 1: Test bằng MongoDB Compass
1. Mở Compass
2. Dán connection string
3. Click Connect
4. Nếu thành công → Thấy danh sách databases

### Cách 2: Test bằng Backend
1. Chạy backend:
   ```bash
   npm run dev:server
   ```
2. Xem console:
   - Nếu không có lỗi MongoDB → Kết nối thành công
   - Nếu có lỗi "authentication failed" → Kiểm tra lại username/password

---

## 📝 CONNECTION STRING MẪU CHO COMPASS

### Mẫu 1: Password trực tiếp (Thử cách này trước)
```
mongodb+srv://infonamhaido_db_user:Garena0202155@agribank.uszezvu.mongodb.net/quanlygiaodich?appName=Agribank
```

### Mẫu 2: Password encoded
```
mongodb+srv://infonamhaido_db_user:Garena0202155%40@agribank.uszezvu.mongodb.net/quanlygiaodich?appName=Agribank
```

### Mẫu 3: Không có database (sẽ tạo tự động)
```
mongodb+srv://infonamhaido_db_user:Garena0202155@agribank.uszezvu.mongodb.net/?appName=Agribank
```

---

## 🆘 NẾU VẪN KHÔNG ĐƯỢC

1. **Kiểm tra lại trong MongoDB Atlas**:
   - Vào "Database Access" → Xem lại username và password
   - Reset password nếu cần

2. **Kiểm tra Network Access**:
   - Đảm bảo IP của bạn đã được whitelist
   - Hoặc chọn "Allow from anywhere" (0.0.0.0/0)

3. **Thử tạo user mới** với password đơn giản (không có ký tự đặc biệt)

4. **Liên hệ hỗ trợ MongoDB Atlas** nếu vẫn không được

---

Chúc bạn kết nối thành công! 🎉
