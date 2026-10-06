export const CATALOG = [
  {
    id: "t3-bookshelf", name: "Giá sách nghiên cứu", type: "js", topic: "topic-3",
    topicLabel: "Chủ đề 3", factory: "bookshelf", icon: "▥",
    description: "Giá sách 3D của cụm Học tập và nghiên cứu khoa học.",
    source: "Chủ đề 3/scripts/main.js"
  },
  {
    id: "t3-podium", name: "Bục phát biểu", type: "js", topic: "topic-3",
    topicLabel: "Chủ đề 3", factory: "podium", icon: "♜",
    description: "Bục gỗ viền kim loại dùng trong cụm nội dung truyền thống yêu nước.",
    source: "Chủ đề 3/scripts/main.js"
  },
  {
    id: "t3-screen", name: "Màn hình tương tác", type: "js", topic: "topic-3",
    topicLabel: "Chủ đề 3", factory: "interactiveScreen", icon: "▣",
    description: "Màn hình số dạng cong dùng để trình chiếu tư liệu hoạt động Đoàn.",
    source: "Chủ đề 3/scripts/main.js"
  },
  {
    id: "t3-wall-title", name: "Tiêu đề Học tập & NCKH", type: "js", topic: "topic-3",
    topicLabel: "Chủ đề 3 · Gắn tường", factory: "wallTitle", icon: "▰",
    description: "Biển tiêu đề màu chủ đề đặt phía trên mỗi cụm nội dung của phòng.",
    options: { title: "HỌC TẬP VÀ NGHIÊN CỨU KHOA HỌC", background: "#005baa", width: 8.5 },
    source: "Chủ đề 3/scripts/main.js · createReferenceTitle()"
  },
  {
    id: "t3-wall-title-patriotic", name: "Tiêu đề Yêu nước cách mạng", type: "js", topic: "topic-3",
    topicLabel: "Chủ đề 3 · Gắn tường", factory: "wallTitle", icon: "▰",
    description: "Biển tiêu đề màu đỏ của cụm Yêu nước cách mạng.",
    options: { title: "YÊU NƯỚC CÁCH MẠNG", background: "#e3000f", textColor: "#fff200", width: 7.5 },
    source: "Chủ đề 3/scripts/main.js · createReferenceTitle()"
  },
  {
    id: "t3-wall-title-volunteer", name: "Tiêu đề Dấu chân tình nguyện", type: "js", topic: "topic-3",
    topicLabel: "Chủ đề 3 · Gắn tường", factory: "wallTitle", icon: "▰",
    description: "Biển tiêu đề màu xanh của cụm Tình nguyện và Chất Sư phạm.",
    options: { title: "DẤU CHÂN TÌNH NGUYỆN & CHẤT SƯ PHẠM", background: "#009688", width: 9 },
    source: "Chủ đề 3/scripts/main.js · createReferenceTitle()"
  },
  {
    id: "t3-wall-title-campaign", name: "Tiêu đề Chiến dịch tình nguyện", type: "js", topic: "topic-3",
    topicLabel: "Chủ đề 3 · Gắn tường", factory: "wallTitle", icon: "▰",
    description: "Tiêu đề phụ cho nhóm ảnh chiến dịch tình nguyện.",
    options: { title: "CHIẾN DỊCH TÌNH NGUYỆN", background: "#00796b", width: 5 },
    source: "Chủ đề 3/scripts/main.js · createReferenceTitle()"
  },
  {
    id: "t3-wall-infographic", name: "Infographic Ba sẵn sàng", type: "js", topic: "topic-3",
    topicLabel: "Chủ đề 3 · Gắn tường", factory: "largeInfographic", icon: "▥",
    description: "Bảng infographic lớn của khu Yêu nước cách mạng, có khung và nội dung canvas.",
    source: "Chủ đề 3/scripts/main.js · createLargeInfographic()"
  },
  {
    id: "t3-wall-infographic-battle", name: "Infographic Xếp bút nghiên ra trận", type: "js", topic: "topic-3",
    topicLabel: "Chủ đề 3 · Gắn tường", factory: "largeInfographic", icon: "▥",
    description: "Infographic về cán bộ, sinh viên Sư phạm lên đường phục vụ chiến đấu.",
    options: {
      title: "XẾP BÚT NGHIÊN RA TRẬN", year: "1966",
      content: "Hàng ngàn cán bộ, sinh viên gác lại giấc mơ bục giảng, tham gia Đội Thanh niên Xung phong chống Mỹ cứu nước, phục vụ chiến đấu tại các chiến trường ác liệt nhất."
    },
    source: "Chủ đề 3/scripts/main.js · createLargeInfographic()"
  },
  {
    id: "t3-wall-picture", name: "Khung ảnh chiến dịch", type: "js", topic: "topic-3",
    topicLabel: "Chủ đề 3 · Gắn tường", factory: "wallPicture", icon: "▧",
    description: "Khung ảnh canvas dùng cho hai tư liệu chiến dịch tình nguyện tại Cụm 2.",
    options: { title: "Mùa hè xanh", subtitle: "Hoạt động tình nguyện", accent: "#009688" },
    source: "Chủ đề 3/scripts/main.js · createWallPicture()"
  },
  ...[
    ["summer", "Mùa hè xanh", "Hoạt động phát triển kinh tế xã hội"],
    ["exam", "Tiếp sức mùa thi", "Hỗ trợ thí sinh và người nhà"]
  ].map(([id, name, subtitle]) => ({
    id: `t3-wall-campaign-${id}`, name: `Khung chiến dịch ${name}`, type: "js", topic: "topic-3",
    topicLabel: "Chủ đề 3 · Gắn tường", factory: "wallPicture", icon: "▧",
    description: "Khung tư liệu của nhóm Chiến dịch tình nguyện.",
    options: { title: name, subtitle, accent: "#00796b" },
    source: "Chủ đề 3/scripts/main.js · createWallPicture()"
  })),
  {
    id: "t3-heatmap", name: "Bản đồ nhiệt tình nguyện", type: "js", topic: "topic-3",
    topicLabel: "Chủ đề 3 · Gắn tường", factory: "heatmapPanel", icon: "⌖",
    description: "Bản đồ tương tác mô tả các khu vực hoạt động tình nguyện miền Bắc.",
    source: "Chủ đề 3/scripts/main.js · createHeatmapPanel()"
  },
  {
    id: "t3-heatmap-tv", name: "TV thông tin bản đồ nhiệt", type: "js", topic: "topic-3",
    topicLabel: "Chủ đề 3 · Gắn tường", factory: "heatmapTV", icon: "▣",
    description: "Màn hình gắn tường hiển thị nội dung tương ứng khi chọn vùng trên bản đồ nhiệt.",
    source: "Chủ đề 3/scripts/main.js · createHeatmapTV()"
  },
  {
    id: "t3-central-infographic", name: "Infographic sảnh trung tâm", type: "js", topic: "topic-3",
    topicLabel: "Chủ đề 3 · Gắn tường", factory: "centralInfographic", icon: "▤",
    description: "Bảng tổng quan ba cột về lịch sử, phong trào và tài năng của HNUE.",
    source: "Chủ đề 3/scripts/main.js · createWallInfographic()"
  },
  {
    id: "t3-research-kiosk", name: "Bàn tra cứu NCKH", type: "js", topic: "topic-3",
    topicLabel: "Chủ đề 3 · Điểm tương tác", factory: "researchKiosk", icon: "▣",
    description: "Bàn tra cứu cảm ứng thấp, thân gỗ–xanh navy và viền đồng; đặt ở khoảng quan sát trước mảng tư liệu Cụm 3.",
    source: "Chủ đề 3/scripts/main.js · createResearchKiosk()"
  },
  ...[
    ['dang-thai-mai', 'GS. Đặng Thai Mai · khung phào gỗ', 'heritage-wood', '1-GS Dang Thai Mai.jpg', 2.05, 3.1],
    ['le-van-thiem', 'GS. TSKH. Lê Văn Thiêm · khung phào vàng', 'heritage-gold', '2. Lê Văn Thiêm.png', 2.1, 3.1],
    ['nguyen-quang-dieu', 'GS.TS. Nguyễn Quang Diệu · panel số ngang', 'digital-landscape', '3. GS NGUYỄN QUANG DIỆU.jpg', 3.0, 2.05],
    ['pham-hoang-hiep', 'PGS.TS. Phạm Hoàng Hiệp · panel số dọc', 'digital-portrait', '4. PHẠM HOÀNG HIỆP.webp', 2.4, 3.0],
    ['award-2018', 'Sinh viên NCKH cấp Bộ 2018 · bục thành tựu', 'award', '7. NCKH2018.jpeg', 2.9, 1.95],
    ['seminar-2025', 'Seminar NCKH 2025 · màn hình chuyên đề', 'seminar-screen', '6. SEMINAR.jpeg', 2.95, 1.95],
    ['research-2025', 'Giải thưởng NCKH 2025 · panorama số liệu', 'research-panorama', '5. NCKH 2025.jpg', 3.0, 1.85]
  ].map(([id, name, displayStyle, file, width, height]) => ({
    id: `t3-research-${id}`, name, type: 'js', topic: 'topic-3', topicLabel: 'Chủ đề 3 · NCKH', factory: 'researchExhibit', icon: '▧',
    description: 'Phiên bản đang được dựng thực tế trong Cụm 3, có ảnh tư liệu và cấu trúc khung riêng.',
    options: { displayStyle, title: name, subtitle: 'Học tập và nghiên cứu khoa học', imageUrl: `../Chủ đề 3/Tư liệu Cụm 3/${file}`, width, height },
    source: 'Chủ đề 3/scripts/main.js · createResearchExhibit()'
  })),
  {
    id: "t3-research-timeline", name: "Dải mốc NCKH cong", type: "js", topic: "topic-3",
    topicLabel: "Chủ đề 3 · Gắn tường", factory: "researchTimeline", icon: "⌁",
    description: "Dải mốc theo cung, liên kết di sản học thuật với thành tựu nghiên cứu và dữ liệu NCKH hiện nay.",
    source: "Chủ đề 3/scripts/main.js · createZoneTimeline()"
  },
  {
    id: "t4-bench", name: "Ghế gallery", type: "js", topic: "topic-4",
    topicLabel: "Chủ đề 4", factory: "galleryBench", icon: "▬",
    description: "Ghế ngồi trưng bày với đệm xanh xám và bệ gỗ ấm.",
    source: "Chủ đề 4/scripts/chu-de-4.js"
  },
  {
    id: "t4-window-seat", name: "Ghế cửa sổ", type: "js", topic: "topic-4",
    topicLabel: "Chủ đề 4", factory: "windowSeat", icon: "▤",
    description: "Cụm ghế dài kết hợp mảng kính, được tạo hoàn toàn bằng Three.js.",
    source: "Chủ đề 4/scripts/chu-de-4.js"
  },
  {
    id: "t4-showcase", name: "Tủ kính sản phẩm sáng tạo", type: "js", topic: "topic-4",
    topicLabel: "Chủ đề 4", factory: "glassShowcase", icon: "◇",
    description: "Tủ kính dài, hệ khung đồng và các bệ trưng bày sản phẩm sáng tạo.",
    source: "Chủ đề 4/scripts/chu-de-4.js"
  },
  {
    id: "t4-guestbook", name: "Bàn sổ lưu niệm", type: "js", topic: "topic-4",
    topicLabel: "Chủ đề 4", factory: "guestbookDesk", icon: "✎",
    description: "Bàn gỗ đặt sổ lưu niệm và bút ký ở khu vực cuối hành trình.",
    source: "Chủ đề 4/scripts/chu-de-4.js"
  },
  {
    id: "t5-frame", name: "Khung chân dung 3D", type: "js", topic: "topic-5",
    topicLabel: "Chủ đề 5", factory: "proceduralFrame", icon: "▧",
    description: "Khung chân dung nhiều lớp, bảng tên và vân gỗ được dựng hoàn toàn bằng mã.",
    source: "Phòng trưng bày vật thể/scripts/objects/procedural-frame.js"
  },
  {
    id: "t5-logo-hnue", name: "Logo HNUE có khung", type: "js", topic: "topic-5",
    topicLabel: "Chủ đề 5 · Nhận diện", factory: "framedLogoPanel", icon: "◉",
    description: "Logo HNUE trên nền tròn màu kem với hai vòng khung kim loại, sao chép từ cơ chế của Chủ đề 4.",
    options: { imageSrc: "./image/HNUE_logo.png", radius: 1.95 },
    source: "Phòng trưng bày vật thể/scripts/objects/framed-logo-panel.js"
  },
  {
    id: "t5-logo-doan", name: "Logo Đoàn có khung", type: "js", topic: "topic-5",
    topicLabel: "Chủ đề 5 · Nhận diện", factory: "framedLogoPanel", icon: "◉",
    description: "Logo Đoàn trên nền tròn màu kem với hai vòng khung kim loại, sao chép từ cơ chế của Chủ đề 4.",
    options: { imageSrc: "./image/doan_logo.png", radius: 1.95 },
    source: "Phòng trưng bày vật thể/scripts/objects/framed-logo-panel.js"
  },
  {
    id: "t5-logo-dang", name: "Biểu trưng Đảng có khung", type: "js", topic: "topic-5",
    topicLabel: "Chủ đề 5 · Nhận diện", factory: "framedLogoPanel", icon: "◉",
    description: "Cờ Đảng được crop giữa đúng tỷ lệ trong panel tròn, không làm méo biểu tượng gốc.",
    options: { imageSrc: "./image/co_Dang.jpg", radius: 1.95 },
    source: "Phòng trưng bày vật thể/scripts/objects/framed-logo-panel.js"
  },

  {
    id: "glb-bust", name: "Tượng chân dung Đặng Thai Mai", type: "glb", topic: "topic-5",
    topicLabel: "Chủ đề 5", icon: "♟",
    description: "Tượng chân dung dùng trong không gian Chủ đề 5.",
    url: "../Chủ đề 5/Meshy_AI_Bust_of_Đặng_Thai__0812151136_texture.glb",
    source: "Chủ đề 5/Meshy_AI_Bust_of_Đặng_Thai__0812151136_texture.glb"
  },
  {
    id: "glb-sofa-l", name: "Sofa chữ L", type: "glb", topic: "decor",
    topicLabel: "Đồ trang trí", icon: "⌑",
    description: "Mẫu sofa chữ L dùng để bố trí không gian nghỉ.",
    url: "../Đồ 3D decord/ghế sopha/source/L_sofa.glb",
    source: "Đồ 3D decord/ghế sopha/source/L_sofa.glb"
  },
  {
    id: "glb-office-sofa", name: "Sofa văn phòng", type: "glb", topic: "decor",
    topicLabel: "Đồ trang trí", icon: "⌑",
    description: "Sofa văn phòng tối ưu dung lượng, đang được dùng trong Chủ đề 5.",
    url: "../Đồ 3D decord/ghế sofa cũ/office_sofa_-25mb.glb",
    source: "Đồ 3D decord/ghế sofa cũ/office_sofa_-25mb.glb"
  },
  {
    id: "glb-lamp", name: "Đèn đứng chân dài", type: "glb", topic: "decor",
    topicLabel: "Đồ trang trí", icon: "♧",
    description: "Đèn đứng bằng đồng với chụp đèn màu hồng.",
    url: "../Đồ 3D decord/Đèn đứng chân dài/source/extracted/brass_lamp_rose.glb",
    source: "Đồ 3D decord/Đèn đứng chân dài/source/extracted/brass_lamp_rose.glb"
  },
  {
    id: "glb-calendar", name: "Lịch gỗ để bàn", type: "glb", topic: "decor",
    topicLabel: "Đồ trang trí", icon: "▦",
    description: "Lịch gỗ vạn niên dùng làm đạo cụ trên bàn trưng bày.",
    url: "../Đồ 3D decord/Đồ trang chí trên bàn/source/wooden-perpetual-desk-calendar.glb",
    source: "Đồ 3D decord/Đồ trang chí trên bàn/source/wooden-perpetual-desk-calendar.glb"
  },
  {
    id: "glb-vietnam-north-map", name: "Bản đồ miền Bắc Việt Nam", type: "glb", topic: "decor",
    topicLabel: "Bản đồ Việt Nam", icon: "⌖",
    description: "Mô hình 3D bản đồ khu vực miền Bắc Việt Nam vừa được bổ sung vào kho vật thể.",
    url: "../Đồ 3D decord/Bản đồ VN/Vietnam_Northside_Map.glb",
    source: "Đồ 3D decord/Bản đồ VN/Vietnam_Northside_Map.glb"
  },
  ...[
    ["house-plant", "Cây cảnh đơn", "house_plant.glb"],
    ["house-plants", "Cụm cây cảnh", "house_plants.glb"],
    ["house-plants-embedded", "Cụm cây cảnh embedded", "house_plants_embedded.glb"],
    ["monstera", "Cây Monstera", "monstera_b02.glb"],
    ["tall-plant", "Cây cảnh cao", "tall_potted_house_plant.glb"]
  ].map(([id, name, file]) => ({
    id: `glb-${id}`, name, type: "glb", topic: "decor", topicLabel: "Đồ trang trí", icon: "♣",
    description: "Biến thể cây xanh dùng để trang trí các không gian trưng bày.",
    url: `../Đồ 3D decord/House plant/${file}`,
    source: `Đồ 3D decord/House plant/${file}`
  })),
  ...[
    ["production", "Cây ý tưởng · Production", "idea-tree-production.glb"],
    ["validation", "Cây ý tưởng · Validation", "idea-tree-validation.glb"],
    ["art", "Cây ý tưởng · Art blockout", "idea-tree-art-blockout.glb"],
    ["template", "Cây ý tưởng · Template", "idea-tree-blockout-template.glb"],
    ["placeholder", "Cây ý tưởng · Placeholder", "idea-tree-placeholder.glb"]
  ].map(([id, name, file]) => ({
    id: `glb-idea-tree-${id}`, name, type: "glb", topic: "topic-4", topicLabel: "Chủ đề 4", icon: "♧",
    description: "Một phiên bản tài sản của hệ thống Cây ý tưởng trong Chủ đề 4.",
    url: `../Chủ đề 4/assets/models/idea-tree/${file}`,
    source: `Chủ đề 4/assets/models/idea-tree/${file}`
  }))
];

export const TOPIC_LABELS = {
  "topic-3": "Chủ đề 3",
  "topic-4": "Chủ đề 4",
  "topic-5": "Chủ đề 5",
  decor: "Đồ trang trí"
};
