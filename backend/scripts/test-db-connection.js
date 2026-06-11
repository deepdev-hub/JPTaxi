/**
 * Kiểm tra kết nối PostgreSQL với cùng biến môi trường mà NestJS dùng (ConfigModule / TypeORM).
 * Chạy: npm run test:db
 * Ưu tiên file .env trong thư mục backend; nếu không có thì đọc .env.example.
 */
const fs = require('fs');
const path = require('path');
const { Client } = require('pg');

function loadEnvFile(filePath) {
  if (!fs.existsSync(filePath)) return false;
  const text = fs.readFileSync(filePath, 'utf8');
  for (const line of text.split('\n')) {
    const t = line.trim();
    if (!t || t.startsWith('#')) continue;
    const eq = t.indexOf('=');
    if (eq === -1) continue;
    const key = t.slice(0, eq).trim();
    let val = t.slice(eq + 1).trim();
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1);
    }
    if (process.env[key] === undefined) process.env[key] = val;
  }
  return true;
}

const root = path.resolve(__dirname, '..');
const envPath = path.join(root, '.env');
const examplePath = path.join(root, '.env.example');

let source;
if (loadEnvFile(envPath)) {
  source = '.env';
} else if (loadEnvFile(examplePath)) {
  source = '.env.example (tạo file .env để dùng mật khẩu thật)';
} else {
  console.error('Không tìm thấy .env hoặc .env.example trong backend/');
  process.exit(1);
}

const host = process.env.DB_HOST || 'localhost';
const port = parseInt(process.env.DB_PORT || '5432', 10);
const user = process.env.DB_USER;
const password = process.env.DB_PASS;
const database = process.env.DB_NAME;

console.log('Nguồn:', source);
console.log('Tham số:', { host, port, user, database });

const client = new Client({ host, port, user, password, database });

client
  .connect()
  .then(() =>
    client.query(
      'SELECT current_database() AS database, current_user AS "user", NOW() AS server_time',
    ),
  )
  .then((res) => {
    console.log('Truy vấn thử:', res.rows[0]);
    return client.end();
  })
  .then(() => {
    console.log('Kết luận: KẾT NỐI DATABASE THÀNH CÔNG');
    process.exit(0);
  })
  .catch((err) => {
    console.error('Kết luận: KẾT NỐI THẤT BẠI');
    console.error(String(err.message || err));
    process.exit(1);
  });
