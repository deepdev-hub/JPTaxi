import { useEffect, useRef, useState } from 'react';
import { getStoredProfileLanguage, LANGUAGE_EVENT } from './profileLanguage.js';

const textByLanguage = {
  vi: {
    'JP TAXIをはじめましょう': 'Bắt đầu với JP TAXI',
    'Arrived Safely': 'Đã đến nơi an toàn',
    'PayPay': 'PayPay',
    'Apple Pay': 'Apple Pay',
    '乗車地と目的地を検索': 'Tìm điểm đón và điểm đến',
    '先に乗車地を選択してから目的地を選択してください。乗車地から半径2km以内のドライバーを検索します。': 'Chọn điểm đón trước, sau đó chọn điểm đến. Hệ thống sẽ tìm tài xế trong bán kính 2 km quanh điểm đón.',
    '乗車地': 'Điểm đón',
    '迎えに来てほしい場所': 'Nơi bạn muốn tài xế đến đón',
    '目的地・住所を入力': 'Nhập điểm đến hoặc địa chỉ',
    '目的地を選択してください': 'Vui lòng chọn điểm đến',
    '検索結果': 'Kết quả tìm kiếm',
    '最近の履歴': 'Lịch sử gần đây',
    '検索しています...': 'Đang tìm kiếm...',
    '該当する地点が見つかりませんでした。': 'Không tìm thấy địa điểm phù hợp.',
    '検索に失敗しました。もう一度入力してください。': 'Tìm kiếm thất bại. Vui lòng nhập lại.',
    'このルートで続ける': 'Tiếp tục với tuyến đường này',
    'ルート情報': 'Thông tin tuyến đường',
    '予想所要時間': 'Thời gian dự kiến',
    '距離': 'Quãng đường',
    '概算料金': 'Giá ước tính',
    '計算中': 'Đang tính',
    '選択': 'Chọn',
    '昨日': 'Hôm qua',
    '2日前': '2 ngày trước',
    '先週': 'Tuần trước',
    '保存済み': 'Đã lưu',
    'LICENSE IMAGE': 'ẢNH GIẤY PHÉP',
    'ホーム': 'Trang chủ',
    'アカウント': 'Tài khoản',
    'ドライバー情報': 'Thông tin tài xế',
    'こんにちは！': 'Xin chào!',
    'どこへ行きますか?': 'Bạn muốn đi đâu?',
    'どこへ行きますか？': 'Bạn muốn đi đâu?',
    '目的地・住所を入力、または履歴から選択': 'Nhập điểm đến, địa chỉ hoặc chọn từ lịch sử',
    '職場': 'Cơ quan',
    '自宅': 'Nhà riêng',
    'お気に': 'Yêu thích',
    'もっと見る': 'Xem thêm',
    '今すぐタクシーを呼ぶ': 'Gọi taxi ngay',
    'すぐに予約': 'Đặt xe ngay',
    '次の配車を確認しますか?': 'Bạn muốn kiểm tra chuyến tiếp theo?',
    '予約内容を確認': 'Kiểm tra nội dung đặt xe',
    '乗車場所・目的地・料金を確認して受付へ進む': 'Kiểm tra điểm đón, điểm đến và giá rồi tiếp tục',
    'プロフィール': 'Hồ sơ',
    '公開情報を編集': 'Chỉnh sửa thông tin công khai',
    'チャット': 'Trò chuyện',
    '利用者へ連絡': 'Liên hệ khách hàng',
    '待機状況': 'Trạng thái chờ',
    '時間と距離を表示': 'Hiển thị thời gian và khoảng cách',
    '配車確認へ進む': 'Đi tới xác nhận chuyến',
    '確認後、チャット・待機状況・請求書へ': 'Sau khi xác nhận, dùng chat, trạng thái chờ và hóa đơn',
    '検索中...': 'Đang tìm...',
    'プロフィールで住所を設定': 'Thiết lập địa chỉ trong hồ sơ',
    '丁寧な対応': 'Phục vụ lịch sự',
    '安全運転': 'Lái xe an toàn',
    '車内が清潔': 'Xe sạch sẽ',
    'ルートが最適': 'Lộ trình tối ưu',
    '日本語が堪能': 'Thành thạo tiếng Nhật',
    'フィードバック': 'Phản hồi',
    '送信': 'Gửi',
    '田中 ドライバー': 'Tài xế Tanaka',
    '今回の乗車はいかがでしたか？': 'Bạn thấy chuyến đi này thế nào?',
    '素晴らしい!': 'Tuyệt vời!',
    '良かった点（複数選択可）': 'Điểm tốt (có thể chọn nhiều)',
    'ドライバーへのメッセージ（任意）': 'Tin nhắn cho tài xế (không bắt buộc)',
    '評価を送信する': 'Gửi đánh giá',
    'ルート詳細': 'Chi tiết lộ trình',
    'ルートマップ': 'Bản đồ lộ trình',
    '地図操作': 'Điều khiển bản đồ',
    '拡大': 'Phóng to',
    '縮小': 'Thu nhỏ',
    '地図を戻す': 'Đưa bản đồ về vị trí ban đầu',
    'ドライバー位置': 'Vị trí tài xế',
    '近くのタクシー': 'Taxi gần bạn',
    '現在位置': 'Vị trí hiện tại',
    'ホアンキエム湖': 'Hồ Hoàn Kiếm',
    'ホアンキエム周辺': 'Khu vực Hoàn Kiếm',
    'ハノイ・ホアンキエム周辺': 'Khu vực Hoàn Kiếm, Hà Nội',
    'ロッテホテル ハノイ': 'Khách sạn Lotte Hà Nội',
    'ロッテホテル': 'Khách sạn Lotte',
    'ノイバイ国際空港': 'Sân bay quốc tế Nội Bài',
    'チャンティエン通り': 'Phố Tràng Tiền',
    'キムマー通り': 'Phố Kim Mã',
    '出発地': 'Điểm đi',
    '目的地': 'Điểm đến',
    '現在': 'Hiện tại',
    '直進 1.1 km': 'Đi thẳng 1.1 km',
    '右折して 2.7 km 進む': 'Rẽ phải và đi 2.7 km',
    '半径2km以内の配車リクエストを検索しています...': 'Đang tìm yêu cầu đặt xe trong bán kính 2 km...',
    '半径2km以内の配車リクエストを検索しています。': 'Đang tìm yêu cầu đặt xe trong bán kính 2 km.',
    '条件に合う配車リクエストはまだありません。': 'Chưa có yêu cầu đặt xe phù hợp.',
    'この配車リクエストを承認できませんでした。': 'Không thể xác nhận yêu cầu đặt xe này.',
    '通知': 'Thông báo',
    '配車リクエスト確認': 'Xác nhận yêu cầu đặt xe',
    '半径2km以内で実際に予約中のお客様だけを表示します。': 'Chỉ hiển thị khách đang đặt xe thật trong bán kính 2 km.',
    'ドライバーはオンラインです': 'Tài xế đang online',
    '受付範囲: 2 km': 'Phạm vi nhận chuyến: 2 km',
    'お迎え地点まで': 'Đến điểm đón',
    'スキップ': 'Bỏ qua',
    '承認中...': 'Đang xác nhận...',
    '承認する': 'Xác nhận',
    'お客様情報': 'Thông tin khách hàng',
    '電話番号未登録': 'Chưa đăng ký số điện thoại',
    '読み込み中...': 'Đang tải...',
    '配車リクエストを検索中': 'Đang tìm yêu cầu đặt xe',
    '連絡先を確認中': 'Đang kiểm tra liên hệ',
    'お迎え': 'Điểm đón',
    '範囲': 'Phạm vi',
    '状態': 'Trạng thái',
    '新規': 'Mới',
    '近くのお客様を検索しています': 'Đang tìm khách gần bạn',
    '予約リクエストがない場合、サンプルデータは表示しません。': 'Nếu không có yêu cầu đặt xe, dữ liệu mẫu sẽ không hiển thị.',
    'お迎え予定時間': 'Thời gian đón dự kiến',
    '電話': 'Gọi',
    'メッセージ': 'Tin nhắn',
    '目的地に到着': 'Đã đến điểm đến',
    '乗車記録と料金の確認': 'Kiểm tra lịch sử chuyến đi và giá',
    '出発': 'Khởi hành',
    '到着': 'Đến nơi',
    '運賃 (4.8 km)': 'Cước phí (4.8 km)',
    '予約・サービス料': 'Phí đặt xe và dịch vụ',
    'お支払い合計': 'Tổng thanh toán',
    '変更 〉': 'Đổi 〉',
    '戻る': 'Quay lại',
    'お支払いを確定する': 'Xác nhận thanh toán',
    '領収書を発行する': 'Xuất biên lai',
    'お問い合わせはこちら': 'Liên hệ hỗ trợ tại đây',
    '支払い方法を選択': 'Chọn phương thức thanh toán',
    '閉じる': 'Đóng',
    '現金': 'Tiền mặt',
    '選択中': 'Đang chọn',
    'この方法にする': 'Dùng phương thức này',
    'メッセージを入力...': 'Nhập tin nhắn...',
    '今どこですか？': 'Bạn đang ở đâu?',
    '着きました！': 'Tôi đã đến!',
    '少し遅れます': 'Tôi sẽ trễ một chút',
    '了解です': 'Đã hiểu',
    'こんにちは、田中です。現在向かっています。': 'Xin chào, tôi là Tanaka. Tôi đang đến.',
    '承知いたしました。ホテルのロビー入り口で待っています。': 'Tôi hiểu rồi. Tôi đang chờ ở cửa sảnh khách sạn.',
    'ありがとうございます。黒色のトヨタ・ヴィオス、ナンバー「30A-123.45」です。まもなく到着します。': 'Cảm ơn bạn. Xe Toyota Vios màu đen, biển số 30A-123.45. Tôi sắp đến nơi.',
    'サポートセンター': 'Trung tâm hỗ trợ',
    'お問い合わせの件につきまして、担当者が確認中です。': 'Nhân viên phụ trách đang kiểm tra yêu cầu của bạn.',
    '佐藤 お客様': 'Khách hàng Sato',
    '乗車地点で待機中': 'Đang chờ tại điểm đón',
    '走行中 (あと3分で到着)': 'Đang di chuyển (còn 3 phút)',
    'タクシーを呼び出し中': 'Đang gọi taxi',
    '半径2km以内のドライバーを検索しています...': 'Đang tìm tài xế trong bán kính 2 km...',
    'キャンセル': 'Hủy',
    '予約内容を確認しました': 'Đã kiểm tra nội dung đặt xe',
    '代理予約の情報が空のため、自分用に戻しました': 'Thông tin đặt hộ đang trống nên đã chuyển về đặt cho cá nhân',
    '代理予約の情報が未入力のため、本人予約に戻しました。': 'Thông tin đặt hộ chưa nhập nên đã chuyển về đặt cho cá nhân.',
    'デモモードで予約を続行します': 'Tiếp tục đặt xe ở chế độ demo',
    '会員情報変更': 'Thay đổi thông tin hội viên',
    'ログアウト': 'Đăng xuất',
    '最終的なルートと料金を確認してください。': 'Vui lòng kiểm tra lộ trình và giá cuối cùng.',
    '乗車ルート': 'Lộ trình chuyến đi',
    '乗車予定': 'Thời gian đón',
    '所要時間': 'Thời gian',
    '走行距離': 'Quãng đường',
    '車種': 'Loại xe',
    'スタンダード': 'Tiêu chuẩn',
    '快適なセダン・禁煙車': 'Sedan thoải mái, không hút thuốc',
    'ドライバーへのメモ (任意)': 'Ghi chú cho tài xế (không bắt buộc)',
    '例: 大きな荷物があります、または待ち合わせ場所の詳細など...': 'Ví dụ: Tôi có hành lý lớn hoặc chi tiết điểm hẹn...',
    '料金詳細': 'Chi tiết giá',
    '基本運賃': 'Giá cơ bản',
    '距離加算': 'Phụ phí theo quãng đường',
    '自動計算': 'Tự động tính',
    '予約手数料': 'Phí đặt xe',
    '合計金額': 'Tổng tiền',
    '予約タイプ': 'Loại đặt xe',
    '自分用': 'Cho cá nhân',
    '代理予約': 'Đặt hộ',
    '送信中...': 'Đang gửi...',
    '予約を確定する': 'Xác nhận đặt xe',
    '代理予約の乗車者情報': 'Thông tin người đi hộ',
    '代理予約に切り替えたため、実際に乗車する方の情報を入力してください。': 'Bạn đã chuyển sang đặt hộ, vui lòng nhập thông tin người sẽ đi.',
    '乗車者氏名': 'Họ tên người đi',
    '連絡先電話番号': 'Số điện thoại liên hệ',
    '後で入力': 'Nhập sau',
    '保存する': 'Lưu',
    '到着予定時間': 'Thời gian đến dự kiến',
    '連絡する': 'Liên hệ',
    '請求書を発行': 'Xuất hóa đơn',
    '電子領収書': 'Biên lai điện tử',
    '利用日時': 'Ngày giờ sử dụng',
    '決済方法': 'Phương thức thanh toán',
    '乗車場所': 'Điểm đón',
    '降車場所': 'Điểm xuống',
    '項目': 'Hạng mục',
    '金額': 'Số tiền',
    'タクシー運賃 (4.8 km)': 'Cước taxi (4.8 km)',
    '予約・配車手数料': 'Phí đặt xe và điều phối',
    '領収金額 (税込)': 'Số tiền biên lai (gồm thuế)',
    '（内消費税10%：¥62）': '(Đã gồm thuế tiêu thụ 10%: ¥62)',
    'PDF保存': 'Lưu PDF',
    'メールで送信': 'Gửi qua email',
    'ドライバー評価へ': 'Đến đánh giá tài xế',
  },
  en: {
    'ホーム': 'Home',
    'アカウント': 'Account',
    'ドライバー情報': 'Driver Info',
    'こんにちは！': 'Hello!',
    'どこへ行きますか?': 'Where are you going?',
    'どこへ行きますか？': 'Where are you going?',
    '目的地・住所を入力、または履歴から選択': 'Enter a destination or choose from history',
    '職場': 'Work',
    '自宅': 'Home',
    'お気に': 'Favorites',
    'もっと見る': 'More',
    '今すぐタクシーを呼ぶ': 'Call a taxi now',
    'すぐに予約': 'Book now',
    '次の配車を確認しますか?': 'Check the next ride request?',
    '予約内容を確認': 'Review booking details',
    '乗車場所・目的地・料金を確認して受付へ進む': 'Check pickup, destination, and fare before continuing',
    'プロフィール': 'Profile',
    '公開情報を編集': 'Edit public info',
    'チャット': 'Chat',
    '利用者へ連絡': 'Contact customer',
    '待機状況': 'Ride status',
    '時間と距離を表示': 'Show time and distance',
    '配車確認へ進む': 'Go to ride confirmation',
    '確認後、チャット・待機状況・請求書へ': 'After confirming, use chat, status, and invoice',
    '検索中...': 'Searching...',
    'プロフィールで住所を設定': 'Set address in profile',
    '丁寧な対応': 'Polite service',
    '安全運転': 'Safe driving',
    '車内が清潔': 'Clean vehicle',
    'ルートが最適': 'Good route',
    '日本語が堪能': 'Good Japanese',
    'フィードバック': 'Feedback',
    '送信': 'Send',
    '田中 ドライバー': 'Driver Tanaka',
    '今回の乗車はいかがでしたか？': 'How was this ride?',
    '素晴らしい!': 'Excellent!',
    '良かった点（複数選択可）': 'What went well? Select any',
    'ドライバーへのメッセージ（任意）': 'Message to driver (optional)',
    '評価を送信する': 'Submit rating',
    'ルート詳細': 'Route details',
    'ルートマップ': 'Route map',
    '地図操作': 'Map controls',
    '拡大': 'Zoom in',
    '縮小': 'Zoom out',
    '地図を戻す': 'Reset map',
    'ドライバー位置': 'Driver location',
    '近くのタクシー': 'Nearby taxi',
    '現在位置': 'Current location',
    'ホアンキエム湖': 'Hoan Kiem Lake',
    'ホアンキエム周辺': 'Hoan Kiem area',
    'ハノイ・ホアンキエム周辺': 'Hanoi Hoan Kiem area',
    'ロッテホテル ハノイ': 'Lotte Hotel Hanoi',
    'ロッテホテル': 'Lotte Hotel',
    'ノイバイ国際空港': 'Noi Bai International Airport',
    'チャンティエン通り': 'Trang Tien Street',
    'キムマー通り': 'Kim Ma Street',
    '出発地': 'Pickup',
    '目的地': 'Destination',
    '乗車地': 'Pickup point',
    '現在': 'Now',
    '直進 1.1 km': 'Go straight 1.1 km',
    '右折して 2.7 km 進む': 'Turn right and continue 2.7 km',
    '半径2km以内の配車リクエストを検索しています...': 'Searching for ride requests within 2 km...',
    '半径2km以内の配車リクエストを検索しています。': 'Searching for ride requests within 2 km.',
    '条件に合う配車リクエストはまだありません。': 'No matching ride requests yet.',
    'この配車リクエストを承認できませんでした。': 'Could not accept this ride request.',
    '通知': 'Notifications',
    '配車リクエスト確認': 'Ride Request Confirmation',
    '半径2km以内で実際に予約中のお客様だけを表示します。': 'Only real customers booking within 2 km are shown.',
    'ドライバーはオンラインです': 'Driver is online',
    '受付範囲: 2 km': 'Service range: 2 km',
    'お迎え地点まで': 'To pickup point',
    'スキップ': 'Skip',
    '承認中...': 'Accepting...',
    '承認する': 'Accept',
    'お客様情報': 'Customer information',
    '電話番号未登録': 'Phone not registered',
    '読み込み中...': 'Loading...',
    '配車リクエストを検索中': 'Searching for ride requests',
    '連絡先を確認中': 'Checking contact',
    'お迎え': 'Pickup',
    '範囲': 'Range',
    '状態': 'Status',
    '新規': 'New',
    '近くのお客様を検索しています': 'Searching for nearby customers',
    '予約リクエストがない場合、サンプルデータは表示しません。': 'Sample data is not shown when there are no booking requests.',
    'お迎え予定時間': 'Estimated pickup time',
    '電話': 'Call',
    'メッセージ': 'Message',
    '目的地に到着': 'Arrived at destination',
    '乗車記録と料金の確認': 'Review ride record and fare',
    '出発': 'Departed',
    '到着': 'Arrived',
    '運賃 (4.8 km)': 'Fare (4.8 km)',
    '予約・サービス料': 'Booking and service fee',
    'お支払い合計': 'Payment total',
    '変更 〉': 'Change 〉',
    '戻る': 'Back',
    'お支払いを確定する': 'Confirm payment',
    '領収書を発行する': 'Issue receipt',
    'お問い合わせはこちら': 'Contact support',
    '支払い方法を選択': 'Choose payment method',
    '閉じる': 'Close',
    '現金': 'Cash',
    '選択中': 'Selected',
    '選択': 'Select',
    'この方法にする': 'Use this method',
    'メッセージを入力...': 'Enter a message...',
    '今どこですか？': 'Where are you?',
    '着きました！': 'I have arrived!',
    '少し遅れます': 'I will be a little late',
    '了解です': 'Understood',
    'こんにちは、田中です。現在向かっています。': 'Hello, this is Tanaka. I am on my way.',
    '承知いたしました。ホテルのロビー入り口で待っています。': 'Understood. I will wait at the hotel lobby entrance.',
    'ありがとうございます。黒色のトヨタ・ヴィオス、ナンバー「30A-123.45」です。まもなく到着します。': 'Thank you. It is a black Toyota Vios, plate 30A-123.45. I will arrive soon.',
    'サポートセンター': 'Support Center',
    '昨日': 'Yesterday',
    'お問い合わせの件につきまして、担当者が確認中です。': 'A staff member is checking your inquiry.',
    '佐藤 お客様': 'Customer Sato',
    '乗車地点で待機中': 'Waiting at pickup point',
    '走行中 (あと3分で到着)': 'En route (arriving in 3 minutes)',
    'タクシーを呼び出し中': 'Calling a taxi',
    '半径2km以内のドライバーを検索しています...': 'Searching for drivers within 2 km...',
    'キャンセル': 'Cancel',
    '予約内容を確認しました': 'Booking details confirmed',
    '代理予約の情報が空のため、自分用に戻しました': 'Proxy booking info is empty, so it was changed back to personal booking',
    '代理予約の情報が未入力のため、本人予約に戻しました。': 'Proxy booking info is missing, so it was changed back to personal booking.',
    'デモモードで予約を続行します': 'Continuing booking in demo mode',
    '会員情報変更': 'Edit member information',
    'ログアウト': 'Logout',
    '最終的なルートと料金を確認してください。': 'Please review the final route and fare.',
    '乗車ルート': 'Ride route',
    '乗車予定': 'Pickup time',
    '所要時間': 'Duration',
    '走行距離': 'Distance',
    '車種': 'Vehicle type',
    'スタンダード': 'Standard',
    '快適なセダン・禁煙車': 'Comfortable non-smoking sedan',
    'ドライバーへのメモ (任意)': 'Note to driver (optional)',
    '例: 大きな荷物があります、または待ち合わせ場所の詳細など...': 'Example: I have large luggage or details about the meeting point...',
    '料金詳細': 'Fare details',
    '基本運賃': 'Base fare',
    '距離加算': 'Distance charge',
    '自動計算': 'Auto calculated',
    '予約手数料': 'Booking fee',
    '合計金額': 'Total',
    '予約タイプ': 'Booking type',
    '自分用': 'For myself',
    '代理予約': 'Book for someone',
    '送信中...': 'Sending...',
    '予約を確定する': 'Confirm booking',
    '代理予約の乗車者情報': 'Proxy passenger information',
    '代理予約に切り替えたため、実際に乗車する方の情報を入力してください。': 'You switched to proxy booking. Enter the actual passenger information.',
    '乗車者氏名': 'Passenger name',
    '連絡先電話番号': 'Contact phone number',
    '後で入力': 'Enter later',
    '保存する': 'Save',
    '到着予定時間': 'Estimated arrival',
    '連絡する': 'Contact',
    '請求書を発行': 'Issue invoice',
    '電子領収書': 'Electronic Receipt',
    '利用日時': 'Date and time',
    '決済方法': 'Payment method',
    '乗車場所': 'Pickup location',
    '降車場所': 'Drop-off location',
    '項目': 'Item',
    '金額': 'Amount',
    'タクシー運賃 (4.8 km)': 'Taxi fare (4.8 km)',
    '予約・配車手数料': 'Booking and dispatch fee',
    '領収金額 (税込)': 'Receipt amount (tax included)',
    '（内消費税10%：¥62）': '(Includes 10% consumption tax: ¥62)',
    'PDF保存': 'Save PDF',
    'メールで送信': 'Send by email',
    'ドライバー評価へ': 'Go to driver review',
  },
};

const textOriginals = new WeakMap();
const attributeOriginals = new WeakMap();
const translatedAttributes = ['placeholder', 'aria-label', 'title'];
const ignoredTags = new Set(['SCRIPT', 'STYLE', 'NOSCRIPT']);

function preservePadding(original, translated) {
  const leading = original.match(/^\s*/)?.[0] || '';
  const trailing = original.match(/\s*$/)?.[0] || '';
  return `${leading}${translated}${trailing}`;
}

function translateText(original, language) {
  if (language === 'ja') return original;

  const dictionary = textByLanguage[language] || {};
  const trimmed = original.trim();
  if (!trimmed) return original;

  if (dictionary[trimmed]) return preservePadding(original, dictionary[trimmed]);

  let translated = original;
  const sortedEntries = Object.entries(dictionary).sort((a, b) => b[0].length - a[0].length);
  for (const [source, target] of sortedEntries) {
    translated = translated.split(source).join(target);
  }

  if (translated !== original) return translated;

  if (language === 'vi') {
    translated = translated
      .replace(/約(.+)/g, 'Khoảng $1')
      .replace(/あと\s*(.+)/g, 'Còn $1')
      .replace(/(.+)で待機中/g, 'Đang chờ tại $1')
      .replace(/お客様:\s*(.+)/g, 'Khách hàng: $1')
      .replace(/近くに\s*/g, 'Có ')
      .replace(/台/g, ' xe')
      .replace(/の車両が見つかりました。ドライバーの応答を待っています。/g, ' gần đây. Đang chờ tài xế phản hồi.')
      .replace(/(.+)分/g, '$1 phút');
  } else if (language === 'en') {
    translated = translated
      .replace(/約(.+)/g, 'Approx. $1')
      .replace(/あと\s*(.+)/g, '$1 left')
      .replace(/(.+)で待機中/g, 'Waiting at $1')
      .replace(/お客様:\s*(.+)/g, 'Customer: $1')
      .replace(/近くに\s*/g, 'Found ')
      .replace(/台/g, ' cars')
      .replace(/の車両が見つかりました。ドライバーの応答を待っています。/g, ' nearby. Waiting for driver response.')
      .replace(/(.+)分/g, '$1 min');
  }

  return translated;
}

function isFreshDynamicValue(current, original, language) {
  if (current === original) return false;
  return current !== translateText(original, language);
}

function applyTranslations(root, language) {
  if (!root || ignoredTags.has(root.nodeName)) return;

  if (root.nodeType === Node.TEXT_NODE) {
    const current = root.nodeValue || '';
    if (!textOriginals.has(root)) {
      textOriginals.set(root, current);
    } else {
      const cached = textOriginals.get(root) || '';
      if (isFreshDynamicValue(current, cached, language)) {
        textOriginals.set(root, current);
      }
    }
    const original = textOriginals.get(root) || '';
    const next = translateText(original, language);
    if (root.nodeValue !== next) root.nodeValue = next;
    return;
  }

  if (root.nodeType !== Node.ELEMENT_NODE) return;

  for (const attr of translatedAttributes) {
    if (!root.hasAttribute(attr)) continue;
    let originals = attributeOriginals.get(root);
    if (!originals) {
      originals = {};
      attributeOriginals.set(root, originals);
    }
    if (!Object.prototype.hasOwnProperty.call(originals, attr)) {
      originals[attr] = root.getAttribute(attr) || '';
    } else {
      const current = root.getAttribute(attr) || '';
      if (isFreshDynamicValue(current, originals[attr], language)) {
        originals[attr] = current;
      }
    }
    const next = translateText(originals[attr], language);
    if (root.getAttribute(attr) !== next) root.setAttribute(attr, next);
  }

  const walker = document.createTreeWalker(
    root,
    NodeFilter.SHOW_TEXT | NodeFilter.SHOW_ELEMENT,
    {
      acceptNode(node) {
        if (node.nodeType === Node.ELEMENT_NODE && ignoredTags.has(node.nodeName)) {
          return NodeFilter.FILTER_REJECT;
        }
        return NodeFilter.FILTER_ACCEPT;
      },
    },
  );

  const nodes = [];
  while (walker.nextNode()) nodes.push(walker.currentNode);
  nodes.forEach((node) => applyTranslations(node, language));
}

export default function RuntimePageTranslator() {
  const [language, setLanguage] = useState(getStoredProfileLanguage);
  const observerRef = useRef(null);

  useEffect(() => {
    function syncLanguage(event) {
      setLanguage(event.detail?.language || getStoredProfileLanguage());
    }

    window.addEventListener(LANGUAGE_EVENT, syncLanguage);
    window.addEventListener('storage', syncLanguage);
    return () => {
      window.removeEventListener(LANGUAGE_EVENT, syncLanguage);
      window.removeEventListener('storage', syncLanguage);
    };
  }, []);

  useEffect(() => {
    applyTranslations(document.body, language);

    observerRef.current?.disconnect();
    observerRef.current = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        if (mutation.type === 'characterData') {
          applyTranslations(mutation.target, language);
        }
        mutation.addedNodes.forEach((node) => applyTranslations(node, language));
        if (mutation.type === 'attributes') {
          applyTranslations(mutation.target, language);
        }
      }
    });

    observerRef.current.observe(document.body, {
      attributes: true,
      attributeFilter: translatedAttributes,
      characterData: true,
      childList: true,
      subtree: true,
    });

    return () => observerRef.current?.disconnect();
  }, [language]);

  return null;
}
