-- Sửa hash bcrypt cũ (không khớp password123) trên DB đã import trước đó.
-- Chạy: psql -U <user> -d <db> -f database/fix_password_hashes.sql

UPDATE customer
SET password_hash = '$2a$10$Bf2ID3957Jxa6J9/FWuyROo1THOJWuQdQ5i12aAW6XSQHTrlO0xIS'
WHERE password_hash = '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy';

UPDATE driver
SET password_hash = '$2a$10$Bf2ID3957Jxa6J9/FWuyROo1THOJWuQdQ5i12aAW6XSQHTrlO0xIS'
WHERE password_hash = '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy';

UPDATE admin
SET password_hash = '$2a$10$Bf2ID3957Jxa6J9/FWuyROo1THOJWuQdQ5i12aAW6XSQHTrlO0xIS'
WHERE password_hash = '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy';

-- Tài khoản dev @jptaxi.dev (mật khẩu password123)
UPDATE customer
SET password_hash = '$2a$10$Bf2ID3957Jxa6J9/FWuyROo1THOJWuQdQ5i12aAW6XSQHTrlO0xIS'
WHERE email LIKE '%@jptaxi.dev';

UPDATE driver
SET password_hash = '$2a$10$Bf2ID3957Jxa6J9/FWuyROo1THOJWuQdQ5i12aAW6XSQHTrlO0xIS'
WHERE email LIKE '%@jptaxi.dev';
