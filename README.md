# JP Taxi

Ứng dụng đặt taxi gồm NestJS API, React/Vite UI và PostgreSQL 17. TypeORM
migrations là nguồn schema duy nhất; ứng dụng luôn chạy với
`synchronize: false`.

## Công nghệ

- Backend: Node.js 20+, NestJS 10, TypeORM, PostgreSQL, JWT, Socket.IO
- Frontend: React 19, Vite 7, React Router, Leaflet
- Test: Jest, Supertest, Vitest, Testing Library
- Tích hợp: Nominatim, OSRM, SMTP hoặc console mail, PDFKit

## Cấu hình local

```powershell
Copy-Item backend/.env.example backend/.env
```

Điền tối thiểu:

```dotenv
DATABASE_URL=postgresql://jptaxi_app:<app-password>@localhost:5432/JPTaxi
DATABASE_ADMIN_URL=postgresql://postgres:<postgres-password>@localhost:5432/postgres
JWT_SECRET=<random-secret-at-least-32-characters>
FRONTEND_URL=http://localhost:5173
MAIL_MODE=console
```

Frontend đã dùng `frontend/.env` local với
`VITE_API_BASE_URL=http://localhost:3000/api`. Các file `.env` đều bị Git
ignore.

## Cài đặt và database

```powershell
npm run install:all
npm run db:create
npm run db:migrate
npm run db:seed
```

Reset chỉ được phép với đúng database `JPTaxi`:

```powershell
$env:RESET_JPTAXI='YES'
npm run db:reset
```

Seed local:

- Customer: `customer@jptaxi.local`
- Driver approved: `driver@jptaxi.local`
- Driver pending: `driver.pending@jptaxi.local`
- Admin API only: `admin`

Mật khẩu phát triển chỉ được định nghĩa trong seed/test.

## Chạy và kiểm tra

```powershell
npm run start:backend
npm run start:frontend
npm test
npm run build
```

E2E backend chạy trên database test đã migrate và seed:

```powershell
$env:TEST_DATABASE_URL='postgresql://.../JPTaxi_test'
npm run test:e2e --prefix backend
```

`MAIL_MODE=console` ghi email reset/hóa đơn ra terminal. Để gửi thật, đặt
`MAIL_MODE=smtp` cùng `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS` và
`SMTP_FROM`.
