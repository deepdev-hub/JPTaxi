#!/usr/bin/env python3
"""Generate DB_data.sql from DB.sql schema (~100 rows per table)."""
from __future__ import annotations

import json
import random
from datetime import date, datetime, timedelta, timezone
from pathlib import Path

ROWS = 100
OUT = Path(__file__).parent / "DB_data.sql"

# bcrypt hashes (dev)
HASH_ADMIN = "$2a$10$lCQpNF9iSt1J2BxYrjv.1.ZSnl7iTnazMo3kXmwCSKBulPEwtQOMi"  # admin123
HASH_MOD = "$2a$10$dOqgeeFpW7cWlVfmiyfJVeWz3ItokJt93ZvWaaSIDcrd0tEKpxcLS"  # mod123
HASH_USER = "$2a$10$Bf2ID3957Jxa6J9/FWuyROo1THOJWuQdQ5i12aAW6XSQHTrlO0xIS"  # password123

GENDERS = ("Male", "Female", "Other")
DRIVER_STATUS = ("pending", "approved", "rejected", "suspended")
RIDE_STATUS = ("pending", "searching", "assigned", "completed", "failed")
TRIP_STATUS = ("ongoing", "completed", "cancelled_by_admin")
DISPATCH_STATUS = ("pending", "accepted", "rejected", "timeout")
PAYMENT_STATUS = ("pending", "success", "failed")
PAYOUT_STATUS = ("pending", "processed", "failed")
LICENSE_TYPES = ("B", "C1", "C", "D1", "D2", "D")
PAYMENT_METHODS = ("VISA", "MASTER", "JCB", "VNPAY")
VEHICLE_TYPES = ("4", "7", "9")
JP_LEVELS = ("N5", "N4", "N3", "N2", "N1", "Native")
USER_TYPES = ("customer", "driver")

LAST_JP = ("佐藤", "鈴木", "高橋", "田中", "渡辺", "伊藤", "山本", "中村", "小林", "加藤")
FIRST_JP = ("太郎", "花子", "健一", "美咲", "翔太", "結衣", "陽介", "さくら", "大輔", "愛")
LAST_VN = ("Nguyễn", "Trần", "Lê", "Phạm", "Hoàng", "Vũ", "Đặng", "Bùi", "Đỗ", "Hà")
FIRST_VN = ("An", "Bình", "Chi", "Dũng", "Hà", "Lan", "Minh", "Nam", "Phương", "Quân")

HN_PLACES = (
    ("Hồ Gươm, Hoàn Kiếm", 21.028511, 105.852000),
    ("Lotte Center Hanoi", 21.028900, 105.812000),
    ("Nội Bài Airport", 21.221200, 105.807100),
    ("West Lake", 21.058900, 105.819500),
    ("Hanoi Opera House", 21.024500, 105.855800),
    ("Japanese Embassy", 21.027000, 105.829000),
    ("Keangnam Landmark", 21.016700, 105.784700),
    ("Times City", 20.996500, 105.869200),
    ("Royal City", 21.003400, 105.815600),
    ("Cầu Giấy District", 21.036800, 105.789500),
)

BANKS = ("Vietcombank", "BIDV", "Techcombank", "Agribank", "MB Bank", "ACB")
BRANDS = ("Toyota", "Honda", "Hyundai", "Kia", "Mitsubishi", "Mazda")
COLORS = ("White", "Black", "Silver", "Blue", "Red", "Gray")
SEARCH_QUERIES = (
    "ホテル", "空港", "日本大使館", "West Lake", "Opera House",
    "Lotte Center", "駅", "病院", "スーパー", "レストラン",
)

random.seed(42)


def esc(s: str) -> str:
    return s.replace("'", "''")


def sql_val(v) -> str:
    if v is None:
        return "NULL"
    if isinstance(v, bool):
        return "TRUE" if v else "FALSE"
    if isinstance(v, (int, float)) and not isinstance(v, bool):
        return str(v)
    if isinstance(v, date) and not isinstance(v, datetime):
        return f"'{v.isoformat()}'"
    if isinstance(v, datetime):
        if v.tzinfo:
            return f"'{v.isoformat().replace('+00:00', '+00')}'"
        return f"'{v.isoformat()}'"
    if isinstance(v, dict):
        return f"'{esc(json.dumps(v, ensure_ascii=False))}'::jsonb"
    return f"'{esc(str(v))}'"


def phone_unique(i: int, prefix: str = "09") -> str:
    return f"{prefix}{i:08d}"[:10]


def main() -> None:
    lines: list[str] = [
        "-- JP Taxi seed data (~100 rows per table, generated from DB.sql schema)",
        "SET client_encoding TO 'UTF8';",
        "",
    ]

    # --- admin (100) ---
    lines.append("-- admin")
    for i in range(1, ROWS + 1):
        role = "super" if i == 1 else ("mod" if i <= 5 else "support")
        uname = "admin1" if i == 1 else (f"mod{i - 1}" if i <= 5 else f"admin{i}")
        if i == 1:
            h = HASH_ADMIN
        elif i <= 5:
            # mod1-mod4 dùng cùng mật khẩu dev mod123
            h = HASH_MOD
        else:
            h = HASH_USER
        lines.append(
            f"INSERT INTO admin (username, password_hash, role) VALUES "
            f"({sql_val(uname)}, {sql_val(h)}, {sql_val(role)});"
        )
    lines.append("")

    # --- customer (100) ---
    lines.append("-- customer")
    for i in range(1, ROWS + 1):
        if i % 2 == 0:
            ln, fn = random.choice(LAST_JP), random.choice(FIRST_JP)
        else:
            ln, fn = random.choice(LAST_VN), random.choice(FIRST_VN)
        bd = date(1985, 1, 1) + timedelta(days=random.randint(0, 9000))
        email = f"customer{i}@jptaxi.dev"
        lines.append(
            f"INSERT INTO customer (last_name, first_name, gender, birth_date, phone, email, "
            f"password_hash, is_email_verified, is_phone_verified) VALUES "
            f"({sql_val(ln)}, {sql_val(fn)}, {sql_val(random.choice(GENDERS))}, {sql_val(bd)}, "
            f"{sql_val(phone_unique(i, '03'))}, {sql_val(email)}, {sql_val(HASH_USER)}, "
            f"{sql_val(i % 3 != 0)}, {sql_val(i % 4 != 0)});"
        )
    lines.append("")

    # --- driver (100) ---
    lines.append("-- driver")
    approved_ids: list[int] = []
    for i in range(1, ROWS + 1):
        if i % 2 == 0:
            ln, fn = random.choice(LAST_JP), random.choice(FIRST_JP)
            nat = "Japan"
            id_num = f"JP{i:06d}"
        else:
            ln, fn = random.choice(LAST_VN), random.choice(FIRST_VN)
            nat = "Vietnam"
            id_num = f"{random.randint(100000000, 999999999)}"
        bd = date(1980, 1, 1) + timedelta(days=random.randint(0, 12000))
        if i <= 70:
            status = "approved"
            approved_ids.append(i)
            appr_by = random.randint(1, 5)
            appr_at = datetime(2026, 1, 15, tzinfo=timezone.utc) + timedelta(days=i)
        elif i <= 85:
            status = "pending"
            appr_by, appr_at = None, None
        elif i <= 95:
            status = "rejected"
            appr_by, appr_at = None, None
        else:
            status = "suspended"
            appr_by = random.randint(1, 5)
            appr_at = datetime(2026, 3, 1, tzinfo=timezone.utc)

        email = f"driver{i}@jptaxi.dev"
        lines.append(
            f"INSERT INTO driver (last_name, first_name, gender, birth_date, phone, email, "
            f"password_hash, nationality, id_number, is_email_verified, is_phone_verified, "
            f"status, approved_by, approved_at, driver_japanese_level) VALUES "
            f"({sql_val(ln)}, {sql_val(fn)}, {sql_val(random.choice(GENDERS))}, {sql_val(bd)}, "
            f"{sql_val(phone_unique(i, '07'))}, {sql_val(email)}, {sql_val(HASH_USER)}, "
            f"{sql_val(nat)}, {sql_val(id_num)}, TRUE, TRUE, {sql_val(status)}, "
            f"{sql_val(appr_by)}, {sql_val(appr_at)}, {sql_val(random.choice(JP_LEVELS))});"
        )
    lines.append("")

    # --- vehicle (100, drivers 1-100) ---
    lines.append("-- vehicle")
    plates_used: set[str] = set()
    for i in range(1, ROWS + 1):
        plate = f"{30 + (i % 50)}A-{100 + i}.{i % 100:02d}"
        while plate in plates_used:
            plate = f"{30 + (i % 50)}B-{200 + i}.{i % 100:02d}"
        plates_used.add(plate)
        lines.append(
            f"INSERT INTO vehicle (driver_id, vehicle_type, license_plate, brand, color, manufacture_year) VALUES "
            f"({i}, {sql_val(random.choice(VEHICLE_TYPES))}, {sql_val(plate)}, "
            f"{sql_val(random.choice(BRANDS))}, {sql_val(random.choice(COLORS))}, "
            f"{random.randint(2015, 2025)});"
        )
    lines.append("")

    # --- pricing_rule (100) ---
    lines.append("-- pricing_rule")
    effective_from = "2025-01-01"
    for idx in range(ROWS):
        start_km = idx * 2
        end_km = (idx + 1) * 2 if idx < ROWS - 1 else None
        # giá mỗi km giảm dần, giới hạn khoảng 10,000
        price_per_km = max(10000, int(26000 - idx * 120))
        is_base_fare = idx == 0
        priority = idx + 1
        lines.append(
            "INSERT INTO pricing_rule (start_km, end_km, price_per_km_vnd, is_base_fare, effective_from, priority) VALUES "
            f"({start_km}, {('NULL' if end_km is None else end_km)}, {price_per_km}, {sql_val(is_base_fare)}, {sql_val(effective_from)}, {priority});"
        )
    lines.append("")

    # --- driver_license (100) ---
    lines.append("-- driver_license")
    for i in range(1, ROWS + 1):
        issue = date(2018, 1, 1) + timedelta(days=random.randint(0, 2000))
        expiry = issue + timedelta(days=365 * 10)
        lines.append(
            f"INSERT INTO driver_license (driver_id, license_type, issue_date, issue_place, expiry_date) VALUES "
            f"({i}, {sql_val(random.choice(LICENSE_TYPES))}, {sql_val(issue)}, "
            f"{sql_val('Hà Nội')}, {sql_val(expiry)});"
        )
    lines.append("")

    # --- driver_bank_account (100) ---
    lines.append("-- driver_bank_account")
    for i in range(1, ROWS + 1):
        d = i
        lines.append(
            f"INSERT INTO driver_bank_account (driver_id, bank_name, account_number, account_holder) VALUES "
            f"({d}, {sql_val(random.choice(BANKS))}, {sql_val(str(1000000000 + i))}, "
            f"{sql_val(f'Driver {i}')});"
        )
    lines.append("")

    # --- ride_request (100) ---
    lines.append("-- ride_request")
    completed_request_ids: list[int] = []
    for i in range(1, ROWS + 1):
        cust = ((i - 1) % ROWS) + 1
        p = HN_PLACES[i % len(HN_PLACES)]
        d = HN_PLACES[(i + 3) % len(HN_PLACES)]
        if i <= 60:
            st = "completed"
            completed_request_ids.append(i)
        elif i <= 75:
            st = "assigned"
        elif i <= 85:
            st = "searching"
        elif i <= 92:
            st = "pending"
        else:
            st = "failed"
        proxy = (f"Passenger {i}", phone_unique(i, "08")) if i % 5 == 0 else (None, None)
        rt = datetime(2026, 4, 1, tzinfo=timezone.utc) + timedelta(hours=i * 2)
        lines.append(
            f"INSERT INTO ride_request (customer_id, pickup_address, pickup_lat, pickup_lng, "
            f"dropoff_address, dropoff_lat, dropoff_lng, vehicle_type, actual_passenger_name, "
            f"actual_passenger_phone, request_time, status, note_to_driver) VALUES "
            f"({cust}, {sql_val(p[0])}, {p[1]}, {p[2]}, {sql_val(d[0])}, {d[1]}, {d[2]}, "
            f"{sql_val(random.choice(VEHICLE_TYPES))}, {sql_val(proxy[0])}, {sql_val(proxy[1])}, "
            f"{sql_val(rt)}, {sql_val(st)}, {sql_val('よろしくお願いします' if i % 7 == 0 else None)});"
        )
    lines.append("")

    # --- ride_request_dispatch (100) ---
    lines.append("-- ride_request_dispatch")
    for i in range(1, ROWS + 1):
        req = i
        drv = ((i * 7) % 70) + 1  # approved drivers 1-70
        st = "accepted" if i <= 60 else random.choice(DISPATCH_STATUS)
        sent = datetime(2026, 4, 1, 1, tzinfo=timezone.utc) + timedelta(hours=i)
        resp = sent + timedelta(minutes=2) if st == "accepted" else None
        lines.append(
            f"INSERT INTO ride_request_dispatch (request_id, driver_id, attempt_number, status, sent_at, responded_at) VALUES "
            f"({req}, {drv}, 1, {sql_val(st)}, {sql_val(sent)}, {sql_val(resp)});"
        )
    lines.append("")

    # --- trip (100, request_id 1-100 unique) ---
    lines.append("-- trip")
    trip_ids_completed: list[int] = []
    for i in range(1, ROWS + 1):
        drv = ((i * 7) % 70) + 1
        dist = round(random.uniform(2.5, 35.0), 2)
        rate = 0.0062
        fare_vnd = int(dist * 13000 + 26000)
        fare_jpy = int(fare_vnd * rate)
        start = datetime(2026, 4, 2, tzinfo=timezone.utc) + timedelta(hours=i)
        if i <= 60:
            st = "completed"
            end = start + timedelta(minutes=int(dist * 3))
            trip_ids_completed.append(i)
        elif i <= 75:
            st = "ongoing"
            end = None
        else:
            st = "cancelled_by_admin"
            end = start + timedelta(minutes=5)
        lines.append(
            f"INSERT INTO trip (request_id, driver_id, start_time, end_time, actual_distance_km, "
            f"exchange_rate_vnd_to_jpy, final_fare_vnd, final_fare_jpy, raw_fare_vnd, status) VALUES "
            f"({i}, {drv}, {sql_val(start)}, {sql_val(end)}, {dist}, {rate}, {fare_vnd}, {fare_jpy}, "
            f"{fare_vnd}, {sql_val(st)});"
        )
    lines.append("")

    # --- rating (100, for trips 1-100) ---
    lines.append("-- rating")
    for i in range(1, ROWS + 1):
        cust = ((i - 1) % ROWS) + 1
        score = random.randint(3, 5) if i <= 80 else random.randint(1, 5)
        lines.append(
            f"INSERT INTO rating (trip_id, customer_id, score, comment) VALUES "
            f"({i}, {cust}, {score}, {sql_val('とても丁寧でした' if score >= 4 else '普通でした')});"
        )
    lines.append("")

    # --- payment_transaction (100) ---
    lines.append("-- payment_transaction")
    for i in range(1, ROWS + 1):
        amt = 50000 + i * 1000
        if i <= 70:
            st, paid = "success", datetime(2026, 4, 3, tzinfo=timezone.utc) + timedelta(hours=i)
        elif i <= 85:
            st, paid = "pending", None
        else:
            st, paid = "failed", None
        lines.append(
            f"INSERT INTO payment_transaction (trip_id, payment_method, amount_vnd, status, "
            f"gateway_transaction_id, paid_at) VALUES "
            f"({i}, {sql_val(random.choice(PAYMENT_METHODS))}, {amt}, {sql_val(st)}, "
            f"{sql_val(f'GW-{i:08d}')}, {sql_val(paid)});"
        )
    lines.append("")

    # --- driver_payout (100) ---
    lines.append("-- driver_payout")
    for i in range(1, ROWS + 1):
        drv = ((i * 7) % 70) + 1
        amt = int((50000 + i * 1000) * 0.85)
        if i <= 65:
            st, proc = "processed", datetime(2026, 4, 5, tzinfo=timezone.utc) + timedelta(hours=i)
        elif i <= 85:
            st, proc = "pending", None
        else:
            st, proc = "failed", None
        lines.append(
            f"INSERT INTO driver_payout (trip_id, driver_id, amount_vnd, status, bank_account_id, processed_at) VALUES "
            f"({i}, {drv}, {amt}, {sql_val(st)}, {drv}, {sql_val(proc)});"
        )
    lines.append("")

    # --- driver_location_history (100) ---
    lines.append("-- driver_location_history")
    base_lat, base_lng = 21.0285, 105.8542
    for i in range(1, ROWS + 1):
        drv = ((i - 1) % 70) + 1
        lat = base_lat + random.uniform(-0.03, 0.03)
        lng = base_lng + random.uniform(-0.03, 0.03)
        rec = datetime.now(timezone.utc) - timedelta(minutes=i % 25)
        lines.append(
            f"INSERT INTO driver_location_history (driver_id, latitude, longitude, recorded_at) VALUES "
            f"({drv}, {lat:.8f}, {lng:.8f}, {sql_val(rec)});"
        )
    lines.append("")

    # --- search_history (100) ---
    lines.append("-- search_history")
    for i in range(1, ROWS + 1):
        cust = ((i - 1) % ROWS) + 1
        lines.append(
            f"INSERT INTO search_history (customer_id, search_text, searched_at) VALUES "
            f"({cust}, {sql_val(random.choice(SEARCH_QUERIES))}, "
            f"{sql_val(datetime(2026, 3, 1, tzinfo=timezone.utc) + timedelta(hours=i))});"
        )
    lines.append("")

    # --- user_link (100 pairs, unique customer+driver) ---
    lines.append("-- user_link")
    for i in range(1, ROWS + 1):
        cust = i
        drv = ((i * 3) % 70) + 1
        lines.append(f"INSERT INTO user_link (customer_id, driver_id) VALUES ({cust}, {drv});")
    lines.append("")

    # --- login_history (100) ---
    lines.append("-- login_history")
    for i in range(1, ROWS + 1):
        if i % 2 == 0:
            ut, uid = "customer", ((i - 1) % ROWS) + 1
        else:
            ut, uid = "driver", ((i - 1) % 70) + 1
        lines.append(
            f"INSERT INTO login_history (user_type, user_id, ip_address, login_time) VALUES "
            f"({sql_val(ut)}, {uid}, {sql_val(f'192.168.1.{i % 254 + 1}')}, "
            f"{sql_val(datetime(2026, 5, 1, tzinfo=timezone.utc) + timedelta(hours=i))});"
        )
    lines.append("")

    # --- audit_log (100) ---
    lines.append("-- audit_log")
    actions = ("login", "logout", "update_profile", "create_ride_request", "accept_dispatch", "payment")
    for i in range(1, ROWS + 1):
        ut = "customer" if i % 2 == 0 else "driver"
        uid = ((i - 1) % ROWS) + 1 if ut == "customer" else ((i - 1) % 70) + 1
        meta = {"source": "web", "request_id": i if i % 3 == 0 else None}
        lines.append(
            f"INSERT INTO audit_log (user_type, user_id, action, metadata, log_timestamp) VALUES "
            f"({sql_val(ut)}, {uid}, {sql_val(random.choice(actions))}, {sql_val(meta)}, "
            f"{sql_val(datetime(2026, 5, 10, tzinfo=timezone.utc) + timedelta(minutes=i))});"
        )

    lines.append("")
    lines.append("-- Dev accounts: admin1/admin123, mod1-mod4/admin123, customerN & driverN/password123")

    OUT.write_text("\n".join(lines) + "\n", encoding="utf-8")
    print(f"Wrote {OUT} ({len(lines)} lines)")


if __name__ == "__main__":
    main()
