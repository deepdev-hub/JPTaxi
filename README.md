# ChikaiMise - Restaurant Finder Website

## 1. Giới thiệu dự án

**ChikaiMise** là website hỗ trợ tìm kiếm quán ăn / nhà hàng tại Hà Nội, đặc biệt hướng tới nhóm người Nhật đang sinh sống, làm việc hoặc đi công tác tại Việt Nam.

Website giúp người dùng tìm được các quán ăn Việt Nam phù hợp với khẩu vị người Nhật thông qua chức năng tìm kiếm, lọc theo điều kiện, xem vị trí trên bản đồ, xem thông tin chi tiết, đánh giá và nhận xét từ người dùng khác. Đồng thời, hệ thống cũng hỗ trợ chủ quán / chủ nhà hàng có thể đăng ký, đăng tải và quản lý thông tin quán ăn của mình để tiếp cận nhiều khách hàng Nhật hơn.

## 2. Bối cảnh và vấn đề

Hiện nay, nhiều người Nhật làm việc hoặc đi công tác tại Hà Nội gặp khó khăn khi muốn tìm quán ăn Việt Nam ngon, gần vị trí làm việc và phù hợp với khẩu vị của người Nhật.

Bên cạnh đó, các chủ quán ăn / nhà hàng tại Hà Nội, đặc biệt là những quán có thể hỗ trợ tiếng Nhật, cũng gặp khó khăn trong việc quảng bá thông tin đến khách hàng Nhật.

Vì vậy, **ChikaiMise** được xây dựng nhằm kết nối hai nhóm đối tượng này: người có nhu cầu tìm quán ăn và chủ quán ăn / nhà hàng.

## 3. Mục tiêu dự án

* Giúp người dùng nhanh chóng tìm được quán ăn / nhà hàng gần vị trí hiện tại hoặc gần nơi làm việc.
* Hỗ trợ người Nhật đánh giá xem món ăn hoặc quán ăn có phù hợp với khẩu vị của mình hay không.
* Cung cấp thông tin chi tiết về quán ăn như hình ảnh, menu, giá cả, vị trí, giờ mở cửa và đánh giá.
* Hỗ trợ chủ quán đăng tải, chỉnh sửa và quản lý thông tin nhà hàng.
* Tạo môi trường để người dùng và chủ quán có thể trao đổi thông tin trực tiếp.
* Hỗ trợ chia sẻ quán ăn thông qua link hoặc mã QR.

## 4. Đối tượng người dùng

### 4.1. Người có nhu cầu tìm quán ăn

Là người dùng đang tìm kiếm quán ăn / nhà hàng tại Việt Nam, đặc biệt là các quán phù hợp với khẩu vị người Nhật. Người dùng có thể tìm quán để tự đi ăn hoặc giới thiệu cho bạn bè, đồng nghiệp, khách đi công tác.

### 4.2. Chủ quán / chủ nhà hàng

Là người quản lý hoặc sở hữu quán ăn / nhà hàng. Chủ quán có thể đăng ký tài khoản, đăng thông tin quán, cập nhật menu, giá cả, giờ mở cửa, hình ảnh và quản lý trạng thái hoạt động của quán.

### 4.3. Khách chưa đăng nhập

Là người chưa đăng nhập vào hệ thống. Khách có thể truy cập website, xem trang chủ, tìm kiếm quán ăn và xem thông tin cơ bản. Một số chức năng như đánh giá, cập nhật hồ sơ, quản lý quán hoặc nhắn tin yêu cầu đăng nhập.

## 5. Công nghệ sử dụng

### Backend

* Java
* Spring Boot
* Spring Security
* Spring Data JPA / Hibernate
* Maven
* RESTful API

### Frontend

* ReactJS
* Vite
* JavaScript
* HTML / CSS

### Database

* PostgreSQL

### Công cụ phát triển

* Visual Studio Code
* Git / GitHub
* Postman
* pgAdmin / psql

## 6. Các chức năng chính

## 6.1. Tìm kiếm quán ăn / nhà hàng

Người dùng có thể tìm kiếm quán ăn / nhà hàng theo các điều kiện như:

* Tên quán ăn / nhà hàng.
* Tên món ăn.
* Khu vực.
* Khoảng cách.
* Loại món ăn.
* Khoảng giá.
* Giờ mở cửa.
* Trạng thái hoạt động.
* Mức đánh giá.

Kết quả tìm kiếm được hiển thị dưới dạng danh sách thẻ nhà hàng, bao gồm ảnh đại diện, tên quán, đánh giá, khoảng cách, giờ mở cửa, danh mục và giá tham khảo.

## 6.2. Hiển thị bản đồ

Website hỗ trợ hiển thị vị trí các quán ăn trên bản đồ. Người dùng có thể:

* Xem vị trí quán ăn bằng marker trên bản đồ.
* Xem vị trí hiện tại của mình.
* Phóng to / thu nhỏ bản đồ.
* Xem popup thông tin nhanh của quán.
* Chuyển từ bản đồ sang trang chi tiết quán.
* Xem đường đi đến quán ăn.

## 6.3. Xem chi tiết quán ăn / nhà hàng

Trang chi tiết quán ăn hiển thị các thông tin như:

* Tên quán ăn / nhà hàng.
* Hình ảnh / banner của quán.
* Địa chỉ.
* Giờ mở cửa.
* Số điện thoại.
* Mức giá.
* Menu và danh sách món ăn.
* Giá từng món ăn.
* Mô tả món ăn.
* Hình ảnh món ăn.
* Tag món ăn.
* Trạng thái hỗ trợ tiếng Nhật.
* Điểm đánh giá trung bình.
* Số lượng review.

Người dùng cũng có thể sử dụng các nút chức năng như xem chỉ đường, chia sẻ quán, tạo mã QR hoặc nhắn tin với chủ quán.

## 6.4. Đăng ký tài khoản

Khách chưa đăng nhập có thể tạo tài khoản mới bằng cách chọn loại tài khoản:

* Người có nhu cầu tìm quán ăn.
* Chủ quán / chủ nhà hàng.

Thông tin đăng ký gồm các dữ liệu cơ bản như tên người dùng, email, mật khẩu, số điện thoại và vai trò tài khoản.

## 6.5. Đăng nhập

Người dùng và chủ quán có thể đăng nhập bằng email và mật khẩu. Sau khi đăng nhập thành công, hệ thống điều hướng người dùng đến màn hình phù hợp theo vai trò.

## 6.6. Quên mật khẩu / đặt lại mật khẩu

Người dùng có thể nhập email để yêu cầu đặt lại mật khẩu. Hệ thống gửi link hoặc mã xác thực đến email, sau đó người dùng có thể tạo mật khẩu mới.

## 6.7. Cập nhật hồ sơ cá nhân

Người dùng đã đăng nhập có thể xem và chỉnh sửa thông tin cá nhân:

* Ảnh đại diện.
* Tên người dùng.
* Email.
* Số điện thoại.
* Địa chỉ.
* Mật khẩu.

## 6.8. Quản lý quán ăn dành cho chủ quán

Chủ quán có thể quản lý danh sách các quán mình đã đăng ký. Các chức năng chính gồm:

* Xem danh sách quán đang quản lý.
* Xem thống kê số quán, số đánh giá và điểm trung bình.
* Thêm quán ăn / nhà hàng mới.
* Chỉnh sửa thông tin quán.
* Cập nhật hình ảnh, menu, giá, giờ mở cửa.
* Cập nhật trạng thái hoạt động của quán.
* Xem trang công khai của quán.
* Xem tin nhắn từ người dùng.

## 6.9. Đăng ký thông tin quán ăn / nhà hàng

Chủ quán có thể đăng tải thông tin quán mới, bao gồm:

* Tên quán.
* Địa chỉ / vị trí.
* Ảnh thực tế.
* Banner.
* Menu.
* Giá món ăn.
* Mô tả món ăn.
* Giờ mở cửa.
* Số điện thoại liên hệ.
* Mức giá.
* Dịch vụ hỗ trợ tiếng Nhật.

## 6.10. Chỉnh sửa thông tin quán ăn

Chủ quán có thể cập nhật thông tin đã đăng để đảm bảo dữ liệu luôn chính xác. Ví dụ:

* Thay đổi giờ mở cửa.
* Cập nhật menu.
* Cập nhật giá món ăn.
* Thêm hoặc xóa hình ảnh.
* Cập nhật trạng thái mở cửa / tạm dừng.

## 6.11. Đánh giá quán ăn

Người dùng đã từng sử dụng quán có thể đăng đánh giá bằng điểm sao và bình luận. Chức năng này giúp các người dùng khác có thêm thông tin đáng tin cậy trước khi lựa chọn quán.

Nội dung đánh giá có thể gồm:

* Điểm đánh giá.
* Bình luận.
* Thời gian đăng.
* Thông tin người đánh giá.

## 6.12. Thích / không thích đánh giá của người khác

Người dùng có thể đánh giá mức độ hữu ích của review bằng cách chọn:

* Thích / hữu ích.
* Không thích / không hữu ích.

Chức năng này giúp hệ thống lọc ra các nhận xét có độ tin cậy cao hơn.

## 6.13. Nhắn tin giữa người dùng và chủ quán

Website hỗ trợ chức năng nhắn tin trực tiếp giữa người tìm quán và chủ quán. Người dùng có thể hỏi về:

* Thời gian đặt bàn.
* Món ăn được đề xuất.
* Dịch vụ hỗ trợ tiếng Nhật.
* Giá cả.
* Đường đi.
* Các yêu cầu khác trước khi đến quán.

## 6.14. Tạo link chia sẻ và mã QR

Người dùng hoặc chủ quán có thể tạo link / mã QR để chia sẻ trang chi tiết quán ăn. Người nhận có thể mở link hoặc quét mã QR để xem nhanh:

* Thông tin quán.
* Vị trí trên Google Maps.
* Menu.
* Món ăn được đề xuất.
* Đánh giá của người dùng.

## 7. Danh sách màn hình chính

| ID | Màn hình                     | Vai trò sử dụng             | Mô tả                                                        |
| -- | ---------------------------- | --------------------------- | ------------------------------------------------------------ |
| 1  | Trang chủ                    | Guest, người dùng, chủ quán | Màn hình đầu vào của website, có thanh tìm kiếm chính        |
| 2  | Tìm kiếm và hiển thị kết quả | Guest, người dùng           | Hiển thị danh sách quán và vị trí trên bản đồ                |
| 3  | Chi tiết quán ăn / nhà hàng  | Guest, người dùng           | Hiển thị thông tin chi tiết, menu, hình ảnh, review, QR/link |
| 4  | Hồ sơ cá nhân                | Người dùng, chủ quán        | Xem và chỉnh sửa thông tin tài khoản                         |
| 5  | Danh sách quán của tôi       | Chủ quán                    | Hiển thị các quán mà chủ quán đang quản lý                   |
| 6  | Đăng ký thông tin quán       | Chủ quán                    | Thêm mới thông tin quán ăn / nhà hàng                        |
| 7  | Quản lý thông tin quán       | Chủ quán                    | Chỉnh sửa thông tin và trạng thái quán                       |
| 8  | Danh sách đánh giá           | Guest, người dùng           | Xem các review của quán                                      |
| 9  | Viết đánh giá                | Người dùng                  | Đăng điểm sao và bình luận                                   |
| 10 | Đăng nhập                    | Guest                       | Đăng nhập tài khoản                                          |
| 11 | Đăng ký                      | Guest                       | Tạo tài khoản người dùng hoặc chủ quán                       |
| 12 | Quên mật khẩu                | Guest                       | Gửi yêu cầu đặt lại mật khẩu                                 |
| 13 | Trò chuyện                   | Người dùng, chủ quán        | Nhắn tin trực tiếp giữa người dùng và chủ quán               |

## 8. Cấu trúc thư mục tham khảo

```bash
restaurant-finder/
│
├── backend/
│   ├── src/
│   │   ├── main/
│   │   │   ├── java/
│   │   │   │   └── com/example/restaurantfinder/
│   │   │   └── resources/
│   │   │       ├── application.properties
│   │   │       └── static/
│   │   └── test/
│   ├── pom.xml
│   └── README.md
│
├── frontend/
│   ├── src/
│   ├── public/
│   ├── package.json
│   └── vite.config.js
│
└── database/
    └── dump.sql
```

> Lưu ý: Cấu trúc thư mục thực tế có thể thay đổi tùy theo cách nhóm tổ chức project.

## 9. Cài đặt và chạy dự án

## 9.1. Yêu cầu môi trường

Trước khi chạy dự án, cần cài đặt:

* Java 17 hoặc cao hơn.
* Maven.
* Node.js.
* PostgreSQL.
* Git.
* Visual Studio Code hoặc IDE tương đương.

## 9.2. Clone project

```bash
git clone <repository-url>
cd restaurant-finder
```

## 9.3. Cấu hình database PostgreSQL

Tạo database:

```sql
CREATE DATABASE restaurant_finder;
```

Cấu hình kết nối database trong file `backend/src/main/resources/application.properties`:

```properties
spring.application.name=restaurant-finder

spring.datasource.url=jdbc:postgresql://localhost:5432/restaurant_finder
spring.datasource.username=postgres
spring.datasource.password=your_password

spring.jpa.hibernate.ddl-auto=none
spring.jpa.show-sql=true
spring.jpa.properties.hibernate.format_sql=true
spring.jpa.properties.hibernate.dialect=org.hibernate.dialect.PostgreSQLDialect

server.port=8081
```

Nếu có file dump database:

```bash
psql -U postgres -d restaurant_finder -f database/dump.sql
```

## 9.4. Chạy backend

```bash
cd backend
mvn spring-boot:run
```

Backend mặc định chạy tại:

```text
http://localhost:8081
```

## 9.5. Chạy frontend

```bash
cd frontend
npm install
npm run dev
```

Frontend mặc định chạy tại:

```text
http://localhost:5173
```

## 10. Cấu hình CORS

Nếu frontend chạy ở cổng `5173` và backend chạy ở cổng `8081`, cần cấu hình CORS để frontend có thể gọi API backend.

Ví dụ:

```java
@Configuration
public class CorsConfig {
    @Bean
    public WebMvcConfigurer corsConfigurer() {
        return new WebMvcConfigurer() {
            @Override
            public void addCorsMappings(CorsRegistry registry) {
                registry.addMapping("/**")
                        .allowedOrigins("http://localhost:5173")
                        .allowedMethods("GET", "POST", "PUT", "DELETE", "OPTIONS")
                        .allowedHeaders("*")
                        .allowCredentials(true);
            }
        };
    }
}
```

## 11. API tham khảo

### 11.1. Authentication

| Method | API                     | Mô tả                     |
| ------ | ----------------------- | ------------------------- |
| POST   | `/auth/signup`          | Đăng ký tài khoản         |
| POST   | `/auth/login`           | Đăng nhập                 |
| POST   | `/auth/forgot-password` | Gửi yêu cầu quên mật khẩu |
| POST   | `/auth/reset-password`  | Đặt lại mật khẩu          |
| POST   | `/auth/logout`          | Đăng xuất                 |

### 11.2. User Profile

| Method | API                  | Mô tả                             |
| ------ | -------------------- | --------------------------------- |
| GET    | `/users/me`          | Lấy thông tin người dùng hiện tại |
| PUT    | `/users/me`          | Cập nhật hồ sơ cá nhân            |
| PUT    | `/users/me/password` | Đổi mật khẩu                      |

### 11.3. Restaurant Search

| Method | API                         | Mô tả                            |
| ------ | --------------------------- | -------------------------------- |
| GET    | `/restaurants`              | Lấy danh sách quán ăn / nhà hàng |
| GET    | `/restaurants/search`       | Tìm kiếm và lọc nhà hàng         |
| GET    | `/restaurants/{id}`         | Xem chi tiết nhà hàng            |
| GET    | `/restaurants/{id}/menu`    | Xem menu của nhà hàng            |
| GET    | `/restaurants/{id}/reviews` | Xem danh sách đánh giá           |

### 11.4. Owner Restaurant Management

| Method | API                              | Mô tả                           |
| ------ | -------------------------------- | ------------------------------- |
| GET    | `/owner/restaurants`             | Xem danh sách quán của chủ quán |
| POST   | `/owner/restaurants`             | Đăng ký quán mới                |
| PUT    | `/owner/restaurants/{id}`        | Chỉnh sửa thông tin quán        |
| DELETE | `/owner/restaurants/{id}`        | Xóa hoặc ẩn quán                |
| PUT    | `/owner/restaurants/{id}/status` | Cập nhật trạng thái hoạt động   |

### 11.5. Review

| Method | API                         | Mô tả                |
| ------ | --------------------------- | -------------------- |
| POST   | `/restaurants/{id}/reviews` | Đăng đánh giá quán   |
| PUT    | `/reviews/{id}`             | Chỉnh sửa đánh giá   |
| DELETE | `/reviews/{id}`             | Xóa đánh giá         |
| POST   | `/reviews/{id}/like`        | Thích đánh giá       |
| POST   | `/reviews/{id}/dislike`     | Không thích đánh giá |

### 11.6. Chat

| Method | API                    | Mô tả                              |
| ------ | ---------------------- | ---------------------------------- |
| GET    | `/chats`               | Lấy danh sách cuộc trò chuyện      |
| GET    | `/chats/{id}/messages` | Lấy tin nhắn trong cuộc trò chuyện |
| POST   | `/chats/{id}/messages` | Gửi tin nhắn                       |

### 11.7. Share / QR Code

| Method | API                            | Mô tả                             |
| ------ | ------------------------------ | --------------------------------- |
| GET    | `/restaurants/{id}/share-link` | Tạo link chia sẻ quán             |
| GET    | `/restaurants/{id}/qr-code`    | Tạo mã QR cho trang chi tiết quán |

> Tên API có thể thay đổi tùy theo code thực tế của nhóm.

## 12. Gợi ý bảng dữ liệu chính

Dự án có thể sử dụng các bảng dữ liệu chính sau:

| Bảng                    | Mục đích                            |
| ----------------------- | ----------------------------------- |
| `users`                 | Lưu thông tin tài khoản người dùng  |
| `roles`                 | Lưu vai trò: guest, seeker, owner   |
| `restaurants`           | Lưu thông tin quán ăn / nhà hàng    |
| `restaurant_images`     | Lưu hình ảnh của quán               |
| `menus`                 | Lưu danh sách menu của quán         |
| `menu_items`            | Lưu thông tin từng món ăn           |
| `reviews`               | Lưu đánh giá của người dùng         |
| `review_reactions`      | Lưu lượt thích / không thích review |
| `chat_rooms`            | Lưu phòng trò chuyện                |
| `messages`              | Lưu tin nhắn                        |
| `favorites`             | Lưu quán yêu thích nếu có           |
| `password_reset_tokens` | Lưu token đặt lại mật khẩu          |

## 13. Luồng sử dụng chính

### 13.1. Luồng tìm kiếm quán ăn

1. Người dùng truy cập trang chủ.
2. Nhập tên quán, món ăn hoặc khu vực cần tìm.
3. Chọn thêm điều kiện lọc như khoảng cách, giá, giờ mở cửa hoặc đánh giá.
4. Hệ thống hiển thị danh sách kết quả và vị trí trên bản đồ.
5. Người dùng chọn một quán để xem chi tiết.
6. Người dùng xem menu, giá, hình ảnh, đánh giá và vị trí.
7. Người dùng có thể xem đường đi, chia sẻ quán hoặc nhắn tin với chủ quán.

### 13.2. Luồng đăng ký quán của chủ quán

1. Chủ quán đăng ký hoặc đăng nhập tài khoản.
2. Truy cập màn hình danh sách quán của tôi.
3. Chọn đăng ký quán mới.
4. Nhập thông tin quán, địa chỉ, hình ảnh, menu, giá và giờ mở cửa.
5. Lưu thông tin.
6. Hệ thống hiển thị quán trên danh sách tìm kiếm để người dùng có thể xem.

### 13.3. Luồng đánh giá quán

1. Người dùng đăng nhập.
2. Mở trang chi tiết quán.
3. Chọn viết đánh giá.
4. Nhập điểm sao và bình luận.
5. Gửi đánh giá.
6. Hệ thống cập nhật điểm trung bình và danh sách review của quán.

## 14. Các lỗi thường gặp

### 14.1. Không chạy được frontend bằng `npm run dev`

Nguyên nhân thường gặp là chạy lệnh sai thư mục hoặc chưa có file `package.json`.

Cách xử lý:

```bash
cd frontend
npm install
npm run dev
```

### 14.2. Không kết nối được PostgreSQL

Kiểm tra lại:

* PostgreSQL đã chạy chưa.
* Database `restaurant_finder` đã được tạo chưa.
* Username / password trong `application.properties` đã đúng chưa.
* Cổng PostgreSQL có phải `5432` không.

### 14.3. Frontend không gọi được API backend

Kiểm tra lại:

* Backend có đang chạy ở `http://localhost:8081` không.
* Frontend có đang chạy ở `http://localhost:5173` không.
* Cấu hình CORS đã cho phép origin của frontend chưa.
* API URL trong frontend đã đúng chưa.

### 14.4. Dữ liệu nhà hàng không hiển thị

Kiểm tra lại:

* Database đã có dữ liệu mẫu chưa.
* API tìm kiếm có trả về dữ liệu không.
* Điều kiện lọc có quá hẹp không.
* Frontend có map đúng field từ response API không.

## 15. Quy trình phát triển đề xuất

```bash
# Lấy code mới nhất
git pull origin main

# Tạo branch mới
git checkout -b feature/restaurant-search

# Sau khi code xong
git add .
git commit -m "Add restaurant search feature"
git push origin feature/restaurant-search
```

## 16. Thành viên nhóm

| STT | Họ tên        | Vai trò                  |
| --- | ------------  | ------------------------ |
| 1   | Lương Văn Hưng| Backend / Authentication |
| 2   | Nguyễn Quang Thiện  | Frontend                 |
| 3   | Đàm Vĩnh Hưng  | Database                 |
| 4   | Trần Duy Hưng  | UI/UX                    |
| 5   | Đào Nhật Hưng | Testing / Documentation  |

## 17. Định hướng phát triển trong tương lai

* Tích hợp Google Maps hoặc OpenStreetMap để hiển thị bản đồ chi tiết hơn.
* Gợi ý quán ăn dựa trên vị trí hiện tại và lịch sử tìm kiếm.
* Thêm chức năng lưu quán yêu thích.
* Thêm chức năng đặt bàn trực tuyến.
* Hỗ trợ đa ngôn ngữ Việt - Nhật - Anh.
* Gửi thông báo realtime khi có tin nhắn mới.
* Tối ưu giao diện cho thiết bị di động.
* Thêm hệ thống kiểm duyệt review để tăng độ tin cậy.

## 18. Kết luận

**ChikaiMise** là website Restaurant Finder hỗ trợ người Nhật tại Hà Nội tìm kiếm quán ăn Việt Nam phù hợp với khẩu vị, vị trí và nhu cầu cá nhân. Hệ thống đồng thời giúp các chủ quán ăn / nhà hàng quảng bá thông tin, quản lý quán và giao tiếp trực tiếp với khách hàng.

Dự án giúp nhóm phát triển rèn luyện kỹ năng phân tích nghiệp vụ, thiết kế giao diện, xây dựng backend, frontend, database và triển khai các chức năng thực tế của một website tìm kiếm nhà hàng.
