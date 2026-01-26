# 📚 GIẢI THÍCH VỀ DATABASE NAME TRONG MONGODB

## 🔍 VẤN ĐỀ HIỆN TẠI

Bạn đang thấy database tên **"test"** trong MongoDB Compass thay vì **"quanlygiaodich"**.

---

## ❓ TẠI SAO LẠI LÀ "test"?

### Nguyên nhân:

Connection string trong file `.env.local` của bạn **KHÔNG có tên database**:

```
mongodb+srv://infonamhaido_db_user:namdohai123456asd@agribank.uszezvu.mongodb.net/
```

**Lưu ý**: Connection string kết thúc bằng `/` mà không có tên database sau đó.

### Điều gì xảy ra?

Khi connection string **KHÔNG có tên database**:
1. MongoDB sẽ tự động tạo hoặc sử dụng database mặc định
2. Database mặc định thường là **"test"** (theo quy ước của MongoDB)
3. Tất cả collections sẽ được tạo trong database "test"

### Kết quả:

- ✅ Dữ liệu vẫn được lưu đúng
- ✅ Collections vẫn được tạo đúng (users, projects, transactions, v.v.)
- ❌ Nhưng database tên là "test" thay vì "quanlygiaodich"

---

## ✅ CÁCH SỬA: THÊM TÊN DATABASE VÀO CONNECTION STRING

### Bước 1: Cập nhật file `.env.local`

**Connection string hiện tại** (SAI):
```
MONGODB_URI=mongodb+srv://infonamhaido_db_user:namdohai123456asd@agribank.uszezvu.mongodb.net/
```

**Connection string đúng** (CẦN SỬA):
```
MONGODB_URI=mongodb+srv://infonamhaido_db_user:namdohai123456asd@agribank.uszezvu.mongodb.net/quanlygiaodich?retryWrites=true&w=majority&appName=Agribank
```

**Thay đổi**:
- Thêm `/quanlygiaodich` sau `.net/`
- Thêm query parameters: `?retryWrites=true&w=majority&appName=Agribank`

### Bước 2: Lưu file

Lưu file `.env.local` sau khi cập nhật.

### Bước 3: Restart Backend

1. **Dừng backend** (nếu đang chạy): `Ctrl + C`
2. **Chạy lại backend**:
   ```bash
   npm run dev:server
   ```

### Bước 4: Kiểm tra trong MongoDB Compass

1. **Refresh** database list trong MongoDB Compass
2. Bạn sẽ thấy database **"quanlygiaodich"** được tạo tự động
3. Database "test" vẫn còn (có thể xóa sau nếu muốn)

---

## 🔄 CHUYỂN DỮ LIỆU TỪ "test" SANG "quanlygiaodich" (Tùy chọn)

Nếu bạn đã có dữ liệu trong database "test" và muốn chuyển sang "quanlygiaodich":

### Cách 1: Dùng MongoDB Compass (Dễ nhất)

1. **Mở MongoDB Compass**
2. **Kết nối với cluster**
3. **Vào database "test"**
4. **Chọn tất cả collections** (users, projects, transactions, v.v.)
5. **Export** collections (hoặc copy data)
6. **Tạo database mới "quanlygiaodich"** (sẽ tự động tạo khi backend chạy với connection string mới)
7. **Import** collections vào database "quanlygiaodich"

### Cách 2: Dùng MongoDB Shell (Nâng cao)

```bash
# Copy collections từ test sang quanlygiaodich
mongodump --uri="mongodb+srv://infonamhaido_db_user:namdohai123456asd@agribank.uszezvu.mongodb.net/test" --out=backup
mongorestore --uri="mongodb+srv://infonamhaido_db_user:namdohai123456asd@agribank.uszezvu.mongodb.net/quanlygiaodich" backup/test
```

### Cách 3: Bắt đầu lại (Nếu dữ liệu không quan trọng)

Nếu dữ liệu trong "test" chỉ là test data, bạn có thể:
1. **Xóa database "test"** trong MongoDB Compass
2. **Cập nhật connection string** như hướng dẫn trên
3. **Chạy lại backend** → Database "quanlygiaodich" sẽ được tạo mới

---

## 🌐 LOCAL VS PRODUCTION (Vercel)

### Câu hỏi: Có phải sẽ thay đổi khi launch online không?

**Trả lời**: **CÓ**, nhưng bạn cần cấu hình đúng!

### Local Development:

- Sử dụng file `.env.local`
- Connection string: `mongodb+srv://.../quanlygiaodich?...`
- Database: `quanlygiaodich` (sau khi sửa)

### Production (Vercel):

- Sử dụng **Environment Variables** trong Vercel Dashboard
- Connection string: **PHẢI GIỐNG** connection string local (có tên database)
- Database: `quanlygiaodich` (nếu cấu hình đúng)

### ⚠️ QUAN TRỌNG:

1. **Khi deploy lên Vercel**, bạn **PHẢI** cấu hình Environment Variable `MONGODB_URI` với connection string **CÓ tên database**:
   ```
   mongodb+srv://infonamhaido_db_user:namdohai123456asd@agribank.uszezvu.mongodb.net/quanlygiaodich?retryWrites=true&w=majority&appName=Agribank
   ```

2. **Nếu không có tên database** trong Vercel Environment Variable:
   - Production sẽ dùng database "test" (hoặc database mặc định)
   - Dữ liệu local và production sẽ **KHÁC NHAU**

3. **Khuyến nghị**: 
   - Dùng **CÙNG một database** cho cả local và production
   - Hoặc dùng **database riêng** cho production (ví dụ: `quanlygiaodich_prod`)

---

## 📝 TÓM TẮT

### Hiện tại:
- ❌ Connection string không có tên database
- ❌ Database đang là "test"
- ✅ Dữ liệu vẫn hoạt động bình thường

### Sau khi sửa:
- ✅ Connection string có tên database `/quanlygiaodich`
- ✅ Database sẽ là "quanlygiaodich"
- ✅ Dữ liệu sẽ được lưu vào database đúng

### Khi deploy Vercel:
- ✅ Cấu hình Environment Variable `MONGODB_URI` với tên database
- ✅ Production sẽ dùng database "quanlygiaodich" (nếu cấu hình đúng)
- ⚠️ Nếu không cấu hình đúng, production sẽ dùng database khác

---

## ✅ CHECKLIST

- [ ] Đã cập nhật file `.env.local` với tên database `/quanlygiaodich`
- [ ] Đã restart backend
- [ ] Đã kiểm tra MongoDB Compass → Thấy database "quanlygiaodich"
- [ ] Đã test ứng dụng → Dữ liệu vẫn hoạt động
- [ ] Khi deploy Vercel → Đã cấu hình Environment Variable với tên database

---

Chúc bạn sửa thành công! 🎉
