/**
 * E2E WebSocket Real-time Tracking and Continuous ETA Simulator
 * 
 * Cách chạy:
 * 1. Đảm bảo NestJS Backend đang chạy (npm run start:dev hoặc node dist/main.js ở port 3000)
 * 2. Chạy script: node scripts/test-websocket.js
 * 
 * Script này sẽ:
 * - Đọc cấu hình từ .env hoặc .env.example
 * - Truy vấn cơ sở dữ liệu để tìm một chuyến đi đang hoạt động (ongoing)
 * - Nếu không có, tự động chuyển một chuyến đi bất kỳ sang 'ongoing' để phục vụ kiểm thử
 * - Tạo mã JWT thực tế cho Driver và Customer tương ứng
 * - Thiết lập kết nối Socket.io đồng thời cho cả Driver và Customer
 * - Cả 2 tham gia vào phòng chuyến đi (trip_{tripId})
 * - Client Driver phát sóng tọa độ GPS di chuyển mỗi 2 giây
 * - Client Customer đón nhận sự kiện 'locationUpdated', hiển thị tọa độ thời gian thực, khoảng cách và ETA liên tục tính toán từ Backend!
 */

const fs = require('fs');
const path = require('path');
const { Client } = require('pg');
const jwt = require('jsonwebtoken');
const { io } = require('socket.io-client');

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

// 1. Tải môi trường
const root = path.resolve(__dirname, '..');
const envPath = path.join(root, '.env');
const examplePath = path.join(root, '.env.example');

if (!loadEnvFile(envPath)) {
  loadEnvFile(examplePath);
}

const dbHost = process.env.DB_HOST || 'localhost';
const dbPort = parseInt(process.env.DB_PORT || '5432', 10);
const dbUser = process.env.DB_USER || 'postgres';
const dbPass = process.env.DB_PASS || '123456';
const dbName = process.env.DB_NAME || 'JPTaxi';
const jwtSecret = process.env.JWT_SECRET || 'super_secret_key_123';

console.log('🔄 Đang kết nối Database để lấy thông tin chuyến đi...');

async function run() {
  const dbClient = new Client({ host: dbHost, port: dbPort, user: dbUser, password: dbPass, database: dbName });
  try {
    await dbClient.connect();
    
    // Tìm hoặc tạo một chuyến đi đang diễn ra (ongoing)
    let tripRes = await dbClient.query(`
      SELECT t.trip_id as "tripId", t.driver_id as "driverId", r.customer_id as "customerId",
             r.pickup_lat as "pickupLat", r.pickup_lng as "pickupLng",
             r.dropoff_lat as "dropoffLat", r.dropoff_lng as "dropoffLng"
      FROM trip t
      JOIN ride_request r ON t.request_id = r.request_id
      WHERE t.status = 'ongoing'
      LIMIT 1
    `);

    if (tripRes.rows.length === 0) {
      console.log('⚠️ Không tìm thấy chuyến đi "ongoing" nào trong DB.');
      console.log('🛠️ Đang tự động kích hoạt chuyến đi mã số 61 thành "ongoing" để chạy thử nghiệm...');
      await dbClient.query("UPDATE trip SET status = 'ongoing' WHERE trip_id = 61");
      
      tripRes = await dbClient.query(`
        SELECT t.trip_id as "tripId", t.driver_id as "driverId", r.customer_id as "customerId",
               r.pickup_lat as "pickupLat", r.pickup_lng as "pickupLng",
               r.dropoff_lat as "dropoffLat", r.dropoff_lng as "dropoffLng"
        FROM trip t
        JOIN ride_request r ON t.request_id = r.request_id
        WHERE t.trip_id = 61
      `);
    }

    const trip = tripRes.rows[0];
    console.log('\n==================================================');
    console.log('🚗 THÔNG TIN CHUYẾN ĐI DÙNG ĐỂ KIỂM THỬ:');
    console.log(`- Trip ID: ${trip.tripId}`);
    console.log(`- Driver ID (Tài xế): ${trip.driverId}`);
    console.log(`- Customer ID (Khách hàng): ${trip.customerId}`);
    console.log(`- Tọa độ đón khách (Pickup): [${trip.pickupLat}, ${trip.pickupLng}]`);
    console.log(`- Tọa độ điểm đến (Dropoff): [${trip.dropoffLat}, ${trip.dropoffLng}]`);
    console.log('==================================================\n');

    await dbClient.end();

    // 2. Tạo token JWT giả lập cho cả Driver và Customer tương ứng
    const driverToken = jwt.sign({ id: trip.driverId, role: 'driver' }, jwtSecret);
    const customerToken = jwt.sign({ id: trip.customerId, role: 'customer' }, jwtSecret);

    const backendUrl = 'http://localhost:3000';

    console.log('🔌 Đang kết nối WebSockets tới Backend (http://localhost:3000)...');

    // 3. Khởi tạo kết nối Socket cho Khách hàng
    const customerSocket = io(backendUrl, {
      auth: { token: `Bearer ${customerToken}` }
    });

    // 4. Khởi tạo kết nối Socket cho Tài xế
    const driverSocket = io(backendUrl, {
      auth: { token: `Bearer ${driverToken}` }
    });

    let customerJoined = false;
    let driverJoined = false;

    // Lắng nghe trạng thái kết nối
    customerSocket.on('connect', () => {
      console.log('🟢 [Customer App] Kết nối thành công! Đang tham gia phòng chuyến đi...');
      customerSocket.emit('joinRideRoom', { tripId: trip.tripId }, (ack) => {
        console.log(`🔹 [Customer App] Đã tham gia phòng trip_${trip.tripId}`);
        customerJoined = true;
        startSimulation();
      });
    });

    driverSocket.on('connect', () => {
      console.log('🟢 [Driver App] Kết nối thành công! Đang tham gia phòng chuyến đi...');
      driverSocket.emit('joinRideRoom', { tripId: trip.tripId }, (ack) => {
        console.log(`🔹 [Driver App] Đã tham gia phòng trip_${trip.tripId}`);
        driverJoined = true;
        startSimulation();
      });
    });

    // Lắng nghe sự kiện cập nhật tọa độ thời gian thực và ETA ở phía Customer
    customerSocket.on('locationUpdated', (data) => {
      console.log('\n✨=================== LIVE UPDATE ===================✨');
      console.log(`📍 Nhận tọa độ từ Tài xế ID ${data.driverId}:`);
      console.log(`   👉 Vĩ độ (Latitude):   ${data.latitude}`);
      console.log(`   👉 Kinh độ (Longitude): ${data.longitude}`);
      console.log(`🛣️  Khoảng cách còn lại:  ${data.distanceKm} km`);
      console.log(`⏱️  Thời gian dự kiến (ETA): ${data.etaMinutes} phút`);
      console.log('✨===================================================✨');
    });

    // 5. Hàm chạy giả lập di chuyển của Tài xế
    let isSimulating = false;
    function startSimulation() {
      // Chỉ bắt đầu khi cả 2 client đều đã vào phòng
      if (!customerJoined || !driverJoined || isSimulating) return;
      isSimulating = true;

      console.log('\n🚀 BẮT ĐẦU GIẢ LẬP TÀI XẾ DI CHUYỂN TỪ ĐIỂM ĐÓN ĐẾN ĐIỂM TRẢ...');
      console.log('   (Mỗi 2 giây tài xế sẽ báo cáo tọa độ mới. ETA sẽ tự động cập nhật)\n');

      const startLat = parseFloat(trip.pickupLat);
      const startLng = parseFloat(trip.pickupLng);
      const endLat = parseFloat(trip.dropoffLat);
      const endLng = parseFloat(trip.dropoffLng);

      let step = 0;
      const totalSteps = 8;

      const interval = setInterval(() => {
        // Nội suy tọa độ di chuyển tuyến tính
        const currentLat = startLat + (endLat - startLat) * (step / totalSteps);
        const currentLng = startLng + (endLng - startLng) * (step / totalSteps);

        console.log(`📤 [Driver App] Báo cáo tọa độ bước ${step}/${totalSteps}: [${currentLat.toFixed(5)}, ${currentLng.toFixed(5)}]`);
        
        driverSocket.emit('updateDriverLocation', {
          lat: currentLat,
          lng: currentLng
        });

        step++;

        if (step > totalSteps) {
          clearInterval(interval);
          console.log('\n🏁 GIẢ LẬP HOÀN TẤT. Tài xế đã tới điểm đến!');
          
          setTimeout(() => {
            console.log('🔌 Đang ngắt kết nối WebSocket...');
            customerSocket.disconnect();
            driverSocket.disconnect();
            console.log('✅ Hoàn thành quy trình kiểm thử thành công.');
            process.exit(0);
          }, 3000);
        }
      }, 2000);
    }

  } catch (err) {
    console.error('❌ Lỗi chạy thử nghiệm:', err.message);
    process.exit(1);
  }
}

run();
