# ITSSJP1-20252-Thu1-JPTaxi

POT: Yotsuba · DevT: 67

## Cấu trúc

| Thư mục | Nội dung |
|--------|----------|
| `frontend/` | React + Vite. Mặc định `http://localhost:3000/api` nếu không cấu hình `.env`. |
| `database/` | `DB.sql`, `DB_data.sql` |
| `backend/` | NestJS: auth, profile khách/tài xế, upload avatar, admin (JWT + role), ước giá cước |

## Chạy nhanh

1. PostgreSQL: tạo DB, chạy `database/DB.sql` rồi `database/DB_data.sql` (seed; mật khẩu admin dev xem dòng comment trong `DB_data.sql`).
2. `cd backend && cp .env.example .env` — chỉnh `DB_*`, `JWT_SECRET`.
3. `npm install && npm run start:dev` (cổng mặc định **3000**).
4. Mở `cd frontend` rồi `npm install` và `npm run dev`

## API chính (prefix `/api`)

- `POST /register`, `POST /login`, `GET /profile` (JWT khách hàng, `role: customer`)
- `POST /estimate` — ước giá
- `GET|PUT /customers/:id/profile`, `POST /uploads/avatar`
- `GET|PUT /drivers/:id/profile`, `PUT /drivers/:id/bank-account`
- `POST /admin/login` — JWT `role: admin` (dev: **admin1** / **admin123**, **mod1** / **mod123** sau khi import seed đã cập nhật bcrypt)
- `GET /admin/drivers`, `GET /admin/customers`, `DELETE /admin/driver/:id` — cần header `Authorization: Bearer <token admin>`

File tĩnh upload phục vụ tại `/uploads/...` (cùng origin với API, ví dụ `http://localhost:3000/uploads/avatars/...`).
