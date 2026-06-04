SET client_encoding = 'UTF8';

TRUNCATE TABLE
    messages,
    conversation_participants,
    conversations,
    review_reactions,
    review_images,
    reviews,
    share_links,
    menu_items,
    restaurant_tags,
    restaurant_images,
    restaurants,
    users
RESTART IDENTITY CASCADE;


INSERT INTO users (
    id, name, name_jp, email, password_hash,
    phone, address, role, avatar, enabled
)
VALUES
(
    'u1',
    '田中 太郎',
    '田中 太郎',
    'tanaka@example.com',
    '$2a$10$7qPvW6QdFSgQu7Dk4S9Rq.BfhP3QgbcbwEBCcWXtQVK7ykkwM.2Ta',
    '+81 90-1234-5678',
    'Hoàn Kiếm, Hà Nội',
    'diner',
    'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&h=150&fit=crop',
    TRUE
),
(
    'u2',
    'Nguyễn Văn An',
    NULL,
    'an.nguyen@example.com',
    '$2a$10$7qPvW6QdFSgQu7Dk4S9Rq.BfhP3QgbcbwEBCcWXtQVK7ykkwM.2Ta',
    '0912 345 678',
    '36 Phố Cổ, Hoàn Kiếm, Hà Nội',
    'owner',
    'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&h=150&fit=crop',
    TRUE
),
(
    'u3',
    '山田 花子',
    '山田 花子',
    'yamada@example.com',
    '$2a$10$7qPvW6QdFSgQu7Dk4S9Rq.BfhP3QgbcbwEBCcWXtQVK7ykkwM.2Ta',
    '+81 80-9876-5432',
    'Ba Đình, Hà Nội',
    'diner',
    'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&h=150&fit=crop',
    TRUE
),
(
    'u4',
    'Trần Thị Bích',
    NULL,
    'bich.tran@example.com',
    '$2a$10$7qPvW6QdFSgQu7Dk4S9Rq.BfhP3QgbcbwEBCcWXtQVK7ykkwM.2Ta',
    '0987 654 321',
    'Tây Hồ, Hà Nội',
    'owner',
    'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150&h=150&fit=crop',
    TRUE
),
(
    'u5',
    '鈴木 一郎',
    '鈴木 一郎',
    'suzuki@example.com',
    '$2a$10$7qPvW6QdFSgQu7Dk4S9Rq.BfhP3QgbcbwEBCcWXtQVK7ykkwM.2Ta',
    '+81 70-5555-1234',
    'Đống Đa, Hà Nội',
    'diner',
    'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&h=150&fit=crop',
    TRUE
);


INSERT INTO restaurants (
    id, owner_id,
    name_vn, name_jp,
    address, address_jp,
    phone,
    description, description_jp,
    cover_image,
    open_hours, price_range, avg_price,
    rating, review_count,
    status,
    lat, lng,
    supports_japanese
)
VALUES
(
    'r1',
    'u2',
    'Phở Bắc Cổ Truyền',
    'バックコー伝統フォー',
    '12 Hàng Bún, Hoàn Kiếm, Hà Nội',
    '12 ハンブン通り、ホアンキエム、ハノイ',
    '024 3826 1011',
    'Quán phở truyền thống Hà Nội hơn 30 năm, nước dùng đậm đà, thịt bò tươi ngon.',
    '30年以上の歴史を持つ伝統的なハノイのフォー専門店。日本語でご注文いただけます。',
    'https://images.unsplash.com/photo-1677837914128-2367031a11e7?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=1080',
    '06:00 - 22:00',
    '40k - 90k VND',
    65000,
    4.7,
    3,
    'open',
    21.034000,
    105.847000,
    TRUE
),
(
    'r2',
    'u4',
    'Bún Chả Hà Nội Chị Liên',
    'ハノイ・ブンチャー チ・リエン',
    '24 Lê Văn Hưu, Hai Bà Trưng, Hà Nội',
    '24 レ・ヴァン・フゥー通り、ハイバーチュン、ハノイ',
    '024 3944 5678',
    'Bún chả nổi tiếng Hà Nội, thịt nướng thơm lừng, nước chấm đậm vị.',
    'ハノイで有名なブンチャー専門店。日本語メニューあり。',
    'https://images.unsplash.com/photo-1763703544688-2ac7839b0659?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=1080',
    '10:30 - 21:00',
    '50k - 80k VND',
    65000,
    4.5,
    1,
    'open',
    21.028000,
    105.852000,
    TRUE
),
(
    'r3',
    'u2',
    'Nhà Hàng Việt Xưa',
    'ベトナム昔レストラン',
    '8 Tống Duy Tân, Hoàn Kiếm, Hà Nội',
    '8 トン・ズイ・タン通り、ホアンキエム、ハノイ',
    '024 3266 7890',
    'Nhà hàng không gian cổ kính Hà Nội xưa, phục vụ các món ăn truyền thống Bắc Bộ.',
    '昔のハノイの雰囲気を再現したレストラン。日本語スタッフ在籍。',
    'https://images.unsplash.com/photo-1761409260819-c6da12bbb2c0?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=1080',
    '11:00 - 22:30',
    '60k - 200k VND',
    120000,
    4.8,
    2,
    'open',
    21.035000,
    105.848000,
    TRUE
),
(
    'r4',
    'u4',
    'Bánh Mì 25',
    'バインミー25',
    '25 Hàng Cá, Hoàn Kiếm, Hà Nội',
    '25 ハンカー通り、ホアンキエム、ハノイ',
    '024 3828 1112',
    'Bánh mì nổi tiếng phố cổ Hà Nội. Vỏ bánh giòn, nhân đa dạng, giá hợp lý.',
    'ハノイ旧市街で有名なバインミー専門店。',
    'https://images.unsplash.com/photo-1763703686238-bb654515259c?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=1080',
    '06:30 - 20:00',
    '25k - 40k VND',
    30000,
    0.0,
    0,
    'open',
    21.033000,
    105.849000,
    TRUE
);


INSERT INTO restaurant_images (restaurant_id, image_url, sort_order)
VALUES
('r1', 'https://images.unsplash.com/photo-1677837914128-2367031a11e7?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=800', 1),
('r1', 'https://images.unsplash.com/photo-1738573519644-93b700f3adf3?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=800', 2),
('r2', 'https://images.unsplash.com/photo-1763703544688-2ac7839b0659?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=800', 1),
('r3', 'https://images.unsplash.com/photo-1761409260819-c6da12bbb2c0?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=800', 1),
('r4', 'https://images.unsplash.com/photo-1763703686238-bb654515259c?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=800', 1);


INSERT INTO restaurant_tags (restaurant_id, tag_name)
VALUES
('r1', 'Phở'),
('r1', 'Bò'),
('r1', 'Truyền thống'),
('r1', 'Sáng'),

('r2', 'Bún chả'),
('r2', 'Truyền thống'),
('r2', 'Trưa'),

('r3', 'Truyền thống'),
('r3', 'Chả cá'),
('r3', 'Nem'),
('r3', 'Dinner'),

('r4', 'Bánh mì'),
('r4', 'Sáng'),
('r4', 'Nhanh'),
('r4', 'Rẻ');


INSERT INTO menu_items (
    id, restaurant_id,
    name_vn, name_jp,
    price,
    description,
    description_jp,
    image,
    is_available
)
VALUES
('m1', 'r1', 'Phở bò tái', '牛肉フォー（レア）', 65000, 'Bánh phở, thịt bò tái, nước dùng xương hầm 12 tiếng', NULL, NULL, TRUE),
('m2', 'r1', 'Phở bò chín', '牛肉フォー（ウェルダン）', 65000, 'Thịt bò chín mềm, nước dùng trong', NULL, NULL, TRUE),
('m3', 'r1', 'Phở gà', '鶏肉フォー', 55000, 'Gà ta nấu chín vàng, nước dùng ngọt thanh', NULL, NULL, TRUE),

('m4', 'r2', 'Bún chả thường', 'ブンチャー（レギュラー）', 55000, 'Bún, chả miếng, chả viên, nước mắm', NULL, NULL, TRUE),
('m5', 'r2', 'Bún chả đặc biệt', 'ブンチャー（スペシャル）', 75000, 'Bún, chả, nem cuốn, nước mắm đặc biệt', NULL, NULL, TRUE),

('m6', 'r3', 'Chả cá Lã Vọng', 'チャーカー・ラーヴォン', 180000, 'Cá tẩm nghệ nướng, ăn kèm bún, rau thơm, mắm tôm', NULL, NULL, TRUE),
('m7', 'r3', 'Nem rán', '揚げ春巻き', 60000, 'Nem rán thịt lợn, mộc nhĩ, miến', NULL, NULL, TRUE),

('m8', 'r4', 'Bánh mì thịt nguội', 'コールドカットバインミー', 30000, 'Pate, giăm bông, chả lụa, dưa góp', NULL, NULL, TRUE),
('m9', 'r4', 'Bánh mì trứng', '卵バインミー', 25000, 'Trứng ốp la, pate, tương ớt', NULL, NULL, TRUE);


INSERT INTO reviews (
    id, restaurant_id, user_id,
    rating, comment,
    likes_count, dislikes_count,
    created_at
)
VALUES
(
    'rev1',
    'r1',
    'u1',
    5,
    'ハノイに来てから毎週通っています！スープの深みが素晴らしく、日本語で対応してくれて安心です。',
    2,
    0,
    '2026-03-15 10:00:00'
),
(
    'rev2',
    'r1',
    'u3',
    4,
    'フォーは美味しかったです。日本語メニューがあるので頼みやすかったです。',
    1,
    0,
    '2026-03-10 11:00:00'
),
(
    'rev3',
    'r2',
    'u1',
    4,
    'ブンチャーを初めて食べましたが、想像以上に美味しかったです。',
    1,
    1,
    '2026-03-18 12:00:00'
),
(
    'rev4',
    'r3',
    'u5',
    5,
    '接待に使いました。雰囲気、料理の質、サービスの全てが高水準でした。',
    3,
    0,
    '2026-03-20 19:00:00'
);


INSERT INTO review_images (review_id, image_url, sort_order)
VALUES
('rev1', 'https://images.unsplash.com/photo-1677837914128-2367031a11e7?w=200&h=200&fit=crop', 1),
('rev4', 'https://images.unsplash.com/photo-1761409260819-c6da12bbb2c0?w=200&h=200&fit=crop', 1);


INSERT INTO review_reactions (review_id, user_id, reaction_type)
VALUES
('rev1', 'u3', 'like'),
('rev1', 'u5', 'like'),
('rev2', 'u1', 'like'),
('rev3', 'u3', 'like'),
('rev3', 'u5', 'dislike'),
('rev4', 'u1', 'like'),
('rev4', 'u3', 'like'),
('rev4', 'u5', 'like');


INSERT INTO share_links (
    id, restaurant_id,
    share_token, share_url, qr_code_url,
    created_by
)
VALUES
(
    'share1',
    'r1',
    'pho-bac-co-truyen-r1',
    'http://localhost:5173/restaurants/r1?share=pho-bac-co-truyen-r1',
    'http://localhost:8081/api/share/pho-bac-co-truyen-r1/qr',
    'u1'
),
(
    'share2',
    'r3',
    'nha-hang-viet-xua-r3',
    'http://localhost:5173/restaurants/r3?share=nha-hang-viet-xua-r3',
    'http://localhost:8081/api/share/nha-hang-viet-xua-r3/qr',
    'u5'
);


INSERT INTO conversations (
    id, conversation_type,
    restaurant_id,
    last_message, last_message_at
)
VALUES
(
    'conv1',
    'restaurant',
    'r1',
    '承知しました！お待ちしております。',
    '2026-03-26 09:12:00'
),
(
    'conv2',
    'restaurant',
    'r2',
    '21時まで営業しております。',
    '2026-03-26 11:35:00'
);


INSERT INTO conversation_participants (conversation_id, user_id)
VALUES
('conv1', 'u1'),
('conv1', 'u2'),
('conv2', 'u3'),
('conv2', 'u4');


INSERT INTO messages (
    id, conversation_id,
    sender_id, receiver_id, restaurant_id,
    content, is_read, created_at
)
VALUES
(
    'msg1',
    'conv1',
    'u1',
    'u2',
    'r1',
    'こんにちは！フォーを予約したいのですが、今夜6時に3人で行けますか？',
    TRUE,
    '2026-03-26 09:00:00'
),
(
    'msg2',
    'conv1',
    'u2',
    'u1',
    'r1',
    'はい、もちろんです！6時に3人様、承りました。',
    TRUE,
    '2026-03-26 09:05:00'
),
(
    'msg3',
    'conv1',
    'u1',
    'u2',
    'r1',
    'ありがとうございます！アレルギーは特にありません。',
    TRUE,
    '2026-03-26 09:10:00'
),
(
    'msg4',
    'conv1',
    'u2',
    'u1',
    'r1',
    '承知しました！お待ちしております。',
    FALSE,
    '2026-03-26 09:12:00'
),
(
    'msg5',
    'conv2',
    'u3',
    'u4',
    'r2',
    'すみません、ブンチャーのセットは何時まで注文できますか？',
    TRUE,
    '2026-03-26 11:30:00'
),
(
    'msg6',
    'conv2',
    'u4',
    'u3',
    'r2',
    '21時まで営業しております。',
    FALSE,
    '2026-03-26 11:35:00'
);
