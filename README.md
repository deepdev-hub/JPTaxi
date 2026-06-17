# JP Taxi

Ung dung dat taxi gom NestJS API, React/Vite UI va PostgreSQL 17. TypeORM
migrations la nguon schema duy nhat; ung dung luon chay voi `synchronize: false`.

## Cong nghe

- Backend: Node.js 20+, NestJS 11, TypeORM, PostgreSQL, JWT, Socket.IO
- Frontend: React 19, Vite 7, React Router, Leaflet
- Test: Jest, Supertest, Vitest, Testing Library, Playwright
- Tich hop: Nominatim, OSRM, SMTP hoac console mail, PDFKit

## Cau hinh local

```powershell
Copy-Item backend/.env.example backend/.env
```

Dien toi thieu:

```dotenv
DATABASE_URL=postgresql://jptaxi_app:<app-password>@localhost:5432/JPTaxi
DATABASE_ADMIN_URL=postgresql://postgres:<postgres-password>@localhost:5432/postgres
JWT_SECRET=<random-secret-at-least-32-characters>
FRONTEND_URL=http://localhost:5173
MAIL_MODE=console
DISPATCH_INITIAL_RADIUS_KM=2
DISPATCH_RADIUS_STEP_KM=1
DISPATCH_EXPANSION_INTERVAL_MS=2000
DISPATCH_OFFER_TIMEOUT_MS=30000
DISPATCH_LOCATION_MAX_AGE_MINUTES=30
```

Frontend dung `frontend/.env` local voi
`VITE_API_BASE_URL=http://localhost:3000/api`. Cac file `.env` deu bi Git ignore.

Frontend co san file mau `frontend/.env.example`. Copy file nay thanh
`frontend/.env` khi chay local, hoac dat cung ten bien tren Vercel.

## Cai dat va database

```powershell
npm run install:all
npm run db:create
npm run db:migrate
npm run db:seed
```

Reset chi duoc phep voi dung database `JPTaxi`:

```powershell
$env:RESET_JPTAXI='YES'
npm run db:reset
```

Tai khoan seed:

- Customer: `customer@jptaxi.local`
- Customer co request dispatch: `customer2@jptaxi.local`
- Driver approved: `driver@jptaxi.local`
- Driver approved co request dispatch: `driver2@jptaxi.local`
- Driver pending: `driver.pending@jptaxi.local`
- Admin API only: `admin`

- Mat khau customer/driver: `password123`
- Mat khau admin: `admin123`

Day la mat khau seed chi dung cho local va test.

## Chay giao dien

Terminal 1:

```powershell
npm run start:backend
```

Terminal 2:

```powershell
npm run start:frontend
```

Mo `http://localhost:5173`.

## Kiem tra

Database can duoc migrate va seed truoc khi chay E2E:

```powershell
npm test
npm run test:e2e
npm run test:e2e:ui
npm run build
```

Hoac chay toan bo:

```powershell
npm run verify
```

E2E dung `TEST_DATABASE_URL` neu bien nay duoc cau hinh; neu khong se dung
`DATABASE_URL`. Sau E2E, chay lai `db:reset` de khoi phuc dung bo du lieu seed.

Playwright kiem tra luong customer/driver, reject/blacklist/timeout va visual
regression desktop/mobile. Backend production build phai ton tai truoc khi chay
`npm run test:e2e:ui`.

`MAIL_MODE=console` ghi email reset/hoa don ra terminal. De gui that, dat
`MAIL_MODE=smtp` cung `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS` va
`SMTP_FROM`.

## Production deploy

Du an nay deploy tach rieng:

- Frontend React/Vite len Vercel
- Backend NestJS len Railway

### Frontend tren Vercel

- Root Directory: `frontend`
- Framework Preset: `Vite`
- Build Command: `npm run build`
- Output Directory: `dist`

Repo da co file [`frontend/vercel.json`](frontend/vercel.json) de giu cau hinh
Vite va rewrite moi route SPA ve `index.html`, vi vay refresh cac route nhu
`/login`, `/register`, `/driver-home` se khong bi 404 neu project tren Vercel
duoc tro dung vao thu muc `frontend`.

Frontend goi API qua bien:

```dotenv
VITE_API_BASE_URL=https://jptaxi-production.up.railway.app/api
```

Dat bien nay trong Vercel Project Settings cho Preview/Production. Khong can sua
code frontend de deploy, vi `frontend/api/client.js` da doc bien
`VITE_API_BASE_URL`.

### Backend tren Railway

- Service Root Directory: `/backend`
- Railway config file: `/backend/railway.toml`
- Build Command: `npm ci && npm run build`
- Start Command: `npm run start:prod`

Khong dung root script `npm run start:backend` tren Railway, vi script nay chi
phuc vu local development va dang chay `start:dev`.

`backend/src/main.ts` da listen tren `0.0.0.0:$PORT`, phu hop voi Railway.

### Bien moi truong production

Backend Railway toi thieu can:

```dotenv
DATABASE_URL=postgresql://...
JWT_SECRET=replace_with_a_real_secret_at_least_32_characters
FRONTEND_URL=https://jp-taxi.vercel.app
CORS_ALLOWED_ORIGINS=https://jp-taxi.vercel.app
CORS_ALLOWED_ORIGIN_PATTERNS=https://*.vercel.app
RESET_PASSWORD_URL=https://jp-taxi.vercel.app/reset-password
UPLOAD_PUBLIC_BASE_URL=https://jptaxi-production.up.railway.app
UPLOAD_MODE=supabase_s3
SUPABASE_STORAGE_ENDPOINT=https://<storage-endpoint>
SUPABASE_STORAGE_REGION=<storage-region>
SUPABASE_STORAGE_ACCESS_KEY=<access-key>
SUPABASE_STORAGE_SECRET_KEY=<secret-key>
SUPABASE_STORAGE_BUCKET=<bucket-name>
SUPABASE_STORAGE_PUBLIC_URL=https://<public-bucket-base-url>
```

Frontend Vercel can:

```dotenv
VITE_API_BASE_URL=https://jptaxi-production.up.railway.app/api
```

### Luu tru upload trong production

Khong nen de `UPLOAD_MODE=local` tren Railway cho production. Backend ho tro san
`supabase_s3`; dung che do nay de avatar va tai lieu tai xe khong mat sau
redeploy hoac restart. Khi cau hinh dung, API upload se tra ve public URL tu
bucket thay vi duong dan local dang `/uploads/...`.

### Thu tu deploy

1. Deploy backend len Railway truoc.
2. Tao public domain cho service backend tren Railway.
3. Dat `VITE_API_BASE_URL=https://jptaxi-production.up.railway.app/api` trong Vercel.
4. Deploy frontend len Vercel va lay frontend domain.
5. Cap nhat `FRONTEND_URL`, `CORS_ALLOWED_ORIGINS`, `RESET_PASSWORD_URL` va
   `UPLOAD_PUBLIC_BASE_URL` tren Railway theo domain production thuc te.
6. Redeploy backend neu vua sua cac bien moi truong tren Railway.

### Checklist Railway dashboard

- Root Directory: `/backend`
- Build Command: `npm ci && npm run build`
- Start Command: `npm run start:prod`
- Public domain: `https://jptaxi-production.up.railway.app`
- Runtime env toi thieu:
  - `FRONTEND_URL=https://jp-taxi.vercel.app`
  - `CORS_ALLOWED_ORIGINS=https://jp-taxi.vercel.app`
  - `RESET_PASSWORD_URL=https://jp-taxi.vercel.app/reset-password`
  - `UPLOAD_PUBLIC_BASE_URL=https://jptaxi-production.up.railway.app`
  - `DATABASE_URL` hoac bo datasource production tuong ung
  - `JWT_SECRET`

### Kiem tra sau deploy

- `frontend` build thanh cong va artifact khong con tro toi `localhost`.
- Refresh route SPA tren Vercel khong bi 404.
- Backend Railway start bang production build, khong phai watch mode.
- CORS cho phep frontend Vercel goi REST API va websocket.
- Upload avatar/tai lieu tra ve URL public tu object storage.
- Dang ky, dang nhap, reset password va upload ho so tai xe hoat dong qua domain
  production.
