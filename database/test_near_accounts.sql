-- Test accounts located within 2km of each other.
-- Password for both accounts: password123

INSERT INTO customer (
  last_name, first_name, gender, birth_date, phone, email, password_hash,
  is_email_verified, is_phone_verified
) VALUES (
  'Near', 'Customer', 'Other', '1990-01-01', '0399999001', 'nearcustomer@jptaxi.dev',
  '$2a$10$ok4KGT8OL/XYoc02v0sbeuCI5KJx179z91xxYT8ncmR3pkDM62mY.',
  TRUE, TRUE
)
ON CONFLICT (email) DO UPDATE SET
  password_hash = EXCLUDED.password_hash,
  phone = EXCLUDED.phone,
  updated_at = CURRENT_TIMESTAMP;

INSERT INTO driver (
  last_name, first_name, gender, birth_date, phone, email, password_hash,
  nationality, id_number, is_email_verified, is_phone_verified, status,
  approved_at, driver_japanese_level
) VALUES (
  'Near', 'Driver', 'Other', '1988-01-01', '0799999001', 'neardriver@jptaxi.dev',
  '$2a$10$ok4KGT8OL/XYoc02v0sbeuCI5KJx179z91xxYT8ncmR3pkDM62mY.',
  'Vietnam', 'TEST-NEAR-001', TRUE, TRUE, 'approved',
  CURRENT_TIMESTAMP, 'N2'
)
ON CONFLICT (email) DO UPDATE SET
  password_hash = EXCLUDED.password_hash,
  phone = EXCLUDED.phone,
  status = 'approved',
  approved_at = CURRENT_TIMESTAMP,
  updated_at = CURRENT_TIMESTAMP;

INSERT INTO vehicle (
  driver_id, vehicle_type, license_plate, brand, color, manufacture_year
)
SELECT driver_id, '4', 'TEST-2KM-01', 'Toyota Vios', 'White', 2024
FROM driver
WHERE email = 'neardriver@jptaxi.dev'
ON CONFLICT (driver_id) DO UPDATE SET
  vehicle_type = EXCLUDED.vehicle_type,
  license_plate = EXCLUDED.license_plate,
  brand = EXCLUDED.brand,
  color = EXCLUDED.color,
  manufacture_year = EXCLUDED.manufacture_year;

DELETE FROM driver_license
WHERE driver_id = (SELECT driver_id FROM driver WHERE email = 'neardriver@jptaxi.dev');

INSERT INTO driver_license (
  driver_id, license_type, issue_date, issue_place, expiry_date
)
SELECT driver_id, 'B', CURRENT_DATE, 'TEST-LICENSE-001', CURRENT_DATE + INTERVAL '5 years'
FROM driver
WHERE email = 'neardriver@jptaxi.dev';

INSERT INTO driver_location_history (
  driver_id, latitude, longitude, recorded_at
)
SELECT driver_id, 21.02880000, 105.85210000, CURRENT_TIMESTAMP
FROM driver
WHERE email = 'neardriver@jptaxi.dev';
