# 📚 HƯỚNG DẪN DEPLOY CHI TIẾT - LOCAL VÀ VERCEL

## 🎯 MỤC LỤC

### PHẦN 1: DEPLOY LOCAL (TEST TRƯỚC)
1. [Chuẩn bị môi trường](#1-chuẩn-bị-môi-trường)
2. [Cài đặt MongoDB Atlas và Compass](#2-cài-đặt-mongodb-atlas-và-compass)
3. [Cấu hình dự án](#3-cấu-hình-dự-án)
4. [Chạy Backend Local](#4-chạy-backend-local)
5. [Chạy Frontend Local](#5-chạy-frontend-local)
6. [Test ứng dụng](#6-test-ứng-dụng)

### PHẦN 2: DEPLOY LÊN VERCEL (PRODUCTION)
7. [Chuẩn bị deploy lên Vercel](#7-chuẩn-bị-deploy-lên-vercel)
8. [Tạo tài khoản Vercel](#8-tạo-tài-khoản-vercel)
9. [Cấu hình Environment Variables](#9-cấu-hình-environment-variables)
10. [Deploy lên Vercel](#10-deploy-lên-vercel)
11. [Kiểm tra sau khi deploy](#11-kiểm-tra-sau-khi-deploy)

---

# PHẦN 1: DEPLOY LOCAL (TEST TRƯỚC)

## 1. CHUẨN BỊ MÔI TRƯỜNG

### 1.1. Cài đặt Node.js

1. **Kiểm tra Node.js hiện tại**:
   ```bash
   node --version
   ```
   - **Yêu cầu**: Node.js phiên bản 22.x
   - Nếu chưa có hoặc phiên bản cũ, tiếp tục bước 2

2. **Tải Node.js 22.x**:
   - Truy cập: https://nodejs.org/
   - Tải phiên bản **22.x LTS** (Long Term Support)
   - Chọn bản cài đặt cho Windows (`.msi`)

3. **Cài đặt Node.js**:
   - Chạy file `.msi` vừa tải
   - Click **Next** trong các bước
   - Chọn **"Add to PATH"** (quan trọng!)
   - Hoàn tất cài đặt

4. **Xác nhận cài đặt**:
   - Mở Command Prompt hoặc PowerShell mới
   - Chạy lại:
     ```bash
     node --version
     ```
   - Kết quả phải là: `v22.x.x`

### 1.2. Cài đặt Git (nếu chưa có)

1. **Kiểm tra Git**:
   ```bash
   git --version
   ```

2. **Nếu chưa có, tải Git**:
   - Truy cập: https://git-scm.com/download/win
   - Tải và cài đặt Git for Windows

---

## 2. CÀI ĐẶT MONGODB ATLAS VÀ COMPASS

### 2.1. Tạo tài khoản MongoDB Atlas

1. **Truy cập trang đăng ký**:
   - Mở trình duyệt: https://www.mongodb.com/cloud/atlas/register
   - Hoặc: https://www.mongodb.com/cloud/atlas → Click **"Try Free"**

2. **Đăng ký tài khoản**:
   - **Cách 1**: Đăng ký bằng Google/GitHub (nhanh nhất)
   - **Cách 2**: Đăng ký bằng Email:
     - Điền First Name, Last Name
     - Điền Email
     - Điền Password (tối thiểu 8 ký tự)
     - Tick vào "I agree to Terms..."
     - Click **"Create your Atlas account"**

3. **Xác thực email** (nếu dùng Email):
   - Kiểm tra email
   - Click link xác thực

### 2.2. Tạo Cluster (Database Server)

1. **Chọn loại cluster**:
   - Trong màn hình "Deploy a cloud database":
   - Chọn **"M0 FREE"** (Miễn phí)
   - **Cloud Provider**: AWS
   - **Region**: Chọn gần bạn nhất (ví dụ: Singapore `ap-southeast-1`)
   - **Cluster Name**: Để mặc định `Cluster0` hoặc đổi tên

2. **Tạo cluster**:
   - Click **"Create Deployment"**
   - Đợi 3-5 phút để cluster được tạo

### 2.3. Tạo Database User

1. **Trong màn hình "Get started with Atlas"**:
   - **Authentication Method**: Password
   - **Username**: Nhập username (ví dụ: `admin`, `myuser`)
   - **Password**: 
     - Click **"Autogenerate Secure Password"** (khuyến nghị)
     - **HOẶC** tự tạo password mạnh
   - **QUAN TRỌNG**: Sao chép và lưu password ngay!
   - **Database User Privileges**: Atlas admin
   - Click **"Create Database User"**

2. **Lưu thông tin**:
   ```
   Username: [username bạn vừa tạo]
   Password: [password bạn vừa tạo]
   ```

### 2.4. Cấu hình Network Access

1. **Cho phép IP truy cập**:
   - Trong màn hình "Get started with Atlas":
   - **Connection Location**: "My Local Environment"
   - Click **"Add My Current IP Address"**
   - **HOẶC** Click **"Allow Access from Anywhere"** (0.0.0.0/0) - **CHỈ DÙNG CHO DEVELOPMENT**
   - Click **"Add IP Address"** hoặc **"Finish and Close"**

### 2.5. Lấy Connection String

1. **Vào trang Connect**:
   - Trong màn hình "Deployments", click nút **"Connect"** trên cluster

2. **Chọn "Connect your application"**:
   - **Driver**: Node.js
   - **Version**: 5.5 or later
   - Bạn sẽ thấy connection string:
     ```
     mongodb+srv://<username>:<password>@cluster0.xxxxx.mongodb.net/?retryWrites=true&w=majority
     ```

3. **Sao chép và chỉnh sửa connection string**:
   - Thay `<username>` bằng username bạn đã tạo
   - Thay `<password>` bằng password bạn đã tạo
   - Thêm tên database vào sau `.net/` và trước `?`
   - **Ví dụ hoàn chỉnh**:
     ```
     mongodb+srv://admin:MyPassword123!@cluster0.xxxxx.mongodb.net/quanlygiaodich?retryWrites=true&w=majority
     ```
   - **Lưu connection string này** - bạn sẽ cần nó cho file `.env.local`

### 2.6. Cài đặt MongoDB Compass

1. **Tải MongoDB Compass**:
   - Truy cập: https://www.mongodb.com/try/download/compass
   - Chọn **Windows** platform
   - Click **"Download"**

2. **Cài đặt**:
   - Chạy file `.msi` vừa tải
   - Click **Next** → **Complete** → **Install**
   - Hoàn tất cài đặt

3. **Kết nối với Atlas**:
   - Mở MongoDB Compass
   - Dán connection string (đã thay username/password)
   - Click **"Connect"**
   - Nếu thành công, bạn sẽ thấy database `quanlygiaodich` (sẽ được tạo tự động khi backend chạy)

---

## 3. CẤU HÌNH DỰ ÁN

### 3.1. Mở thư mục dự án

1. **Mở Command Prompt hoặc PowerShell**
2. **Di chuyển đến thư mục dự án**:
   ```bash
   cd D:\Final-bql-main
   ```

### 3.2. Cài đặt Dependencies

```bash
npm install
```

**Lưu ý**: 
- Quá trình này mất 2-5 phút
- Đợi đến khi thấy "added X packages" hoặc "up to date"
- Nếu có lỗi, thử chạy lại

### 3.3. Tạo file `.env.local`

1. **Tạo file**:
   - Trong thư mục `D:\Final-bql-main`
   - Tạo file mới tên `.env.local`
   - **Cách 1**: Dùng Notepad
     - Mở Notepad
     - Lưu file với tên `.env.local` (chọn "All Files" trong Save as type)
   - **Cách 2**: Dùng Command Prompt
     ```bash
     type nul > .env.local
     ```

2. **Thêm nội dung vào file `.env.local`**:
   ```env
   # MongoDB Connection String (thay bằng connection string của bạn)
   MONGODB_URI=mongodb+srv://admin:MyPassword123!@cluster0.xxxxx.mongodb.net/quanlygiaodich?retryWrites=true&w=majority

   # JWT Secret Key (tạo một chuỗi ngẫu nhiên bất kỳ)
   JWT_SECRET=my-super-secret-jwt-key-12345-abcdef

   # Frontend URL (để mặc định cho local)
   FRONTEND_URL=http://localhost:3000

   # Gemini API Key (tùy chọn - chỉ cần nếu có tính năng AI)
   GEMINI_API_KEY=
   ```

3. **QUAN TRỌNG**:
   - Thay `MONGODB_URI` bằng connection string bạn đã lấy ở bước 2.5
   - Thay `JWT_SECRET` bằng một chuỗi bí mật ngẫu nhiên (ví dụ: `my-secret-key-2024`)
   - Lưu file

---

## 4. CHẠY BACKEND LOCAL

### 4.1. Chạy Backend Server

Mở Command Prompt hoặc PowerShell và chạy:

```bash
cd D:\Final-bql-main
npm run dev:server
```

**Kết quả mong đợi**:
```
====================================
🚀 API Server running on http://localhost:3001
====================================
```

**Lưu ý**: 
- Giữ cửa sổ này mở
- Đây là server backend của bạn
- Nếu thấy lỗi, xem phần "Xử lý lỗi" bên dưới

### 4.2. Kiểm tra Backend đã chạy

1. **Mở trình duyệt**
2. **Truy cập**: http://localhost:3001
3. **Kết quả**: Có thể thấy lỗi "Cannot GET /" - **ĐÂY LÀ BÌNH THƯỜNG** (vì không có route cho `/`)

### 4.3. Kiểm tra kết nối MongoDB

- **Xem console của backend server**
- Nếu kết nối thành công, bạn sẽ **KHÔNG** thấy lỗi MongoDB
- Nếu có lỗi, bạn sẽ thấy thông báo lỗi chi tiết

---

## 5. CHẠY FRONTEND LOCAL

### 5.1. Chạy Frontend (Cửa sổ mới)

Mở một cửa sổ Command Prompt hoặc PowerShell mới và chạy:

```bash
cd D:\Final-bql-main
npm run dev:frontend
```

**Kết quả mong đợi**:
```
  VITE v6.x.x  ready in xxx ms

  ➜  Local:   http://localhost:3000/
  ➜  Network: use --host to expose
```

### 5.2. Hoặc chạy cả 2 cùng lúc

Thay vì mở 2 cửa sổ, bạn có thể chạy cả backend và frontend cùng lúc:

```bash
npm run dev
```

Lệnh này sẽ tự động chạy cả 2 trong cùng một cửa sổ.

---

## 6. TEST ỨNG DỤNG

### 6.1. Truy cập ứng dụng

1. **Mở trình duyệt**
2. **Truy cập**: http://localhost:3000
3. **Bạn sẽ thấy trang đăng nhập**

### 6.2. Đăng nhập

**Thông tin đăng nhập mặc định** (tự động tạo lần đầu):
- **Tên đăng nhập**: `Quản trị viên`
- **Mật khẩu**: `admin`

**Lưu ý**: 
- Lần đầu chạy, hệ thống sẽ tự động tạo user admin này
- Sau khi đăng nhập thành công, hãy đổi mật khẩu ngay!

### 6.3. Kiểm tra Database trong MongoDB Compass

1. **Mở MongoDB Compass**
2. **Refresh database `quanlygiaodich`**
3. **Sau khi đăng nhập**, bạn sẽ thấy:
   - Collection `users` - Chứa user admin
   - Collection `auditlogs` - Chứa log đăng nhập
   - Các collections khác sẽ được tạo khi có dữ liệu

### 6.4. Test các tính năng

- ✅ Đăng nhập/đăng xuất
- ✅ Xem Dashboard
- ✅ Quản lý Projects
- ✅ Quản lý Transactions
- ✅ Xem Bank Balance
- ✅ Quản lý Users (nếu là Admin)

---

## ❌ XỬ LÝ LỖI LOCAL

### Lỗi 1: "Cannot find module" hoặc "Module not found"
**Giải pháp**: 
```bash
npm install
```

### Lỗi 2: "Port 3000 already in use" hoặc "Port 3001 already in use"
**Giải pháp**: 
- Đóng các ứng dụng đang dùng port đó
- Hoặc kill process:
  ```bash
  # Tìm process
  netstat -ano | findstr :3001
  
  # Kill process (thay PID bằng số bạn tìm được)
  taskkill /PID [PID] /F
  ```

### Lỗi 3: "MONGODB_URI is not defined"
**Giải pháp**: 
- Kiểm tra file `.env.local` đã tạo chưa
- Kiểm tra tên file phải chính xác là `.env.local` (có dấu chấm ở đầu)
- Kiểm tra connection string có đúng không

### Lỗi 4: "ECONNREFUSED" khi kết nối MongoDB
**Giải pháp**:
- Kiểm tra MongoDB Atlas đã whitelist IP của bạn chưa (vào Network Access)
- Kiểm tra connection string có đúng username/password không
- Thử kết nối lại bằng MongoDB Compass để xác nhận

### Lỗi 5: "Cannot GET /" hoặc trang trắng
**Giải pháp**:
- Đảm bảo cả backend (port 3001) và frontend (port 3000) đều đang chạy
- Kiểm tra console trong trình duyệt (F12) để xem lỗi chi tiết

---

# PHẦN 2: DEPLOY LÊN VERCEL (PRODUCTION)

## 7. CHUẨN BỊ DEPLOY LÊN VERCEL

### 7.1. Kiểm tra các file cần thiết

Đảm bảo các file sau đã có trong dự án:
- ✅ `vercel.json` - Cấu hình Vercel
- ✅ `package.json` - Dependencies và scripts
- ✅ `api/` - Thư mục chứa Vercel serverless functions
- ✅ `backend/handlers/` - Logic xử lý API

### 7.2. Build Frontend (Test trước)

Trước khi deploy, test build frontend:

```bash
npm run build
```

**Kết quả mong đợi**:
- Tạo thư mục `dist/` chứa các file đã build
- Không có lỗi

**Lưu ý**: Nếu có lỗi, sửa trước khi deploy.

---

## 8. TẠO TÀI KHOẢN VERCEL

### 8.1. Đăng ký tài khoản

1. **Truy cập**: https://vercel.com/signup
2. **Chọn cách đăng ký**:
   - **GitHub** (khuyến nghị - dễ nhất)
   - **GitLab**
   - **Bitbucket**
   - **Email**

3. **Nếu chọn GitHub**:
   - Click **"Continue with GitHub"**
   - Đăng nhập GitHub
   - Cho phép Vercel truy cập repositories
   - Hoàn tất đăng ký

4. **Nếu chọn Email**:
   - Điền email và password
   - Xác thực email
   - Hoàn tất đăng ký

### 8.2. Cài đặt Vercel CLI (Tùy chọn)

**Cách 1: Deploy qua Web (Dễ nhất - Khuyến nghị)**
- Không cần cài CLI, deploy trực tiếp qua website

**Cách 2: Deploy qua CLI**
```bash
npm install -g vercel
```

---

## 9. CẤU HÌNH ENVIRONMENT VARIABLES

### 9.1. Chuẩn bị Environment Variables

Bạn cần các biến môi trường sau cho Vercel:
- `MONGODB_URI` - Connection string MongoDB (giống như trong `.env.local`)
- `JWT_SECRET` - Secret key cho JWT (giống như trong `.env.local`)
- `FRONTEND_URL` - URL của frontend sau khi deploy (sẽ là URL Vercel)
- `GEMINI_API_KEY` - (Tùy chọn)

### 9.2. Lấy MongoDB Connection String

- Sử dụng connection string giống như trong `.env.local`
- Đảm bảo Network Access trong MongoDB Atlas cho phép kết nối từ Vercel:
  - Vào MongoDB Atlas → Network Access
  - Thêm IP: `0.0.0.0/0` (Allow from anywhere) - **CHỈ DÙNG CHO PRODUCTION**
  - Hoặc thêm IP của Vercel (xem danh sách IP của Vercel)

---

## 10. DEPLOY LÊN VERCEL

### 10.1. Cách 1: Deploy qua Web (Khuyến nghị)

#### Bước 1: Import Project

1. **Đăng nhập Vercel**: https://vercel.com/login
2. **Click "Add New..."** → **"Project"**
3. **Import Git Repository**:
   - Nếu dự án đã có trên GitHub/GitLab:
     - Chọn repository
     - Click **"Import"**
   - Nếu chưa có trên Git:
     - Cần push code lên GitHub/GitLab trước
     - Xem hướng dẫn push code bên dưới

#### Bước 2: Push code lên GitHub (Nếu chưa có)

1. **Tạo repository trên GitHub**:
   - Truy cập: https://github.com/new
   - Đặt tên repository (ví dụ: `quanlygiaodich`)
   - Chọn **Public** hoặc **Private**
   - **KHÔNG** tick "Initialize with README"
   - Click **"Create repository"**

2. **Push code lên GitHub**:
   ```bash
   # Trong thư mục dự án
   cd D:\Final-bql-main
   
   # Khởi tạo git (nếu chưa có)
   git init
   
   # Thêm tất cả files
   git add .
   
   # Commit
   git commit -m "Initial commit"
   
   # Thêm remote (thay YOUR_USERNAME và YOUR_REPO bằng thông tin của bạn)
   git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO.git
   
   # Push code
   git branch -M main
   git push -u origin main
   ```

3. **Quay lại Vercel và import repository**

#### Bước 3: Cấu hình Project trên Vercel

1. **Project Settings**:
   - **Framework Preset**: Vite (hoặc để Vercel tự detect)
   - **Root Directory**: `./` (mặc định)
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
   - **Install Command**: `npm install`

2. **Environment Variables**:
   - Click **"Environment Variables"**
   - Thêm từng biến:
     - **Name**: `MONGODB_URI`
     - **Value**: Connection string MongoDB của bạn
     - **Environment**: Production, Preview, Development (chọn cả 3)
     - Click **"Save"**
   
   - Lặp lại cho các biến khác:
     - `JWT_SECRET` = Secret key của bạn
     - `FRONTEND_URL` = Để trống hoặc URL Vercel (sẽ tự động)
     - `GEMINI_API_KEY` = (Nếu có)

3. **Deploy**:
   - Click **"Deploy"**
   - Đợi quá trình build và deploy (3-5 phút)

### 10.2. Cách 2: Deploy qua CLI

1. **Đăng nhập Vercel CLI**:
   ```bash
   vercel login
   ```

2. **Deploy**:
   ```bash
   cd D:\Final-bql-main
   vercel
   ```

3. **Làm theo hướng dẫn**:
   - Chọn scope
   - Link to existing project hoặc tạo mới
   - Cấu hình settings

4. **Thêm Environment Variables**:
   ```bash
   vercel env add MONGODB_URI
   # Nhập value khi được hỏi
   
   vercel env add JWT_SECRET
   # Nhập value khi được hỏi
   ```

5. **Deploy production**:
   ```bash
   vercel --prod
   ```

---

## 11. KIỂM TRA SAU KHI DEPLOY

### 11.1. Kiểm tra URL

1. **Sau khi deploy xong**, Vercel sẽ cung cấp URL:
   - Ví dụ: `https://your-project.vercel.app`
   - URL này sẽ được hiển thị trong dashboard Vercel

2. **Truy cập URL**:
   - Mở trình duyệt
   - Truy cập URL Vercel
   - Bạn sẽ thấy ứng dụng của bạn

### 11.2. Test các tính năng

1. **Test đăng nhập**:
   - Username: `Quản trị viên`
   - Password: `admin`

2. **Test các API endpoints**:
   - Truy cập: `https://your-project.vercel.app/api/health`
   - Kết quả mong đợi: JSON response với status "ok"

3. **Kiểm tra Database**:
   - Mở MongoDB Compass
   - Kết nối với database
   - Kiểm tra dữ liệu đã được tạo

### 11.3. Cập nhật FRONTEND_URL (Nếu cần)

1. **Vào Vercel Dashboard** → **Project** → **Settings** → **Environment Variables**
2. **Cập nhật `FRONTEND_URL`**:
   - Name: `FRONTEND_URL`
   - Value: `https://your-project.vercel.app`
   - Save

3. **Redeploy** (nếu cần):
   - Vào **Deployments**
   - Click **"Redeploy"** trên deployment mới nhất

---

## 📝 CẤU TRÚC DEPLOYMENT

### Local Development:
- **Backend**: Express server (`server.ts`) chạy trên port 3001
- **Frontend**: Vite dev server chạy trên port 3000
- **Database**: MongoDB Atlas (kết nối qua connection string)

### Production (Vercel):
- **Backend**: Vercel serverless functions trong thư mục `api/`
- **Frontend**: Static files được build từ Vite (thư mục `dist/`)
- **Database**: MongoDB Atlas (cùng connection string)

---

## 🔄 CẬP NHẬT SAU KHI DEPLOY

### Cách 1: Tự động (Nếu dùng GitHub)

1. **Push code lên GitHub**:
   ```bash
   git add .
   git commit -m "Update code"
   git push
   ```

2. **Vercel tự động deploy**:
   - Vercel sẽ tự động detect thay đổi
   - Tự động build và deploy

### Cách 2: Manual Redeploy

1. **Vào Vercel Dashboard**
2. **Chọn Project**
3. **Vào tab "Deployments"**
4. **Click "Redeploy"** trên deployment bạn muốn

---

## ✅ CHECKLIST HOÀN THÀNH

### Local:
- [ ] Đã cài Node.js 22.x
- [ ] Đã tạo MongoDB Atlas account
- [ ] Đã cài MongoDB Compass và kết nối thành công
- [ ] Đã chạy `npm install`
- [ ] Đã tạo file `.env.local`
- [ ] Backend đang chạy trên port 3001
- [ ] Frontend đang chạy trên port 3000
- [ ] Có thể đăng nhập và sử dụng ứng dụng
- [ ] Có thể xem dữ liệu trong MongoDB Compass

### Production (Vercel):
- [ ] Đã tạo tài khoản Vercel
- [ ] Đã push code lên GitHub (nếu dùng)
- [ ] Đã import project vào Vercel
- [ ] Đã cấu hình Environment Variables
- [ ] Đã deploy thành công
- [ ] Có thể truy cập ứng dụng qua URL Vercel
- [ ] Có thể đăng nhập và sử dụng
- [ ] API endpoints hoạt động đúng

---

## 🆘 XỬ LÝ LỖI VERCEL

### Lỗi Build Failed
- Kiểm tra logs trong Vercel Dashboard
- Đảm bảo `npm run build` chạy thành công local
- Kiểm tra Environment Variables đã được cấu hình

### Lỗi API không hoạt động
- Kiểm tra Environment Variables (đặc biệt là `MONGODB_URI`)
- Kiểm tra Network Access trong MongoDB Atlas
- Xem logs trong Vercel Dashboard → Functions

### Lỗi Frontend không load
- Kiểm tra Output Directory trong Vercel settings (phải là `dist`)
- Kiểm tra Build Command (`npm run build`)

---

Chúc bạn deploy thành công! 🎉
