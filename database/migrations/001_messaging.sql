-- Hội thoại & tin nhắn giữa khách hàng và tài xế
-- Chạy: psql -d JPTaxi -f database/migrations/001_messaging.sql

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_type
    WHERE typname = 'message_sender_type'
  ) THEN
    CREATE TYPE message_sender_type AS ENUM ('customer', 'driver');
  END IF;
END$$;

CREATE TABLE IF NOT EXISTS conversation (
  conversation_id SERIAL PRIMARY KEY,
  customer_id INT NOT NULL,
  driver_id INT NOT NULL,
  request_id INT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NULL,
  FOREIGN KEY (customer_id) REFERENCES customer(customer_id) ON DELETE CASCADE,
  FOREIGN KEY (driver_id) REFERENCES driver(driver_id) ON DELETE CASCADE,
  FOREIGN KEY (request_id) REFERENCES ride_request(request_id) ON DELETE SET NULL,
  UNIQUE (customer_id, driver_id)
);

CREATE TABLE IF NOT EXISTS message (
  message_id SERIAL PRIMARY KEY,
  conversation_id INT NOT NULL,
  sender_type message_sender_type NOT NULL,
  sender_id INT NOT NULL,
  body TEXT NOT NULL,
  sent_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  read_at TIMESTAMPTZ NULL,
  FOREIGN KEY (conversation_id) REFERENCES conversation(conversation_id) ON DELETE CASCADE,
  CHECK (char_length(body) >= 1)
);

CREATE INDEX IF NOT EXISTS idx_message_conversation_sent
  ON message(conversation_id, sent_at DESC);
CREATE INDEX IF NOT EXISTS idx_conversation_customer
  ON conversation(customer_id, updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_conversation_driver
  ON conversation(driver_id, updated_at DESC);
