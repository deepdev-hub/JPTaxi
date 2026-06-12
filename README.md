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
