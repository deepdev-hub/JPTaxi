-- =====================================================
-- 1. Tạo ENUM types cho các giá trị cố định
-- =====================================================

CREATE TYPE gender_type AS ENUM ('Male', 'Female', 'Other');
CREATE TYPE driver_status_type AS ENUM ('pending', 'approved', 'rejected', 'suspended');
CREATE TYPE ride_request_status_type AS ENUM ('pending', 'searching', 'assigned', 'completed', 'failed');
CREATE TYPE trip_status_type AS ENUM ('ongoing', 'completed', 'cancelled_by_admin');
CREATE TYPE dispatch_status_type AS ENUM ('pending', 'accepted', 'rejected', 'timeout');
CREATE TYPE payment_status_type AS ENUM ('pending', 'success', 'failed');
CREATE TYPE payout_status_type AS ENUM ('pending', 'processed', 'failed');
CREATE TYPE user_type_enum AS ENUM ('customer', 'driver');
CREATE TYPE license_type_enum AS ENUM ('B', 'C1', 'C', 'D1', 'D2', 'D');
CREATE TYPE payment_method_enum AS ENUM ('VISA', 'MASTER', 'JCB', 'VNPAY');
CREATE TYPE vehicle_type_enum AS ENUM ('4', '7', '9');  -- số chỗ ngồi
CREATE TYPE driver_japanese_level_enum AS ENUM ('N5', 'N4', 'N3', 'N2', 'N1', 'Native');

-- =====================================================
-- 2. Bảng thực thể chính (không lookup)
-- =====================================================

-- Khách hàng
CREATE TABLE customer (
    customer_id SERIAL PRIMARY KEY,
    last_name VARCHAR(25) NOT NULL,
    first_name VARCHAR(25) NOT NULL,
    gender gender_type NOT NULL,
    birth_date DATE NOT NULL,
    phone VARCHAR(15) NOT NULL UNIQUE,
    email VARCHAR(50) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    is_email_verified BOOLEAN NOT NULL DEFAULT FALSE,
    is_phone_verified BOOLEAN NOT NULL DEFAULT FALSE,
    avatar_url VARCHAR(255) NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NULL
);

-- Quản trị viên
CREATE TABLE admin (
    admin_id SERIAL PRIMARY KEY,
    username VARCHAR(50) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(20) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Tài xế
CREATE TABLE driver (
    driver_id SERIAL PRIMARY KEY,
    last_name VARCHAR(25) NOT NULL,
    first_name VARCHAR(25) NOT NULL,
    gender gender_type NOT NULL,
    birth_date DATE NOT NULL,
    phone VARCHAR(15) NOT NULL UNIQUE,
    email VARCHAR(50) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    nationality VARCHAR(50) NOT NULL,
    id_number VARCHAR(20) NULL,
    is_email_verified BOOLEAN NOT NULL DEFAULT FALSE,
    is_phone_verified BOOLEAN NOT NULL DEFAULT FALSE,
    status driver_status_type NOT NULL DEFAULT 'pending',
    approved_by INT NULL,
    approved_at TIMESTAMPTZ NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NULL,
    avatar_url VARCHAR(255) NULL,
    driver_japanese_level driver_japanese_level_enum NOT NULL,
    FOREIGN KEY (approved_by) REFERENCES admin(admin_id) ON DELETE SET NULL,
    CONSTRAINT unique_id_nationality UNIQUE (id_number, nationality)
);

-- Phương tiện (bỏ vehicle_type, dùng ENUM trực tiếp)
CREATE TABLE vehicle (
    vehicle_id SERIAL PRIMARY KEY,
    driver_id INT NOT NULL UNIQUE,
    vehicle_type vehicle_type_enum NOT NULL,  -- '4', '7', '9'
    license_plate VARCHAR(20) NOT NULL UNIQUE,
    brand VARCHAR(50) NOT NULL,
    color VARCHAR(30) NOT NULL,
    manufacture_year INT NOT NULL,
    vehicle_photo_url VARCHAR(255) NULL,
    registration_paper_url VARCHAR(255) NULL,
    FOREIGN KEY (driver_id) REFERENCES driver(driver_id) ON DELETE CASCADE
);

-- Bảng cấu hình giá cước
CREATE TABLE pricing_rule (
    rule_id SERIAL PRIMARY KEY,
    start_km DECIMAL(8,2) NOT NULL,
    end_km DECIMAL(8,2) NULL,
    price_per_km_vnd DECIMAL(10,2) NOT NULL,
    is_base_fare BOOLEAN NOT NULL DEFAULT FALSE,
    effective_from DATE NOT NULL,
    priority INT NOT NULL,
    CHECK (start_km >= 0)
);

-- =====================================================
-- 3. Bảng liên quan đến yêu cầu và chuyến đi
-- =====================================================

-- Yêu cầu đặt xe (bỏ vehicle_type_id, dùng ENUM trực tiếp)
CREATE TABLE ride_request (
    request_id SERIAL PRIMARY KEY,
    customer_id INT NOT NULL,
    pickup_address VARCHAR(255) NOT NULL,
    pickup_lat DECIMAL(10,8) NOT NULL,
    pickup_lng DECIMAL(11,8) NOT NULL,
    dropoff_address VARCHAR(255) NOT NULL,
    dropoff_lat DECIMAL(10,8) NOT NULL,
    dropoff_lng DECIMAL(11,8) NOT NULL,
    vehicle_type vehicle_type_enum NOT NULL,
    actual_passenger_name VARCHAR(50) NULL,
    actual_passenger_phone VARCHAR(15) NULL,
    request_time TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    status ride_request_status_type NOT NULL,
    note_to_driver VARCHAR(255) NULL,
    estimated_fare_vnd INT NULL,
    estimated_fare_jpy INT NULL,
    raw_fare_vnd INT NULL,
    FOREIGN KEY (customer_id) REFERENCES customer(customer_id) ON DELETE RESTRICT
);

-- Lịch sử gọi tài xế (bảng kết hợp N-N)
CREATE TABLE ride_request_dispatch (
    dispatch_id SERIAL PRIMARY KEY,
    request_id INT NOT NULL,
    driver_id INT NOT NULL,
    attempt_number SMALLINT NOT NULL CHECK (attempt_number BETWEEN 1 AND 20),
    status dispatch_status_type NOT NULL,
    sent_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    responded_at TIMESTAMPTZ NULL,
    FOREIGN KEY (request_id) REFERENCES ride_request(request_id) ON DELETE CASCADE,
    FOREIGN KEY (driver_id) REFERENCES driver(driver_id) ON DELETE CASCADE
);
CREATE INDEX idx_dispatch_request ON ride_request_dispatch(request_id);

-- Chuyến đi
CREATE TABLE trip (
    trip_id SERIAL PRIMARY KEY,
    request_id INT NOT NULL UNIQUE,
    driver_id INT NOT NULL,
    start_time TIMESTAMPTZ NOT NULL,
    end_time TIMESTAMPTZ NULL,
    actual_distance_km DECIMAL(8,2) NOT NULL,
    exchange_rate_vnd_to_jpy DECIMAL(10,4) NOT NULL,
    final_fare_vnd INT NOT NULL,
    final_fare_jpy INT NOT NULL,
    raw_fare_vnd INT NULL,
    status trip_status_type NOT NULL,
    FOREIGN KEY (request_id) REFERENCES ride_request(request_id) ON DELETE RESTRICT,
    FOREIGN KEY (driver_id) REFERENCES driver(driver_id) ON DELETE RESTRICT
);

-- =====================================================
-- 4. Bảng thanh toán, chi trả, đánh giá
-- =====================================================

-- Đánh giá
CREATE TABLE rating (
    rating_id SERIAL PRIMARY KEY,
    trip_id INT NOT NULL UNIQUE,
    customer_id INT NOT NULL,
    score NUMERIC(2, 1) NOT NULL CHECK (score BETWEEN 0.5 AND 5 AND score * 2 = FLOOR(score * 2)),
    comment TEXT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NULL,
    FOREIGN KEY (trip_id) REFERENCES trip(trip_id) ON DELETE CASCADE,
    FOREIGN KEY (customer_id) REFERENCES customer(customer_id) ON DELETE RESTRICT
);

-- Giao dịch thanh toán (bỏ payment_method_id, dùng ENUM trực tiếp)
CREATE TABLE payment_transaction (
    transaction_id SERIAL PRIMARY KEY,
    trip_id INT NOT NULL UNIQUE,
    payment_method payment_method_enum NOT NULL,  -- 'VISA', 'MASTER', 'JCB', 'VNPAY'
    amount_vnd INT NOT NULL,
    status payment_status_type NOT NULL,
    gateway_transaction_id VARCHAR(100) NULL,
    paid_at TIMESTAMPTZ NULL,
    FOREIGN KEY (trip_id) REFERENCES trip(trip_id) ON DELETE RESTRICT
);

-- Tài khoản ngân hàng của tài xế
CREATE TABLE driver_bank_account (
    account_id SERIAL PRIMARY KEY,
    driver_id INT NOT NULL UNIQUE,
    bank_name VARCHAR(100) NOT NULL,
    account_number VARCHAR(30) NOT NULL,
    account_holder VARCHAR(100) NOT NULL,
    FOREIGN KEY (driver_id) REFERENCES driver(driver_id) ON DELETE CASCADE
);

-- Chi trả cho tài xế
CREATE TABLE driver_payout (
    payout_id SERIAL PRIMARY KEY,
    trip_id INT NOT NULL UNIQUE,
    driver_id INT NOT NULL,
    amount_vnd INT NOT NULL,
    status payout_status_type NOT NULL,
    bank_account_id INT NULL,
    processed_at TIMESTAMPTZ NULL,
    FOREIGN KEY (trip_id) REFERENCES trip(trip_id) ON DELETE RESTRICT,
    FOREIGN KEY (driver_id) REFERENCES driver(driver_id),
    FOREIGN KEY (bank_account_id) REFERENCES driver_bank_account(account_id) ON DELETE SET NULL
);

-- =====================================================
-- 5. Bảng bằng lái (dùng ENUM thay vì bảng license_type)
-- =====================================================

CREATE TABLE driver_license (
    license_id SERIAL PRIMARY KEY,
    driver_id INT NOT NULL,
    license_type license_type_enum NOT NULL,  -- 'B', 'C1', 'C', 'D1', 'D2', 'D'
    issue_date DATE NOT NULL,
    issue_place VARCHAR(100) NULL,
    expiry_date DATE NOT NULL,
    front_image_url VARCHAR(255) NULL,
    back_image_url VARCHAR(255) NULL,
    FOREIGN KEY (driver_id) REFERENCES driver(driver_id) ON DELETE CASCADE
);

-- =====================================================
-- 6. Bảng lịch sử, log, liên kết
-- =====================================================

-- Lịch sử vị trí tài xế
CREATE TABLE driver_location_history (
    location_id SERIAL PRIMARY KEY,
    driver_id INT NOT NULL,
    latitude DECIMAL(10,8) NOT NULL,
    longitude DECIMAL(11,8) NOT NULL,
    recorded_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (driver_id) REFERENCES driver(driver_id) ON DELETE CASCADE
);
CREATE INDEX idx_driver_location_time ON driver_location_history(driver_id, recorded_at);

-- Lịch sử tìm kiếm của khách hàng
CREATE TABLE search_history (
    search_id SERIAL PRIMARY KEY,
    customer_id INT NOT NULL,
    search_text VARCHAR(255) NOT NULL,
    searched_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (customer_id) REFERENCES customer(customer_id) ON DELETE CASCADE
);
CREATE INDEX idx_customer_search_time ON search_history(customer_id, searched_at);

-- Liên kết giữa tài khoản khách và tài xế (cùng 1 người)
CREATE TABLE user_link (
    customer_id INT NOT NULL,
    driver_id INT NOT NULL,
    PRIMARY KEY (customer_id, driver_id),
    FOREIGN KEY (customer_id) REFERENCES customer(customer_id) ON DELETE CASCADE,
    FOREIGN KEY (driver_id) REFERENCES driver(driver_id) ON DELETE CASCADE
);

-- Lịch sử đăng nhập
CREATE TABLE login_history (
    login_id SERIAL PRIMARY KEY,
    user_type user_type_enum NOT NULL,
    user_id INT NOT NULL,
    ip_address VARCHAR(45) NULL,
    login_time TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX idx_login_user ON login_history(user_type, user_id);

-- Log hành vi (audit)
CREATE TABLE audit_log (
    log_id SERIAL PRIMARY KEY,
    user_type user_type_enum NOT NULL,
    user_id INT NOT NULL,
    action VARCHAR(50) NOT NULL,
    metadata JSONB NULL,
    log_timestamp TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX idx_audit_user_action ON audit_log(user_type, user_id, action);
