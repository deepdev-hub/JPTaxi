-- Đồng bộ schema với RideRequest entity (estimated_fare_*)
ALTER TABLE ride_request
  ADD COLUMN IF NOT EXISTS estimated_fare_vnd INT NULL,
  ADD COLUMN IF NOT EXISTS estimated_fare_jpy INT NULL,
  ADD COLUMN IF NOT EXISTS raw_fare_vnd INT NULL;
