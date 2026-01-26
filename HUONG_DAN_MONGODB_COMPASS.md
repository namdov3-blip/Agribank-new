# 🗄️ HƯỚNG DẪN MONGODB ATLAS VÀ COMPASS - CHI TIẾT TỪNG BƯỚC

Hướng dẫn này sẽ giúp bạn từng bước tạo MongoDB Atlas, lấy connection string, và kết nối với MongoDB Compass.

---

## 📋 MỤC LỤC

1. [Tạo tài khoản MongoDB Atlas](#1-tạo-tài-khoản-mongodb-atlas)
2. [Tạo Cluster](#2-tạo-cluster)
3. [Tạo Database User](#3-tạo-database-user)
4. [Cấu hình Network Access](#4-cấu-hình-network-access)
5. [Lấy Connection String](#5-lấy-connection-string)
6. [Cài đặt MongoDB Compass](#6-cài-đặt-mongodb-compass)
7. [Kết nối Compass với Atlas](#7-kết-nối-compass-với-atlas)
8. [Tạo Database](#8-tạo-database)

---

## 1. TẠO TÀI KHOẢN MONGODB ATLAS

### Bước 1.1: Truy cập trang đăng ký

1. Mở trình duyệt (Chrome, Edge, Firefox...)
2. Truy cập: **https://www.mongodb.com/cloud/atlas/register**
3. Hoặc: **https://www.mongodb.com/cloud/atlas** → Click **"Try Free"**

### Bước 1.2: Đăng ký

**Tùy chọn A: Đăng ký bằng Google/GitHub (Nhanh nhất)**
1. Click **"Continue with Google"** hoặc **"Continue with GitHub"**
2. Đăng nhập bằng tài khoản của bạn
3. Cho phép MongoDB Atlas truy cập
4. Hoàn tất

**Tùy chọn B: Đăng ký bằng Email**
1. Điền **First Name**: Tên của bạn
2. Điền **Last Name**: Họ của bạn
3. Điền **Email**: Email của bạn (ví dụ: yourname@gmail.com)
4. Điền **Password**: Mật khẩu (tối thiểu 8 ký tự, có chữ hoa, chữ thường, số)
5. Tick vào **"I agree to the Terms of Service and Privacy Policy"**
6. Click **"Create your Atlas account"**

### Bước 1.3: Xác thực email (Nếu dùng Email)

1. Kiểm tra hộp thư email
2. Tìm email từ MongoDB Atlas
3. Click vào link xác thực
4. Bạn sẽ được chuyển đến trang MongoDB Atlas

---

## 2. TẠO CLUSTER

### Bước 2.1: Chọn loại Cluster

Sau khi đăng nhập, bạn sẽ thấy màn hình **"Deploy a cloud database"**:

1. **Chọn loại deployment**:
   - Click vào **"M0 FREE"** (Miễn phí - đủ cho development và production nhỏ)
   - Không cần thẻ tín dụng

2. **Chọn Cloud Provider và Region**:
   - **Cloud Provider**: Chọn **AWS** (Amazon Web Services)
   - **Region**: Chọn region gần bạn nhất
     - **Việt Nam**: Chọn **Asia Pacific (ap-southeast-1) - Singapore**
     - Hoặc **Asia Pacific (ap-northeast-1) - Tokyo**
   - **Lưu ý**: Region gần hơn = tốc độ nhanh hơn

3. **Cluster Name** (Tên cluster):
   - Để mặc định: `Cluster0`
   - Hoặc đổi tên nếu muốn (ví dụ: `MyProjectCluster`)
   - Tên này chỉ để bạn nhận biết, không ảnh hưởng đến kết nối

### Bước 2.2: Tạo Cluster

1. Click nút **"Create Deployment"** (màu xanh lá, góc dưới bên phải)
2. Hệ thống sẽ bắt đầu tạo cluster
3. **Đợi 3-5 phút** để cluster được tạo
4. Bạn sẽ thấy màn hình **"Get started with Atlas"** với các bước tiếp theo

---

## 3. TẠO DATABASE USER

### Bước 3.1: Tạo Username và Password

Trong màn hình **"Get started with Atlas"**, bạn sẽ thấy bước **"Create a Database User"**:

1. **Authentication Method**: 
   - Chọn **"Password"** (mặc định)

2. **Username** (Tên đăng nhập):
   - Điền username bạn muốn
   - Ví dụ: `admin`, `myuser`, `developer`
   - **Lưu ý**: Ghi nhớ username này, bạn sẽ cần nó cho connection string
   - **Ví dụ**: `admin`

3. **Password** (Mật khẩu):
   - **Cách 1**: Click nút **"Autogenerate Secure Password"** (khuyến nghị)
     - Hệ thống sẽ tạo password mạnh tự động
     - **QUAN TRỌNG**: Sao chép password ngay lập tức (bạn sẽ không thấy lại)
     - Click nút **"Copy"** để sao chép
   - **Cách 2**: Tự tạo password
     - Tối thiểu 8 ký tự
     - Có chữ hoa, chữ thường, số
     - Ví dụ: `MySecurePass123!`
   - **Lưu ý**: Lưu password vào file text hoặc password manager

4. **Database User Privileges**: 
   - Chọn **"Atlas admin"** (mặc định - đủ quyền cho development và production)
   - Hoặc chọn **"Read and write to any database"** nếu muốn

5. Click nút **"Create Database User"**

### Bước 3.2: Lưu thông tin đăng nhập

**QUAN TRỌNG**: Ghi lại thông tin này vào file text hoặc Notepad:

```
MongoDB Atlas Login Info:
========================
Username: [username bạn vừa tạo]
Password: [password bạn vừa tạo]
```

**Ví dụ**:
```
MongoDB Atlas Login Info:
========================
Username: admin
Password: MySecurePass123!
```

---

## 4. CẤU HÌNH NETWORK ACCESS

### Bước 4.1: Cho phép IP truy cập

Trong màn hình **"Get started with Atlas"**, bạn sẽ thấy bước **"Where would you like to connect from?"**:

1. **Connection Location**: 
   - Chọn **"My Local Environment"** (cho development local)
   - **HOẶC** chọn **"Cloud Environment"** nếu deploy lên cloud

2. **IP Address**:
   - **Tùy chọn 1**: Click nút **"Add My Current IP Address"**
     - Hệ thống sẽ tự động thêm IP hiện tại của bạn
     - An toàn hơn, nhưng khi đổi mạng cần thêm IP mới
   - **Tùy chọn 2**: Click **"Allow Access from Anywhere"**
     - Thêm IP: `0.0.0.0/0`
     - Cho phép kết nối từ mọi nơi
     - **Lưu ý**: Dùng cho development hoặc production (nếu cần)
     - **Khuyến nghị cho production**: Chỉ cho phép IP của Vercel

3. Click nút **"Add IP Address"** hoặc **"Finish and Close"**

### Bước 4.2: Xác nhận Network Access

1. Bạn sẽ thấy thông báo **"IP Access List entry added"**
2. Click nút **"Finish and Close"** để hoàn tất

### Bước 4.3: Thêm IP mới sau này (Nếu cần)

Nếu bạn đổi mạng (ví dụ: từ nhà sang quán cà phê), bạn cần thêm IP mới:

1. Vào **MongoDB Atlas Dashboard**
2. Click **"Network Access"** (menu bên trái)
3. Click nút **"Add IP Address"**
4. Chọn:
   - **"Add Current IP Address"** (thêm IP hiện tại)
   - **"Allow Access from Anywhere"** (0.0.0.0/0) - cho phép mọi nơi
5. Click **"Confirm"**

---

## 5. LẤY CONNECTION STRING

### Bước 5.1: Vào trang Connect

1. Sau khi hoàn tất các bước trên, bạn sẽ thấy màn hình **"Deployments"**
2. Tìm cluster của bạn (ví dụ: `Cluster0`)
3. Click nút **"Connect"** (màu xanh lá) trên cluster

### Bước 5.2: Chọn cách kết nối

Bạn sẽ thấy các tùy chọn:
- **Connect your application** (cho code - backend)
- **Connect using MongoDB Compass** (cho MongoDB Compass)
- **Connect using VS Code** (cho VS Code)

### Bước 5.3: Lấy Connection String cho Application (Backend)

1. Click vào **"Connect your application"**

2. **Driver**: Chọn **Node.js** (mặc định)

3. **Version**: Chọn **5.5 or later** (mặc định)

4. Bạn sẽ thấy connection string có dạng:
   ```
   mongodb+srv://<username>:<password>@cluster0.xxxxx.mongodb.net/?retryWrites=true&w=majority
   ```

5. **QUAN TRỌNG - Chỉnh sửa connection string**:
   - Thay `<username>` bằng username bạn đã tạo ở bước 3.1
   - Thay `<password>` bằng password bạn đã tạo ở bước 3.1
   - **Ví dụ**:
     ```
     mongodb+srv://admin:MySecurePass123!@cluster0.xxxxx.mongodb.net/?retryWrites=true&w=majority
     ```

6. **Thêm tên database vào connection string**:
   - Thêm tên database vào sau `.net/` và trước `?`
   - Ví dụ tên database: `quanlygiaodich`
   - Connection string cuối cùng:
     ```
     mongodb+srv://admin:MySecurePass123!@cluster0.xxxxx.mongodb.net/quanlygiaodich?retryWrites=true&w=majority
     ```
   - **Lưu ý**: Database sẽ được tạo tự động khi backend chạy lần đầu

7. Click nút **"Copy"** (icon copy) để sao chép connection string

8. **Lưu connection string này** vào file text - bạn sẽ cần nó cho:
   - File `.env.local` (local development)
   - Environment Variables trong Vercel (production)

### Bước 5.4: Lấy Connection String cho MongoDB Compass

1. Quay lại trang Connect (click **"Connect"** lại trên cluster)

2. Click vào **"Connect using MongoDB Compass"**

3. Bạn sẽ thấy connection string tương tự

4. **Chỉnh sửa connection string**:
   - Thay `<username>` và `<password>` bằng thông tin thực tế
   - Thêm tên database (ví dụ: `quanlygiaodich`)

5. Click **"Copy"** để sao chép

6. **Lưu connection string này** - bạn sẽ dùng nó cho MongoDB Compass

---

## 6. CÀI ĐẶT MONGODB COMPASS

### Bước 6.1: Tải MongoDB Compass

1. Truy cập: **https://www.mongodb.com/try/download/compass**

2. Bạn sẽ thấy trang download MongoDB Compass

3. **Version**: Chọn phiên bản mới nhất (ví dụ: 1.42.x)

4. **Platform**: Chọn **Windows** (nếu bạn dùng Windows)

5. Click nút **"Download"** (màu xanh lá)

6. File sẽ được tải về (dạng `.msi`, khoảng 100-200MB)

### Bước 6.2: Cài đặt MongoDB Compass

1. **Mở file `.msi`** vừa tải về

2. **Windows Security** có thể hiện cảnh báo:
   - Click **"More info"** → **"Run anyway"** (nếu cần)

3. **Setup Wizard**:
   - Click **"Next"**
   - Chọn **"Complete"** installation (khuyến nghị)
   - Click **"Next"**
   - Click **"Install"**
   - Đợi quá trình cài đặt (2-3 phút)
   - Click **"Finish"**

### Bước 6.3: Mở MongoDB Compass

1. Tìm **MongoDB Compass** trong Start Menu
2. Click để mở ứng dụng
3. Lần đầu mở có thể mất vài giây để khởi động

---

## 7. KẾT NỐI COMPASS VỚI ATLAS

### Bước 7.1: Nhập Connection String

1. Khi mở MongoDB Compass, bạn sẽ thấy màn hình **"New Connection"**

2. Trong ô **"Connection String"**, dán connection string bạn đã copy ở bước 5.4

3. **QUAN TRỌNG**: 
   - Đảm bảo đã thay `<username>` và `<password>` bằng thông tin thực tế
   - Đảm bảo đã thêm tên database vào connection string
   - **Ví dụ hoàn chỉnh**:
     ```
     mongodb+srv://admin:MySecurePass123!@cluster0.xxxxx.mongodb.net/quanlygiaodich?retryWrites=true&w=majority
     ```

### Bước 7.2: Kết nối

1. Click nút **"Connect"** (màu xanh lá, góc dưới bên phải)

2. **Nếu kết nối thành công**:
   - Bạn sẽ thấy màn hình hiển thị các databases
   - Database `quanlygiaodich` sẽ được tạo tự động nếu chưa tồn tại
   - Bạn có thể thấy database trong danh sách

3. **Nếu có lỗi**, xem phần "Xử lý lỗi" bên dưới

### Bước 7.3: Lưu Connection (Tùy chọn)

1. Sau khi kết nối thành công, bạn có thể lưu connection để dùng lại:
   - Click nút **"Save"** (góc trên bên phải)
   - Đặt tên connection (ví dụ: "My Atlas Cluster")
   - Click **"Save"**

2. Lần sau, bạn chỉ cần chọn connection đã lưu từ danh sách

---

## 8. TẠO DATABASE

### Bước 8.1: Tạo Database (Nếu chưa có)

1. Trong MongoDB Compass, bạn sẽ thấy danh sách databases

2. **Nếu database `quanlygiaodich` chưa có**:
   - Click nút **"Create Database"** (màu xanh lá, góc trên bên phải)
   - **Database Name**: `quanlygiaodich`
   - **Collection Name**: `users` (tên collection đầu tiên - có thể đổi sau)
   - Click **"Create Database"**

3. **Nếu database đã có** (tự động tạo khi backend chạy):
   - Bạn sẽ thấy database trong danh sách
   - Click vào database để xem các collections

### Bước 8.2: Xem Collections

Dự án này sử dụng các collections sau (sẽ được tạo tự động khi backend chạy):
- `users` - Quản lý người dùng
- `projects` - Quản lý dự án
- `transactions` - Quản lý giao dịch
- `banktransactions` - Giao dịch ngân hàng
- `auditlogs` - Nhật ký audit
- `settings` - Cài đặt hệ thống

**Lưu ý**: 
- Bạn **KHÔNG CẦN** tạo collections trước
- Khi backend chạy và có dữ liệu, collections sẽ được tạo tự động
- Nhưng nếu muốn xem cấu trúc trước, bạn có thể tạo các collections rỗng

### Bước 8.3: Xem Dữ liệu

1. **Sau khi backend chạy và có request đầu tiên** (ví dụ: đăng nhập):
   - Refresh database trong Compass (click vào database)
   - Bạn sẽ thấy các collections được tạo tự động

2. **Click vào collection** để xem dữ liệu:
   - Ví dụ: Click vào `users` để xem user admin
   - Ví dụ: Click vào `auditlogs` để xem log đăng nhập

---

## ❌ XỬ LÝ LỖI

### Lỗi "Authentication failed"

**Nguyên nhân**: Username hoặc password sai trong connection string

**Giải pháp**:
1. Kiểm tra lại username và password trong connection string
2. Đảm bảo không có khoảng trắng thừa
3. Đảm bảo password có đúng ký tự đặc biệt (nếu có)

### Lỗi "Connection timeout"

**Nguyên nhân**: IP của bạn chưa được whitelist trong Network Access

**Giải pháp**:
1. Vào MongoDB Atlas → Network Access
2. Thêm IP hiện tại của bạn
3. Hoặc chọn "Allow Access from Anywhere" (0.0.0.0/0)
4. Đợi 1-2 phút để cập nhật
5. Thử kết nối lại

### Lỗi "Invalid connection string"

**Nguyên nhân**: Connection string không đúng format

**Giải pháp**:
1. Kiểm tra connection string có đúng format không
2. Đảm bảo đã thay `<username>` và `<password>`
3. Đảm bảo không có ký tự đặc biệt cần encode (ví dụ: `@` trong password)
4. Thử copy lại connection string từ MongoDB Atlas

### Lỗi "SSL/TLS connection failed"

**Nguyên nhân**: Vấn đề với SSL certificate

**Giải pháp**:
1. Đảm bảo connection string bắt đầu bằng `mongodb+srv://`
2. Kiểm tra kết nối internet
3. Thử kết nối lại sau vài phút

---

## ✅ CHECKLIST HOÀN THÀNH

- [ ] Đã tạo tài khoản MongoDB Atlas
- [ ] Đã tạo cluster (M0 FREE)
- [ ] Đã tạo database user (username và password)
- [ ] Đã cấu hình Network Access (cho phép IP)
- [ ] Đã lấy connection string cho application
- [ ] Đã lấy connection string cho MongoDB Compass
- [ ] Đã cài đặt MongoDB Compass
- [ ] Đã kết nối MongoDB Compass với Atlas thành công
- [ ] Đã tạo database `quanlygiaodich` (hoặc tên khác)
- [ ] Có thể xem database và collections trong Compass

---

## 💡 MẸO HỮU ÍCH

1. **Lưu thông tin đăng nhập**: 
   - Lưu username, password, và connection string vào file text an toàn
   - Hoặc dùng password manager

2. **Test connection trước khi dùng**:
   - Luôn test kết nối bằng MongoDB Compass trước khi dùng trong code
   - Đảm bảo connection string đúng

3. **Network Access**:
   - Cho development: Có thể dùng "Allow from anywhere" (0.0.0.0/0)
   - Cho production: Nên chỉ cho phép IP cụ thể (ví dụ: IP của Vercel)

4. **Backup connection string**:
   - Lưu connection string vào nhiều nơi (file text, password manager, notes)

---

Chúc bạn thành công! 🎉
