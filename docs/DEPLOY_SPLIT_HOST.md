# Deploy JPTaxi — Tách host (Neon + Railway + Vercel)

Hướng dẫn deploy production theo mô hình:

- **Database**: [Neon](https://neon.tech) (PostgreSQL)
- **Backend**: [Railway](https://railway.app) (NestJS)
- **Frontend**: [Vercel](https://vercel.com) (React/Vite)

Thứ tự thực hiện: **Neon → Railway → Vercel**.

---

## Bước 1 — Database trên Neon

1. Đăng ký/đăng nhập [neon.tech](https://neon.tech).
2. **New Project** → đặt tên `jptaxi`.
3. Tạo database tên `JPTaxi` (hoặc dùng database mặc định).
4. Vào **Connection details** → copy **connection string** (chọn *Pooled* hoặc *Direct* đều được cho import).
5. Trên máy local, import schema + seed:

```bash
export DATABASE_URL="postgresql://USER:PASS@HOST/JPTaxi?sslmode=require"
chmod +x scripts/import-cloud-db.sh
./scripts/import-cloud-db.sh
```

6. Giữ lại `DATABASE_URL` để dùng ở bước 2.

---

## Bước 2 — Backend trên Railway

1. Đăng nhập [railway.app](https://railway.app) → **New Project** → **Deploy from GitHub repo**.
2. Chọn repo `ITSSJP1-20252-Thu1-JPTaxi`.
3. Trong service settings:
   - **Root Directory**: `backend`
   - **Build Command**: `npm ci && npm run build` (Railway tự nhận từ `railway.toml`)
   - **Start Command**: `npm run start:prod`
4. Thêm **Variables**:

| Biến | Giá trị |
|------|---------|
| `DATABASE_URL` | Connection string Neon (bước 1) |
| `JWT_SECRET` | Chuỗi ngẫu nhiên dài (không dùng giá trị dev) |
| `FRONTEND_URL` | Để trống tạm, cập nhật sau bước 3 |
| `NODE_ENV` | `production` |

5. **Settings → Networking → Generate Domain** → lấy URL, ví dụ:
   `https://jptaxi-api-production.up.railway.app`
6. Kiểm tra API:

```bash
curl https://YOUR-RAILWAY-URL.up.railway.app/api
```

(Nếu trả JSON hoặc 404 có prefix `/api` là backend đã chạy.)

### Upload file trên Railway

Avatar lưu tại `backend/uploads/`. Trên Railway filesystem có thể mất khi redeploy.
Với demo: chấp nhận hạn chế này. Production thật nên dùng S3/Cloudinary.

---

## Bước 3 — Frontend trên Vercel

1. Đăng nhập [vercel.com](https://vercel.com) → **Add New → Project**.
2. Import repo GitHub `ITSSJP1-20252-Thu1-JPTaxi`.
3. Cấu hình:

| Mục | Giá trị |
|-----|---------|
| **Root Directory** | `frontend` |
| **Framework Preset** | Vite |
| **Build Command** | `npm run build` |
| **Output Directory** | `dist` |

4. **Environment Variables** (bắt buộc trước khi build):

| Biến | Giá trị |
|------|---------|
| `VITE_API_BASE_URL` | `https://YOUR-RAILWAY-URL.up.railway.app/api` |

5. **Deploy** → nhận URL, ví dụ: `https://jptaxi.vercel.app`

---

## Bước 4 — Hoàn tất CORS

Quay lại Railway → cập nhật biến:

```
FRONTEND_URL=https://jptaxi.vercel.app
```

Nếu có preview URL Vercel, thêm bằng dấu phẩy:

```
FRONTEND_URL=https://jptaxi.vercel.app,https://jptaxi-git-main-xxx.vercel.app
```

Redeploy backend sau khi đổi biến.

---

## Bước 5 — Kiểm tra sau deploy

- [ ] Mở frontend URL → trang chủ load được
- [ ] Đăng nhập khách / tài xế (tài khoản từ `DB_data.sql`)
- [ ] Admin: `POST /api/admin/login` — `admin1` / `admin123` (chỉ dev seed)
- [ ] Upload avatar
- [ ] Chat (WebSocket) giữa khách và tài xế

---

## Cập nhật sau này

```bash
git push origin main
```

- Vercel và Railway tự deploy lại khi push lên nhánh đã kết nối.
- Nếu đổi URL Railway, cập nhật lại `VITE_API_BASE_URL` trên Vercel và **Redeploy** frontend.

---

## Xử lý lỗi thường gặp

| Lỗi | Cách xử lý |
|-----|------------|
| Frontend gọi API lỗi CORS | Kiểm tra `FRONTEND_URL` trên Railway khớp domain Vercel |
| `ECONNREFUSED` database | Kiểm tra `DATABASE_URL`, Neon project còn active |
| API 502 trên Railway | Xem **Deployments → Logs**, thường do thiếu `JWT_SECRET` hoặc DB sai |
| Trang refresh 404 | Đã có `frontend/vercel.json` rewrite SPA |
| Chat không kết nối | Đảm bảo `VITE_API_BASE_URL` đúng; Railway hỗ trợ WebSocket |
