import * as bcrypt from 'bcryptjs';
import dataSource from './data-source';

async function seed(): Promise<void> {
  await dataSource.initialize();
  const runner = dataSource.createQueryRunner();
  await runner.connect();
  await runner.startTransaction();

  try {
    await runner.query(`
      TRUNCATE TABLE message, conversation, password_reset_token, audit_log,
        login_history, search_history, driver_location_history, invoice, rating,
        driver_payout, payment_transaction, trip, ride_request_dispatch,
        ride_request, pricing_rule, customer_payment_method,
        customer_notification_preference, customer_saved_place,
        driver_bank_account, driver_license, vehicle, user_link, driver,
        customer, admin RESTART IDENTITY CASCADE
    `);

    const adminHash = await bcrypt.hash('admin123', 10);
    const userHash = await bcrypt.hash('password123', 10);

    await runner.query(
      `INSERT INTO admin (username, password_hash, role) VALUES ($1, $2, 'admin')`,
      ['admin', adminHash],
    );
    await runner.query(
      `INSERT INTO customer
        (last_name, first_name, gender, birth_date, phone, email, password_hash,
         is_email_verified, is_phone_verified)
       VALUES
        ('Nguyen', 'An', 'Male', '1995-04-12', '0901000001', 'customer@jptaxi.local', $1, TRUE, TRUE),
        ('Tran', 'Mai', 'Female', '1997-09-21', '0901000002', 'customer2@jptaxi.local', $1, TRUE, TRUE)`,
      [userHash],
    );
    await runner.query(
      `INSERT INTO driver
        (last_name, first_name, gender, birth_date, phone, email, password_hash,
         nationality, id_number, is_email_verified, is_phone_verified, status,
         approved_by, approved_at, driver_japanese_level, is_online, last_seen_at)
       VALUES
        ('Le', 'Hiro', 'Male', '1990-02-18', '0912000001', 'driver@jptaxi.local', $1,
         'Vietnam', 'DRV-0001', TRUE, TRUE, 'approved', 1, NOW(), 'N2', TRUE, NOW()),
        ('Pham', 'Yuki', 'Female', '1992-07-08', '0912000002', 'driver2@jptaxi.local', $1,
         'Vietnam', 'DRV-0002', TRUE, TRUE, 'approved', 1, NOW(), 'N1', TRUE, NOW()),
        ('Do', 'Ken', 'Male', '1994-11-03', '0912000003', 'driver.pending@jptaxi.local', $1,
         'Vietnam', 'DRV-0003', TRUE, TRUE, 'pending', NULL, NULL, 'N3', FALSE, NOW())`,
      [userHash],
    );

    await runner.query(`
      INSERT INTO vehicle
        (driver_id, vehicle_type, license_plate, brand, color, manufacture_year)
      VALUES
        (1, '4', '30A-100.01', 'Toyota Vios', 'Black', 2023),
        (2, '7', '30A-100.02', 'Toyota Innova', 'White', 2022),
        (3, '4', '30A-100.03', 'Honda City', 'Silver', 2024);

      INSERT INTO driver_license
        (driver_id, license_type, issue_date, issue_place, expiry_date)
      VALUES
        (1, 'B', '2020-01-10', 'Hanoi', '2030-01-10'),
        (2, 'B', '2019-05-20', 'Hanoi', '2029-05-20'),
        (3, 'B', '2022-03-15', 'Hanoi', '2032-03-15');

      INSERT INTO driver_bank_account
        (driver_id, bank_name, account_number, account_holder)
      VALUES
        (1, 'Vietcombank', '1000000001', 'LE HIRO'),
        (2, 'Techcombank', '1000000002', 'PHAM YUKI');

      INSERT INTO customer_saved_place
        (customer_id, type, label, address, latitude, longitude)
      VALUES
        (1, 'home', 'Home', 'Hoan Kiem, Hanoi', 21.028511, 105.852000),
        (1, 'work', 'Work', 'Keangnam Landmark 72, Hanoi', 21.016700, 105.784700);

      INSERT INTO customer_notification_preference
        (customer_id, ride_updates, email_notifications, promotions)
      VALUES (1, TRUE, TRUE, FALSE), (2, TRUE, FALSE, FALSE);

      INSERT INTO search_history (customer_id, search_text, metadata, searched_at)
      VALUES (
        1,
        'Keangnam Landmark 72',
        '{"name":"Keangnam Landmark 72","address":"Keangnam Landmark 72, Hanoi","latitude":21.0167,"longitude":105.7847}'::jsonb,
        NOW() - INTERVAL '3 day'
      );

      INSERT INTO customer_payment_method
        (customer_id, brand, holder_name, last_four, expiry_month, expiry_year,
         billing_address, provider_token, is_default)
      VALUES
        (1, 'VISA', 'NGUYEN AN', '4821', 12, 2029, 'Hoan Kiem, Hanoi',
         'local_pm_customer_1', TRUE);

      INSERT INTO pricing_rule
        (start_km, end_km, price_per_km_vnd, is_base_fare, effective_from, priority)
      VALUES
        (0, 1.5, 20000, TRUE, '2026-01-01', 1),
        (1.5, 10, 13500, FALSE, '2026-01-01', 2),
        (10, NULL, 11000, FALSE, '2026-01-01', 3);

      INSERT INTO driver_location_history (driver_id, latitude, longitude, recorded_at)
      VALUES
        (1, 21.028800, 105.851700, NOW()),
        (2, 21.058500, 105.819000, NOW());

      INSERT INTO ride_request
        (customer_id, pickup_address, pickup_lat, pickup_lng, dropoff_address,
         dropoff_lat, dropoff_lng, vehicle_type, request_time, status,
         estimated_fare_vnd, estimated_fare_jpy, raw_fare_vnd)
      VALUES
        (1, 'Hoan Kiem Lake, Hanoi', 21.028511, 105.852000,
         'Keangnam Landmark 72, Hanoi', 21.016700, 105.784700, '4',
         NOW() - INTERVAL '2 day', 'completed', 98000, 588, 90000),
        (2, 'West Lake, Hanoi', 21.058900, 105.819500,
         'Noi Bai International Airport', 21.218700, 105.804200, '7',
         NOW(), 'pending', 320000, 1920, 300000);

      INSERT INTO ride_request_dispatch
        (request_id, driver_id, attempt_number, status, responded_at)
      VALUES
        (1, 1, 1, 'accepted', NOW() - INTERVAL '2 day'),
        (2, 2, 1, 'pending', NULL);

      INSERT INTO trip
        (request_id, driver_id, start_time, end_time, actual_distance_km,
         exchange_rate_vnd_to_jpy, final_fare_vnd, final_fare_jpy,
         raw_fare_vnd, status)
      VALUES
        (1, 1, NOW() - INTERVAL '2 day', NOW() - INTERVAL '2 day' + INTERVAL '25 minute',
         8.20, 166.6667, 98000, 588, 90000, 'completed');

      INSERT INTO payment_transaction
        (trip_id, payment_method, payment_method_id, amount_vnd, status,
         gateway_transaction_id, idempotency_key, paid_at)
      VALUES
        (1, 'VISA', 1, 98000, 'success', 'LOCAL-SEED-0001', 'seed-trip-1', NOW() - INTERVAL '2 day');

      INSERT INTO driver_payout
        (trip_id, driver_id, gross_fare_vnd, commission_vnd, amount_vnd,
         status, bank_account_id, processed_at)
      VALUES
        (1, 1, 98000, 19600, 78400, 'processed', 1, NOW() - INTERVAL '2 day');

      INSERT INTO rating (trip_id, customer_id, score, tags, comment)
      VALUES (1, 1, 4.5, '["safe_driving","polite"]'::jsonb, 'Safe and polite driver.');

      INSERT INTO invoice
        (trip_id, invoice_number, recipient_email, payload, issued_at)
      VALUES
        (1, 'JPT-2026-000001', 'customer@jptaxi.local',
         jsonb_build_object(
           'tripId', 1,
           'invoiceNumber', 'JPT-2026-000001',
           'documentType', 'vat_invoice',
           'title', 'Electronic taxi receipt',
           'issued', TRUE,
           'issuedAt', to_jsonb(NOW() - INTERVAL '2 day'),
           'seller', jsonb_build_object(
             'legalName', 'JP Taxi',
             'address', 'Hanoi, Vietnam',
             'taxCode', '0109999999'
           ),
           'buyer', jsonb_build_object(
             'name', 'Nguyen An',
             'email', 'customer@jptaxi.local'
           ),
           'driver', jsonb_build_object(
             'name', 'Le Hiro',
             'vehicle', 'Toyota Vios',
             'licensePlate', '30A-100.01'
           ),
           'trip', jsonb_build_object(
             'pickupAddress', 'Hoan Kiem Lake, Hanoi',
             'dropoffAddress', 'Keangnam Landmark 72, Hanoi',
             'startTime', to_jsonb(NOW() - INTERVAL '2 day'),
             'endTime', to_jsonb(NOW() - INTERVAL '2 day' + INTERVAL '25 minute'),
             'distanceKm', 8.20
           ),
           'payment', jsonb_build_object(
             'method', 'VISA',
             'transactionId', 'LOCAL-SEED-0001',
             'paidAt', to_jsonb(NOW() - INTERVAL '2 day')
           ),
           'lineItems', jsonb_build_array(
             jsonb_build_object(
               'code', 'TAXI_FARE',
               'label', 'Taxi fare (8.2 km)',
               'amountJpy', 540,
               'amountVnd', 90000
             ),
             jsonb_build_object(
               'code', 'SERVICE_FEE',
               'label', 'Booking and dispatch fee',
               'amountJpy', 48,
               'amountVnd', 8000
             )
           ),
           'amounts', jsonb_build_object(
             'jpy', jsonb_build_object(
               'vatRatePercent', 10,
               'subtotalExclTax', 535,
               'vatAmount', 53,
               'totalInclTax', 588
             ),
             'vnd', jsonb_build_object(
               'vatRatePercent', 10,
               'subtotalExclTax', 89091,
               'vatAmount', 8909,
               'totalInclTax', 98000
             ),
             'exchangeRateVndToJpy', 166.6667
           )
         ),
         NOW() - INTERVAL '2 day');

      INSERT INTO conversation (customer_id, driver_id, request_id)
      VALUES (1, 1, 1);

      INSERT INTO message (conversation_id, sender_type, sender_id, body, sent_at)
      VALUES
        (1, 'customer', 1, 'I am waiting at the pickup point.', NOW() - INTERVAL '2 day'),
        (1, 'driver', 1, 'I will arrive in five minutes.', NOW() - INTERVAL '2 day' + INTERVAL '1 minute');
    `);

    await runner.commitTransaction();
    console.log('Seed complete.');
  } catch (error) {
    await runner.rollbackTransaction();
    throw error;
  } finally {
    await runner.release();
    await dataSource.destroy();
  }
}

seed().catch((error) => {
  console.error(error);
  process.exit(1);
});
