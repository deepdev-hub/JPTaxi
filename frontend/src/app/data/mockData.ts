export type Role = "diner" | "owner" | "guest";

export interface User {
  id: string;
  name: string;
  nameJp?: string;
  email: string;
  phone?: string;
  address?: string;
  role: Role;
  avatar?: string;
}

export interface MenuItem {
  id: string;
  nameVn: string;
  nameJp: string;
  price: number;
  description?: string;
  image?: string;
}

export interface Review {
  id: string;
  restaurantId: string;
  userId: string;
  userName: string;
  userAvatar?: string;
  rating: number;
  comment: string;
  date: string;
  images?: string[];
  likes: number;
  dislikes: number;
  userLiked?: boolean;
  userDisliked?: boolean;
}

export interface Restaurant {
  id: string;
  ownerId: string;
  nameVn: string;
  nameJp: string;
  address: string;
  addressJp?: string;
  phone: string;
  description: string;
  descriptionJp?: string;
  coverImage: string;
  images: string[];
  menu: MenuItem[];
  openHours: string;
  priceRange: string;
  avgPrice: number;
  tags: string[];
  rating: number;
  reviewCount: number;
  distance?: number;
  status: "open" | "closed";
  lat: number;
  lng: number;
}

export interface Message {
  id: string;
  senderId: string;
  receiverId: string;
  restaurantId?: string;
  content: string;
  timestamp: string;
  read: boolean;
}

export interface Conversation {
  id: string;
  participants: string[];
  lastMessage: string;
  lastTimestamp: string;
  restaurantId?: string;
  restaurantName?: string;
}

// Mock Users
export const mockUsers: User[] = [
  {
    id: "u1",
    name: "田中 太郎",
    nameJp: "田中 太郎",
    email: "tanaka@example.com",
    phone: "+81 90-1234-5678",
    address: "Hoàn Kiếm, Hà Nội",
    role: "diner",
    avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&h=150&fit=crop",
  },
  {
    id: "u2",
    name: "Nguyễn Văn An",
    email: "an.nguyen@example.com",
    phone: "0912 345 678",
    address: "36 Phố Cổ, Hoàn Kiếm, Hà Nội",
    role: "owner",
    avatar: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&h=150&fit=crop",
  },
  {
    id: "u3",
    name: "山田 花子",
    nameJp: "山田 花子",
    email: "yamada@example.com",
    phone: "+81 80-9876-5432",
    address: "Ba Đình, Hà Nội",
    role: "diner",
    avatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&h=150&fit=crop",
  },
  {
    id: "u4",
    name: "Trần Thị Bích",
    email: "bich.tran@example.com",
    phone: "0987 654 321",
    address: "Tây Hồ, Hà Nội",
    role: "owner",
    avatar: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150&h=150&fit=crop",
  },
  {
    id: "u5",
    name: "鈴木 一郎",
    nameJp: "鈴木 一郎",
    email: "suzuki@example.com",
    phone: "+81 70-5555-1234",
    address: "Đống Đa, Hà Nội",
    role: "diner",
    avatar: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&h=150&fit=crop",
  },
];

// Mock Restaurants
export const mockRestaurants: Restaurant[] = [
  {
    id: "r1",
    ownerId: "u2",
    nameVn: "Phở Bắc Cổ Truyền",
    nameJp: "バックコー伝統フォー",
    address: "12 Hàng Bún, Hoàn Kiếm, Hà Nội",
    addressJp: "12 ハンブン通り、ホアンキエム、ハノイ",
    phone: "024 3826 1011",
    description: "Quán phở truyền thống Hà Nội hơn 30 năm, nước dùng đậm đà, thịt bò tươi ngon. Chủ quán nói được tiếng Nhật cơ bản.",
    descriptionJp: "30年以上の歴史を持つ伝統的なハノイのフォー専門店。濃厚なスープと新鮮な牛肉が自慢です。日本語でご注文いただけます。",
    coverImage: "https://images.unsplash.com/photo-1677837914128-2367031a11e7?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=1080",
    images: [
      "https://images.unsplash.com/photo-1677837914128-2367031a11e7?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=800",
      "https://images.unsplash.com/photo-1738573519644-93b700f3adf3?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=800",
    ],
    menu: [
      { id: "m1", nameVn: "Phở bò tái", nameJp: "牛肉フォー（レア）", price: 65000, description: "Bánh phở, thịt bò tái, nước dùng xương hầm 12 tiếng" },
      { id: "m2", nameVn: "Phở bò chín", nameJp: "牛肉フォー（ウェルダン）", price: 65000, description: "Thịt bò chín mềm, nước dùng trong" },
      { id: "m3", nameVn: "Phở gà", nameJp: "鶏肉フォー", price: 55000, description: "Gà ta nấu chín vàng, nước dùng ngọt thanh" },
      { id: "m4", nameVn: "Phở đặc biệt", nameJp: "スペシャルフォー", price: 85000, description: "Tổng hợp bò tái + bò chín + gân + sách" },
    ],
    openHours: "06:00 - 22:00",
    priceRange: "40k - 90k VND",
    avgPrice: 65000,
    tags: ["Phở", "Bò", "Truyền thống", "Sáng"],
    rating: 4.7,
    reviewCount: 128,
    distance: 0.8,
    status: "open",
    lat: 21.034,
    lng: 105.847,
  },
  {
    id: "r2",
    ownerId: "u4",
    nameVn: "Bún Chả Hà Nội Chị Liên",
    nameJp: "ハノイ・ブンチャー チ・リエン",
    address: "24 Lê Văn Hưu, Hai Bà Trưng, Hà Nội",
    addressJp: "24 レ・ヴァン・フゥー通り、ハイバーチュン、ハノイ",
    phone: "024 3944 5678",
    description: "Bún chả nổi tiếng Hà Nội, thịt nướng thơm lừng, nước chấm đậm vị. Obama từng ghé thăm khu vực này.",
    descriptionJp: "ハノイで有名なブンチャー専門店。香ばしく焼いた豚肉と特製タレが絶品。日本語メニューあり。",
    coverImage: "https://images.unsplash.com/photo-1763703544688-2ac7839b0659?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=1080",
    images: [
      "https://images.unsplash.com/photo-1763703544688-2ac7839b0659?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=800",
      "https://images.unsplash.com/photo-1656945843375-207bb6e47750?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=800",
    ],
    menu: [
      { id: "m5", nameVn: "Bún chả thường", nameJp: "ブンチャー（レギュラー）", price: 55000, description: "Bún, chả miếng, chả viên, nước mắm" },
      { id: "m6", nameVn: "Bún chả đặc biệt", nameJp: "ブンチャー（スペシャル）", price: 75000, description: "Bún, chả + nem cuốn + nước mắm đặc biệt" },
      { id: "m7", nameVn: "Nem cuốn", nameJp: "ネムクォン（揚げ春巻き）", price: 20000, description: "Nem chiên giòn" },
    ],
    openHours: "10:30 - 21:00",
    priceRange: "50k - 80k VND",
    avgPrice: 65000,
    tags: ["Bún chả", "Truyền thống", "Trưa"],
    rating: 4.5,
    reviewCount: 95,
    distance: 1.2,
    status: "open",
    lat: 21.028,
    lng: 105.852,
  },
  {
    id: "r3",
    ownerId: "u2",
    nameVn: "Nhà Hàng Việt Xưa",
    nameJp: "ベトナム昔レストラン",
    address: "8 Tống Duy Tân, Hoàn Kiếm, Hà Nội",
    addressJp: "8 トン・ズイ・タン通り、ホアンキエム、ハノイ",
    phone: "024 3266 7890",
    description: "Nhà hàng không gian cổ kính Hà Nội xưa, phục vụ các món ăn truyền thống Bắc Bộ. Staff nói tiếng Nhật lưu loát.",
    descriptionJp: "昔のハノイの雰囲気を再現したレストラン。北部ベトナムの伝統料理を提供。日本語スタッフ在籍。",
    coverImage: "https://images.unsplash.com/photo-1761409260819-c6da12bbb2c0?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=1080",
    images: [
      "https://images.unsplash.com/photo-1761409260819-c6da12bbb2c0?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=800",
      "https://images.unsplash.com/photo-1767093055020-132167f12142?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=800",
    ],
    menu: [
      { id: "m8", nameVn: "Chả cá Lã Vọng", nameJp: "チャーカー・ラーヴォン（ターメリック魚炒め）", price: 180000, description: "Cá lóc tẩm nghệ nướng, ăn kèm bún, rau thơm, mắm tôm" },
      { id: "m9", nameVn: "Nem rán", nameJp: "揚げ春巻き", price: 60000, description: "Nem rán thịt lợn, mộc nhĩ, miến" },
      { id: "m10", nameVn: "Bún bò Nam Bộ", nameJp: "南部風牛肉ヌードル", price: 75000, description: "Bún, thịt bò xào, đậu phộng, rau sống" },
      { id: "m11", nameVn: "Cơm rang dưa bò", nameJp: "牛肉キムチチャーハン", price: 65000, description: "Cơm rang cùng dưa cải và thịt bò" },
    ],
    openHours: "11:00 - 22:30",
    priceRange: "60k - 200k VND",
    avgPrice: 120000,
    tags: ["Truyền thống", "Chả cá", "Nem", "Dinner"],
    rating: 4.8,
    reviewCount: 203,
    distance: 0.5,
    status: "open",
    lat: 21.035,
    lng: 105.848,
  },
  {
    id: "r4",
    ownerId: "u4",
    nameVn: "Bánh Mì 25",
    nameJp: "バインミー25",
    address: "25 Hàng Cá, Hoàn Kiếm, Hà Nội",
    addressJp: "25 ハンカー通り、ホアンキエム、ハノイ",
    phone: "024 3828 1112",
    description: "Bánh mì nổi tiếng nhất phố cổ Hà Nội. Vỏ bánh giòn, nhân đa dạng, giá cực hợp lý. Chủ quán học tiếng Nhật 5 năm.",
    descriptionJp: "ハノイ旧市街で最も有名なバインミー専門店。サクサクのパンと豊富な具材が人気。日本語で接客可能。",
    coverImage: "https://images.unsplash.com/photo-1763703686238-bb654515259c?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=1080",
    images: [
      "https://images.unsplash.com/photo-1763703686238-bb654515259c?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=800",
    ],
    menu: [
      { id: "m12", nameVn: "Bánh mì thịt nguội", nameJp: "コールドカットバインミー", price: 30000, description: "Pate, giăm bông, chả lụa, dưa góp" },
      { id: "m13", nameVn: "Bánh mì trứng", nameJp: "卵バインミー", price: 25000, description: "Trứng ốp la, pate, tương ớt" },
      { id: "m14", nameVn: "Bánh mì xíu mại", nameJp: "ミートボールバインミー", price: 35000, description: "Xíu mại sốt cà chua đặc biệt" },
    ],
    openHours: "06:30 - 20:00",
    priceRange: "25k - 40k VND",
    avgPrice: 30000,
    tags: ["Bánh mì", "Sáng", "Nhanh", "Rẻ"],
    rating: 4.4,
    reviewCount: 67,
    distance: 1.5,
    status: "open",
    lat: 21.033,
    lng: 105.849,
  },
  {
    id: "r5",
    ownerId: "u2",
    nameVn: "Cơm Tấm Sài Gòn Hà Nội",
    nameJp: "サイゴン風コムタム ハノイ店",
    address: "156 Bà Triệu, Hai Bà Trưng, Hà Nội",
    addressJp: "156 バ・チュー通り、ハイバーチュン、ハノイ",
    phone: "024 3976 5432",
    description: "Cơm tấm sườn nướng phong cách Sài Gòn tại Hà Nội. Sườn mềm, cơm tơi, trứng ốp la, chả trứng.",
    descriptionJp: "ハノイにいながらサイゴン風コムタムが楽しめる。柔らかいポークリブ、ふっくらごはん、目玉焼き付き。日本語メニューあり。",
    coverImage: "https://images.unsplash.com/photo-1723864203413-a35239f63a4d?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=1080",
    images: [
      "https://images.unsplash.com/photo-1723864203413-a35239f63a4d?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=800",
      "https://images.unsplash.com/photo-1738573519644-93b700f3adf3?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=800",
    ],
    menu: [
      { id: "m15", nameVn: "Cơm tấm sườn đặc biệt", nameJp: "コムタム・スペシャル", price: 75000, description: "Cơm tấm + sườn nướng + chả trứng + trứng ốp + bì + nước mắm" },
      { id: "m16", nameVn: "Cơm tấm sườn thường", nameJp: "コムタム・レギュラー", price: 55000, description: "Cơm tấm + sườn nướng + nước mắm" },
      { id: "m17", nameVn: "Cơm tấm bì", nameJp: "コムタム・ビー", price: 50000, description: "Cơm tấm + bì + chả trứng" },
    ],
    openHours: "07:00 - 21:00",
    priceRange: "50k - 80k VND",
    avgPrice: 65000,
    tags: ["Cơm tấm", "Sườn nướng", "Trưa"],
    rating: 4.3,
    reviewCount: 44,
    distance: 2.1,
    status: "open",
    lat: 21.020,
    lng: 105.845,
  },
  {
    id: "r6",
    ownerId: "u4",
    nameVn: "Gỏi Cuốn Tươi Tám Thảo",
    nameJp: "タム・タオ 生春巻き専門店",
    address: "43 Nguyễn Hữu Huân, Hoàn Kiếm, Hà Nội",
    addressJp: "43 グエン・フー・フアン通り、ホアンキエム、ハノイ",
    phone: "024 3825 9988",
    description: "Quán gỏi cuốn tươi ngon nổi tiếng với các loại rau sống phong phú, tôm tươi và nước chấm đặc biệt.",
    descriptionJp: "新鮮な野菜とエビを使った生春巻き専門店。特製タレが絶品。ヘルシーな一品をぜひ。",
    coverImage: "https://images.unsplash.com/photo-1656945843375-207bb6e47750?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=1080",
    images: [
      "https://images.unsplash.com/photo-1656945843375-207bb6e47750?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=800",
    ],
    menu: [
      { id: "m18", nameVn: "Gỏi cuốn tôm thịt", nameJp: "エビ豚生春巻き", price: 45000, description: "Tôm sú, thịt luộc, rau sống, bún, nước chấm tương hoisin" },
      { id: "m19", nameVn: "Gỏi cuốn chay", nameJp: "ベジタリアン生春巻き", price: 35000, description: "Đậu hũ, rau sống, bún, tương đậu phộng" },
      { id: "m20", nameVn: "Chả giò", nameJp: "揚げ春巻き", price: 40000, description: "Nem chiên giòn thịt lợn và rau củ" },
    ],
    openHours: "09:00 - 20:30",
    priceRange: "35k - 60k VND",
    avgPrice: 45000,
    tags: ["Gỏi cuốn", "Healthy", "Chay"],
    rating: 4.6,
    reviewCount: 81,
    distance: 0.9,
    status: "closed",
    lat: 21.031,
    lng: 105.853,
  },
];

// Mock Reviews
export const mockReviews: Review[] = [
  {
    id: "rev1",
    restaurantId: "r1",
    userId: "u1",
    userName: "田中 太郎",
    userAvatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=80&h=80&fit=crop",
    rating: 5,
    comment: "ハノイに来てから毎週通っています！スープの深みが素晴らしく、まるで本物のベトナムの味を体験しているようです。店主さんも日本語で優しく対応してくれて、とても安心して食事ができました。お肉も柔らかくて、ハーブの香りが食欲をそそります。絶対にまた来ます！",
    date: "2026-03-15",
    images: ["https://images.unsplash.com/photo-1677837914128-2367031a11e7?w=200&h=200&fit=crop"],
    likes: 24,
    dislikes: 1,
  },
  {
    id: "rev2",
    restaurantId: "r1",
    userId: "u3",
    userName: "山田 花子",
    userAvatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=80&h=80&fit=crop",
    rating: 4,
    comment: "フォーは美味しかったです。スープは少し塩辛めですが、それが逆に病みつきになる味わいです。日本語メニューがあるのでとても頼みやすかったです。朝6時から営業しているので出張前の朝食にも最適です。次回はフォーガを試してみたいと思います。",
    date: "2026-03-10",
    likes: 12,
    dislikes: 0,
  },
  {
    id: "rev3",
    restaurantId: "r1",
    userId: "u5",
    userName: "鈴木 一郎",
    userAvatar: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=80&h=80&fit=crop",
    rating: 5,
    comment: "出張でハノイに来るたびに必ず立ち寄る一軒です。フォーの麺はもちもちしていて、出汁の風味が格別。ベトナム語が全くわからない私でも、日本語で丁寧に説明してもらえました。値段も手頃で、コスパ最高です！ぜひおすすめします。",
    date: "2026-02-28",
    likes: 18,
    dislikes: 2,
  },
  {
    id: "rev4",
    restaurantId: "r2",
    userId: "u1",
    userName: "田中 太郎",
    userAvatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=80&h=80&fit=crop",
    rating: 4,
    comment: "ブンチャーを初めて食べましたが、想像以上に美味しかったです！豚肉の焦げ目がついた部分が特に香ばしくて、特製タレとの相性が抜群です。店員さんが日本語で説明してくれたので、食べ方もよくわかりました。少し混んでいましたが、回転が早いので待ち時間は短かったです。",
    date: "2026-03-18",
    likes: 9,
    dislikes: 1,
  },
  {
    id: "rev5",
    restaurantId: "r3",
    userId: "u3",
    userName: "山田 花子",
    userAvatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=80&h=80&fit=crop",
    rating: 5,
    comment: "雰囲気が最高！古いハノイの街並みを感じさせる素敵なインテリアで、料理も本格的な北部ベトナム料理を堪能できました。チャーカーは初めてでしたが、ターメリックの香りと魚の旨みが見事に調和していて感動しました。スタッフの日本語レベルが高く、料理の説明や食材についても詳しく教えてもらえました。",
    date: "2026-03-20",
    images: ["https://images.unsplash.com/photo-1761409260819-c6da12bbb2c0?w=200&h=200&fit=crop"],
    likes: 31,
    dislikes: 0,
  },
  {
    id: "rev6",
    restaurantId: "r3",
    userId: "u5",
    userName: "鈴木 一郎",
    userAvatar: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=80&h=80&fit=crop",
    rating: 5,
    comment: "接待に使いました。日本のお客様もとても喜ばれていました。雰囲気、料理の質、サービスの全てが高水準で、特にスタッフの日本語対応が完璧でした。料金は少し高めですが、その価値は十分にあります。次回の接待でもまたここを選ぶつもりです。",
    date: "2026-03-05",
    likes: 22,
    dislikes: 1,
  },
  {
    id: "rev7",
    restaurantId: "r6",
    userId: "u1",
    userName: "田中 太郎",
    userAvatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=80&h=80&fit=crop",
    rating: 4,
    comment: "ヘルシーな食事が食べたい時にぴったりのお店です。生春巻きは新鮮な野菜とエビがたっぷりで、タレとの組み合わせが最高。ダイエット中でも罪悪感なく食べられます。日本語での対応も丁寧でした。",
    date: "2026-03-12",
    likes: 7,
    dislikes: 0,
  },
];

// Mock Messages
export const mockMessages: Message[] = [
  {
    id: "msg1",
    senderId: "u1",
    receiverId: "u2",
    restaurantId: "r1",
    content: "こんにちは！フォーを予約したいのですが、今夜6時に3人で行けますか？",
    timestamp: "2026-03-26T09:00:00",
    read: true,
  },
  {
    id: "msg2",
    senderId: "u2",
    receiverId: "u1",
    restaurantId: "r1",
    content: "はい、もちろんです！6時に3人様、承りました。お席を準備しておきます。何かアレルギーはございますか？",
    timestamp: "2026-03-26T09:05:00",
    read: true,
  },
  {
    id: "msg3",
    senderId: "u1",
    receiverId: "u2",
    restaurantId: "r1",
    content: "ありがとうございます！アレルギーは特にありません。楽しみにしています！",
    timestamp: "2026-03-26T09:10:00",
    read: true,
  },
  {
    id: "msg4",
    senderId: "u2",
    receiverId: "u1",
    restaurantId: "r1",
    content: "承知しました！お待ちしております。ご来店の際は12番のお席にご案内します。",
    timestamp: "2026-03-26T09:12:00",
    read: false,
  },
  {
    id: "msg5",
    senderId: "u3",
    receiverId: "u4",
    restaurantId: "r2",
    content: "すみません、ブンチャーのセットは何時まで注文できますか？",
    timestamp: "2026-03-26T11:30:00",
    read: true,
  },
  {
    id: "msg6",
    senderId: "u4",
    receiverId: "u3",
    restaurantId: "r2",
    content: "21時まで営業しております。ランチタイム（11:30〜13:30）は特にお客様が多いので、少し早めにいらっしゃることをおすすめします！",
    timestamp: "2026-03-26T11:35:00",
    read: false,
  },
];

export const mockConversations: Conversation[] = [
  {
    id: "conv1",
    participants: ["u1", "u2"],
    lastMessage: "承知しました！お待ちしております。ご来店の際は12番のお席にご案内します。",
    lastTimestamp: "2026-03-26T09:12:00",
    restaurantId: "r1",
    restaurantName: "Phở Bắc Cổ Truyền",
  },
  {
    id: "conv2",
    participants: ["u3", "u4"],
    lastMessage: "21時まで営業しております。ランチタイム（11:30〜13:30）は特にお客様が多いので...",
    lastTimestamp: "2026-03-26T11:35:00",
    restaurantId: "r2",
    restaurantName: "Bún Chả Hà Nội Chị Liên",
  },
];

export const foodTags = [
  "Phở", "Bún chả", "Bánh mì", "Gỏi cuốn", "Chả cá", "Cơm tấm",
  "Nem rán", "Bún bò", "Cơm rang", "Truyền thống", "Healthy", "Chay", "Rẻ"
];

export const currentUser: User = mockUsers[0]; // Default logged in as diner
