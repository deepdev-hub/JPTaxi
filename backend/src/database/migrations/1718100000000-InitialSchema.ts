import { MigrationInterface, QueryRunner } from 'typeorm';

export class InitialSchema1718100000000 implements MigrationInterface {
  name = 'InitialSchema1718100000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TYPE gender_type AS ENUM ('Male', 'Female', 'Other');
      CREATE TYPE driver_status_type AS ENUM ('pending', 'approved', 'rejected', 'suspended');
      CREATE TYPE ride_request_status_type AS ENUM ('pending', 'searching', 'assigned', 'completed', 'failed');
      CREATE TYPE trip_status_type AS ENUM ('ongoing', 'completed', 'cancelled_by_admin');
      CREATE TYPE dispatch_status_type AS ENUM ('pending', 'accepted', 'rejected', 'timeout');
      CREATE TYPE payment_status_type AS ENUM ('pending', 'success', 'failed');
      CREATE TYPE payout_status_type AS ENUM ('pending', 'processed', 'failed');
      CREATE TYPE user_type_enum AS ENUM ('customer', 'driver', 'admin');
      CREATE TYPE license_type_enum AS ENUM ('B', 'C1', 'C', 'D1', 'D2', 'D');
      CREATE TYPE payment_method_enum AS ENUM ('VISA', 'MASTER', 'JCB', 'VNPAY');
      CREATE TYPE stored_payment_brand AS ENUM ('VISA', 'MASTER', 'JCB');
      CREATE TYPE vehicle_type_enum AS ENUM ('4', '7', '9');
      CREATE TYPE driver_japanese_level_enum AS ENUM ('N5', 'N4', 'N3', 'N2', 'N1', 'Native');
      CREATE TYPE message_sender_type AS ENUM ('customer', 'driver');
      CREATE TYPE saved_place_type AS ENUM ('home', 'work', 'favorite', 'custom');

      CREATE TABLE admin (
        admin_id SERIAL PRIMARY KEY,
        username VARCHAR(50) NOT NULL UNIQUE,
        password_hash VARCHAR(255) NOT NULL,
        role VARCHAR(20) NOT NULL DEFAULT 'admin',
        created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
      );

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
        avatar_url VARCHAR(255),
        created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
      );

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
        id_number VARCHAR(20),
        is_email_verified BOOLEAN NOT NULL DEFAULT FALSE,
        is_phone_verified BOOLEAN NOT NULL DEFAULT FALSE,
        status driver_status_type NOT NULL DEFAULT 'pending',
        approved_by INT REFERENCES admin(admin_id) ON DELETE SET NULL,
        approved_at TIMESTAMPTZ,
        created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
        avatar_url VARCHAR(255),
        driver_japanese_level driver_japanese_level_enum NOT NULL,
        is_online BOOLEAN NOT NULL DEFAULT FALSE,
        last_seen_at TIMESTAMPTZ,
        CONSTRAINT uq_driver_identity UNIQUE (id_number, nationality)
      );

      CREATE TABLE vehicle (
        vehicle_id SERIAL PRIMARY KEY,
        driver_id INT NOT NULL UNIQUE REFERENCES driver(driver_id) ON DELETE CASCADE,
        vehicle_type vehicle_type_enum NOT NULL,
        license_plate VARCHAR(20) NOT NULL UNIQUE,
        brand VARCHAR(50) NOT NULL,
        color VARCHAR(30) NOT NULL,
        manufacture_year INT NOT NULL CHECK (manufacture_year BETWEEN 1990 AND 2100),
        vehicle_photo_url VARCHAR(255),
        registration_paper_url VARCHAR(255)
      );

      CREATE TABLE driver_license (
        license_id SERIAL PRIMARY KEY,
        driver_id INT NOT NULL REFERENCES driver(driver_id) ON DELETE CASCADE,
        license_type license_type_enum NOT NULL,
        issue_date DATE NOT NULL,
        issue_place VARCHAR(100),
        expiry_date DATE NOT NULL,
        front_image_url VARCHAR(255),
        back_image_url VARCHAR(255)
      );

      CREATE TABLE driver_bank_account (
        account_id SERIAL PRIMARY KEY,
        driver_id INT NOT NULL UNIQUE REFERENCES driver(driver_id) ON DELETE CASCADE,
        bank_name VARCHAR(100) NOT NULL,
        account_number VARCHAR(30) NOT NULL,
        account_holder VARCHAR(100) NOT NULL
      );

      CREATE TABLE customer_saved_place (
        saved_place_id SERIAL PRIMARY KEY,
        customer_id INT NOT NULL REFERENCES customer(customer_id) ON DELETE CASCADE,
        type saved_place_type NOT NULL DEFAULT 'custom',
        label VARCHAR(60) NOT NULL,
        address VARCHAR(255) NOT NULL,
        latitude DECIMAL(10,8) NOT NULL,
        longitude DECIMAL(11,8) NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT uq_customer_saved_place_type UNIQUE (customer_id, type)
      );

      CREATE TABLE customer_notification_preference (
        customer_id INT PRIMARY KEY REFERENCES customer(customer_id) ON DELETE CASCADE,
        ride_updates BOOLEAN NOT NULL DEFAULT TRUE,
        email_notifications BOOLEAN NOT NULL DEFAULT TRUE,
        promotions BOOLEAN NOT NULL DEFAULT FALSE,
        updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE customer_payment_method (
        payment_method_id SERIAL PRIMARY KEY,
        customer_id INT NOT NULL REFERENCES customer(customer_id) ON DELETE CASCADE,
        brand stored_payment_brand NOT NULL,
        holder_name VARCHAR(100) NOT NULL,
        last_four CHAR(4) NOT NULL CHECK (last_four ~ '^[0-9]{4}$'),
        expiry_month SMALLINT NOT NULL CHECK (expiry_month BETWEEN 1 AND 12),
        expiry_year SMALLINT NOT NULL CHECK (expiry_year BETWEEN 2020 AND 2200),
        billing_address VARCHAR(255),
        provider_token VARCHAR(100) NOT NULL UNIQUE,
        is_default BOOLEAN NOT NULL DEFAULT FALSE,
        created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
      CREATE UNIQUE INDEX uq_customer_default_payment
        ON customer_payment_method(customer_id) WHERE is_default;

      CREATE TABLE pricing_rule (
        rule_id SERIAL PRIMARY KEY,
        start_km DECIMAL(8,2) NOT NULL CHECK (start_km >= 0),
        end_km DECIMAL(8,2),
        price_per_km_vnd DECIMAL(10,2) NOT NULL CHECK (price_per_km_vnd >= 0),
        is_base_fare BOOLEAN NOT NULL DEFAULT FALSE,
        effective_from DATE NOT NULL,
        priority INT NOT NULL,
        CHECK (end_km IS NULL OR end_km > start_km)
      );

      CREATE TABLE ride_request (
        request_id SERIAL PRIMARY KEY,
        customer_id INT NOT NULL REFERENCES customer(customer_id) ON DELETE RESTRICT,
        pickup_address VARCHAR(255) NOT NULL,
        pickup_lat DECIMAL(10,8) NOT NULL,
        pickup_lng DECIMAL(11,8) NOT NULL,
        dropoff_address VARCHAR(255) NOT NULL,
        dropoff_lat DECIMAL(10,8) NOT NULL,
        dropoff_lng DECIMAL(11,8) NOT NULL,
        vehicle_type vehicle_type_enum NOT NULL,
        actual_passenger_name VARCHAR(50),
        actual_passenger_phone VARCHAR(15),
        request_time TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
        status ride_request_status_type NOT NULL DEFAULT 'pending',
        note_to_driver VARCHAR(255),
        estimated_fare_vnd INT,
        estimated_fare_jpy INT,
        raw_fare_vnd INT
      );
      CREATE INDEX idx_ride_request_customer_status ON ride_request(customer_id, status);

      CREATE TABLE ride_request_dispatch (
        dispatch_id SERIAL PRIMARY KEY,
        request_id INT NOT NULL REFERENCES ride_request(request_id) ON DELETE CASCADE,
        driver_id INT NOT NULL REFERENCES driver(driver_id) ON DELETE CASCADE,
        attempt_number SMALLINT NOT NULL CHECK (attempt_number BETWEEN 1 AND 20),
        status dispatch_status_type NOT NULL DEFAULT 'pending',
        sent_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
        responded_at TIMESTAMPTZ,
        CONSTRAINT uq_dispatch_attempt UNIQUE (request_id, driver_id, attempt_number)
      );
      CREATE INDEX idx_dispatch_driver_status ON ride_request_dispatch(driver_id, status);

      CREATE TABLE trip (
        trip_id SERIAL PRIMARY KEY,
        request_id INT NOT NULL UNIQUE REFERENCES ride_request(request_id) ON DELETE RESTRICT,
        driver_id INT NOT NULL REFERENCES driver(driver_id) ON DELETE RESTRICT,
        start_time TIMESTAMPTZ NOT NULL,
        end_time TIMESTAMPTZ,
        payment_requested_at TIMESTAMPTZ,
        actual_distance_km DECIMAL(8,2) NOT NULL CHECK (actual_distance_km >= 0),
        exchange_rate_vnd_to_jpy DECIMAL(10,4) NOT NULL CHECK (exchange_rate_vnd_to_jpy > 0),
        final_fare_vnd INT NOT NULL CHECK (final_fare_vnd >= 0),
        final_fare_jpy INT NOT NULL CHECK (final_fare_jpy >= 0),
        raw_fare_vnd INT,
        status trip_status_type NOT NULL
      );
      CREATE INDEX idx_trip_driver_status ON trip(driver_id, status);

      CREATE TABLE payment_transaction (
        transaction_id SERIAL PRIMARY KEY,
        trip_id INT NOT NULL UNIQUE REFERENCES trip(trip_id) ON DELETE RESTRICT,
        payment_method payment_method_enum NOT NULL,
        payment_method_id INT REFERENCES customer_payment_method(payment_method_id) ON DELETE SET NULL,
        amount_vnd INT NOT NULL CHECK (amount_vnd >= 0),
        status payment_status_type NOT NULL,
        gateway_transaction_id VARCHAR(100),
        idempotency_key VARCHAR(100) NOT NULL UNIQUE,
        paid_at TIMESTAMPTZ
      );

      CREATE TABLE driver_payout (
        payout_id SERIAL PRIMARY KEY,
        trip_id INT NOT NULL UNIQUE REFERENCES trip(trip_id) ON DELETE RESTRICT,
        driver_id INT NOT NULL REFERENCES driver(driver_id) ON DELETE RESTRICT,
        gross_fare_vnd INT NOT NULL CHECK (gross_fare_vnd >= 0),
        commission_vnd INT NOT NULL CHECK (commission_vnd >= 0),
        amount_vnd INT NOT NULL CHECK (amount_vnd >= 0),
        status payout_status_type NOT NULL,
        bank_account_id INT REFERENCES driver_bank_account(account_id) ON DELETE SET NULL,
        processed_at TIMESTAMPTZ
      );

      CREATE TABLE rating (
        rating_id SERIAL PRIMARY KEY,
        trip_id INT NOT NULL UNIQUE REFERENCES trip(trip_id) ON DELETE CASCADE,
        customer_id INT NOT NULL REFERENCES customer(customer_id) ON DELETE RESTRICT,
        score NUMERIC(2,1) NOT NULL CHECK (score BETWEEN 0.5 AND 5 AND score * 2 = FLOOR(score * 2)),
        tags JSONB NOT NULL DEFAULT '[]'::jsonb,
        comment TEXT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE invoice (
        invoice_id SERIAL PRIMARY KEY,
        trip_id INT NOT NULL UNIQUE REFERENCES trip(trip_id) ON DELETE RESTRICT,
        invoice_number VARCHAR(40) NOT NULL UNIQUE,
        recipient_email VARCHAR(255),
        payload JSONB NOT NULL,
        issued_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
        emailed_at TIMESTAMPTZ
      );

      CREATE TABLE driver_location_history (
        location_id SERIAL PRIMARY KEY,
        driver_id INT NOT NULL REFERENCES driver(driver_id) ON DELETE CASCADE,
        latitude DECIMAL(10,8) NOT NULL,
        longitude DECIMAL(11,8) NOT NULL,
        recorded_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
      CREATE INDEX idx_driver_location_time ON driver_location_history(driver_id, recorded_at DESC);

      CREATE TABLE search_history (
        search_id SERIAL PRIMARY KEY,
        customer_id INT NOT NULL REFERENCES customer(customer_id) ON DELETE CASCADE,
        search_text VARCHAR(255) NOT NULL,
        metadata JSONB,
        searched_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
      CREATE INDEX idx_customer_search_time ON search_history(customer_id, searched_at DESC);

      CREATE TABLE login_history (
        login_id SERIAL PRIMARY KEY,
        user_type user_type_enum NOT NULL,
        user_id INT NOT NULL,
        ip_address VARCHAR(45),
        login_time TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
      CREATE INDEX idx_login_user ON login_history(user_type, user_id, login_time DESC);

      CREATE TABLE audit_log (
        log_id SERIAL PRIMARY KEY,
        user_type user_type_enum NOT NULL,
        user_id INT NOT NULL,
        action VARCHAR(50) NOT NULL,
        metadata JSONB,
        log_timestamp TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE password_reset_token (
        reset_token_id SERIAL PRIMARY KEY,
        user_type user_type_enum NOT NULL,
        user_id INT NOT NULL,
        token_hash VARCHAR(64) NOT NULL UNIQUE,
        expires_at TIMESTAMPTZ NOT NULL,
        used_at TIMESTAMPTZ,
        created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
      CREATE INDEX idx_password_reset_lookup
        ON password_reset_token(user_type, user_id, expires_at DESC);

      CREATE TABLE conversation (
        conversation_id SERIAL PRIMARY KEY,
        customer_id INT NOT NULL REFERENCES customer(customer_id) ON DELETE CASCADE,
        driver_id INT NOT NULL REFERENCES driver(driver_id) ON DELETE CASCADE,
        request_id INT REFERENCES ride_request(request_id) ON DELETE SET NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT uq_conversation_participants UNIQUE (customer_id, driver_id)
      );

      CREATE TABLE message (
        message_id SERIAL PRIMARY KEY,
        conversation_id INT NOT NULL REFERENCES conversation(conversation_id) ON DELETE CASCADE,
        sender_type message_sender_type NOT NULL,
        sender_id INT NOT NULL,
        body TEXT NOT NULL CHECK (char_length(trim(body)) > 0),
        sent_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
        read_at TIMESTAMPTZ
      );
      CREATE INDEX idx_message_conversation_sent ON message(conversation_id, sent_at DESC);

      CREATE TABLE user_link (
        customer_id INT NOT NULL REFERENCES customer(customer_id) ON DELETE CASCADE,
        driver_id INT NOT NULL REFERENCES driver(driver_id) ON DELETE CASCADE,
        PRIMARY KEY (customer_id, driver_id)
      );
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DROP TABLE IF EXISTS user_link, message, conversation, password_reset_token,
        audit_log, login_history, search_history, driver_location_history, invoice,
        rating, driver_payout, payment_transaction, trip, ride_request_dispatch,
        ride_request, pricing_rule, customer_payment_method,
        customer_notification_preference, customer_saved_place, driver_bank_account,
        driver_license, vehicle, driver, customer, admin CASCADE;
      DROP TYPE IF EXISTS saved_place_type, message_sender_type,
        driver_japanese_level_enum, vehicle_type_enum, stored_payment_brand,
        payment_method_enum, license_type_enum, user_type_enum, payout_status_type,
        payment_status_type, dispatch_status_type, trip_status_type,
        ride_request_status_type, driver_status_type, gender_type CASCADE;
    `);
  }
}
