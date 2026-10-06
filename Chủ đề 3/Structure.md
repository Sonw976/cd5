# Kiến trúc kỹ thuật Chủ đề 3

## 1. Mục tiêu kiến trúc

Mã nguồn được tổ chức theo mô hình một entry điều phối và nhiều module có trách nhiệm rõ ràng. Cách này kế thừa điểm mạnh của Chủ đề 5: tài nguyên tập trung, cấu hình tách khỏi cách dựng, hàm hình học dùng lại được và tài liệu kỹ thuật nằm cùng phiên bản với code.

Việc module hóa không thay đổi ID, tên, màu, âm thanh hay vị trí của ba cụm.

## 2. Cấu trúc thư mục

```text
Chủ đề 3/
├── cd3_1.html                       # DOM, UI overlay, import map và entry
├── styles/
│   └── chu-de-3.css                # Toàn bộ style của trang
├── scripts/
│   ├── main.js                     # Khởi tạo và điều phối vòng đời scene
│   ├── config/
│   │   ├── assets.js               # Đường dẫn audio, video và placeholder
│   │   └── scene-config.js         # Kích thước, màu, góc và metadata cụm
│   ├── data/
│   │   └── zone-content.js         # Nội dung trưng bày của từng cụm
│   ├── geometry/
│   │   └── radial-geometry.js      # Phép toán cực và mesh cung tròn
│   └── collision/
│       └── radial-collision.js     # Miền đi được và trượt theo tường
├── nhac-cum1-*.mp3                 # Audio cục bộ Cụm 1
├── nhac-cum2-*.mp3                 # Audio cục bộ Cụm 2
└── start-scene-3.ps1               # HTTP server cục bộ
```

## 3. Trách nhiệm module

| Module | Được phép biết | Không nên chứa |
|---|---|---|
| `assets.js` | URL/đường dẫn audio, video và ảnh | Three.js, DOM, tọa độ scene |
| `scene-config.js` | hằng số không gian, màu, danh tính cụm | thao tác renderer/DOM |
| `zone-content.js` | tiêu đề, mô tả, bố cục nội dung | mesh, material, event listener |
| `radial-geometry.js` | toán cực, tạo/chỉnh BufferGeometry | trạng thái scene toàn cục |
| `radial-collision.js` | luật đi lại dựa trên cấu hình truyền vào | camera, bàn phím, UI |
| `main.js` | vòng đời ứng dụng, scene graph, input, audio, tương tác | đường dẫn asset và dữ liệu nội dung hard-code mới |

Các object cấu hình và nội dung được đóng băng bằng `Object.freeze()` để ngăn thay đổi ngoài ý muốn trong lúc runtime.

## 4. Luồng khởi động

```text
cd3_1.html
  → import map khóa Three.js r185.1
  → scripts/main.js
      → kiểm tra WebGL 2
      → tạo renderer / scene / camera
      → dựng kiến trúc và trần
      → dựng nội dung ba cụm từ zone-content.js
      → nạp âm thanh và media từ assets.js
      → đăng ký input, raycast và UI
      → renderer.setAnimationLoop()
```

Preview trần (`?ceilingPreview=1|zone1|zone2|zone3`) vẫn đi qua cùng pipeline dựng hình nhưng đặt camera vào vị trí kiểm tra và không kích hoạt media gây nhiễu.

## 5. Hệ tọa độ và cụm

- Trục `Y` hướng lên; mặt sàn nằm tại `Y = 0`.
- Tâm phòng tròn là `(0, 0, 0)`.
- Góc cực tính bằng radian, với `x = cos(a) × r`, `z = sin(a) × r`.
- `zonePoint(zone, fraction, radius)` là API chuẩn để đặt vật theo cung.
- `faceCoreRotY(angle)` là API chuẩn để vật trên tường quay về lõi phòng.
- Cụm phải luôn được tra bằng `getZoneById(id)`, không tra theo chỉ số mảng. Điều này giữ đúng ngữ nghĩa sau khi hoán đổi bố cục.

| ID | Nội dung | Cung | Màu |
|---:|---|---|---|
| 1 | Yêu nước Cách mạng | 150° → 270° | Đỏ |
| 2 | Tình nguyện & Sư phạm | 30° → 150° | Xanh lá |
| 3 | Học tập & NCKH | -90° → 30° | Xanh dương |

## 6. Ý tưởng mặt bằng nhìn từ trên xuống

Sơ đồ dưới đây thể hiện quan hệ không gian, không dùng làm bản vẽ thi công và không hoàn toàn theo tỷ lệ. Phía trên là `+Z`; khách đi vào từ hành lang phía `-Z`.

```text
                                  +Z / BẮC
                                      ↑
                  CỤM 2 · TÌNH NGUYỆN & SƯ PHẠM
                         cung 30° → 150° · XANH LÁ
                 .---------------------------------.
             .-''   Bản đồ nhiệt · TV · Chiến dịch  ''-.
           .'                                             '.
          /        ╲ · · khe qua vách · · ╱                \
         /          ╲                   ╱                    \
        |            ╲                 ╱                      |
        |  CỤM 1      ╲    SẢNH LÕI   ╱       CỤM 3          |
        |  YÊU NƯỚC    │   R = 5.5   │   HỌC TẬP & NCKH     |
   -X ← |  CÁCH MẠNG   │  TV + bảng  │   Bộ tranh học giả   | → +X
        |              │  trung tâm  │                      |
        |  2 bảng lớn  ╲             ╱   2 giá sách         |
        |  + bục nói    ╲           ╱    procedural         |
         \              ╲         ╱                        /
          '.              ╲       ╱                       .'
            '-.             ╲   ╱                     .-'
               '------.       │ │       .----------'
                      │       │ │       │
                      │    HÀNH LANG    │
                      │    LỐI VÀO      │
                      '-------↓---------'
                              -Z / NAM

        Cụm 1: 150° → 270°                  Cụm 3: -90° → 30°
        Màu đỏ                               Màu xanh dương
```

### Phân lớp không gian

```text
Tường ngoài, R = 18.5
┌──────────────────────────────────────────────┐
│  Lớp trưng bày treo tường · WALL_MOUNT_R    │
│  ┌────────────────────────────────────────┐  │
│  │  Vành lưu thông và quan sát            │  │
│  │  ┌──────────────────────────────────┐  │  │
│  │  │  Nội thất procedural / điểm nhấn │  │  │
│  │  │  ┌────────────────────────────┐  │  │  │
│  │  │  │  Sảnh lõi · R = 5.5       │  │  │  │
│  │  │  └────────────────────────────┘  │  │  │
│  │  └──────────────────────────────────┘  │  │
│  └────────────────────────────────────────┘  │
└──────────────────────────────────────────────┘
```

### Ý đồ lưu thông

- Tuyến chính đi từ hành lang vào sảnh lõi, sau đó tỏa sang Cụm 1 hoặc Cụm 3.
- Tuyến vòng nằm giữa lõi và tường ngoài, cho phép tham quan liên tục qua cả ba cụm.
- Hai vách tại `30°` và `150°` phân định Cụm 2 nhưng chừa khe ở bán kính `11.0 → 14.6` để không cắt đứt tuyến vòng.
- Nội dung lớn đặt sát tường ngoài; vùng giữa ưu tiên khoảng đứng xem và di chuyển.
- Bục phát biểu của Cụm 1 và hai giá sách của Cụm 3 là các điểm nhấn procedural. Cụm 2 được giữ thoáng cho bản đồ và TV tương tác.
- Không bố trí lại sofa, đèn, lịch hoặc cây GLB; scene hiện không tải model GLB.

## 7. Luồng tương tác

Mỗi mesh có thể tương tác được thêm vào `interactiveObjects` và mang metadata trong `userData`. Raycaster của entry xác định hover/click, sau đó UI modal đọc `title`, `zoneName`, `content`, `color` và `imageUrl`. Vì vậy, object trưng bày mới cần đăng ký đủ cả hai phần này.

Va chạm được khởi tạo bằng `createRadialCollision(config)`. Module trả về `resolveMovement`; entry chỉ cung cấp vị trí cũ/mới và áp kết quả lên camera. Cách truyền cấu hình giúp kiểm thử luật va chạm mà không cần khởi tạo renderer.

Âm thanh 3D dùng một `AudioListener` gắn vào camera và một `PositionalAudio` cho mỗi cụm. ID của audio phải trùng ID cụm. Cơ chế rời cụm dưới 20 giây phát tiếp; lâu hơn sẽ phát lại từ đầu khi quay lại.

## 8. Quy trình thay đổi

- Đổi URL/tệp audio, video hoặc ảnh: sửa `config/assets.js`.
- Đổi tên, màu, cung, bài nhạc của cụm: sửa `config/scene-config.js`.
- Đổi tiêu đề/nội dung trưng bày: sửa `data/zone-content.js`.
- Đổi công thức mặt bằng hoặc mesh cung: sửa `geometry/radial-geometry.js` và đối chiếu `GEOMETRY_GUARDRAILS.md`.
- Đổi luật đi lại: sửa `collision/radial-collision.js`.
- Thêm hệ thống runtime hoặc object factory: nối từ `main.js`, không đưa ngược trạng thái runtime vào module cấu hình/dữ liệu.

## 9. Chạy và kiểm tra

```powershell
cd "Chủ đề 3"
powershell -ExecutionPolicy Bypass -File .\start-scene-3.ps1
```

Không mở trực tiếp bằng `file://`, vì ES module và tài nguyên sẽ bị giới hạn bởi chính sách trình duyệt. Scene hiện cần mạng cho Three.js CDN, video, placeholder và audio Cụm 3.

Sau mỗi thay đổi, kiểm tra cú pháp toàn bộ tệp trong `scripts`, HTTP 200 cho entry/module, console không có lỗi, không phát sinh request GLB, ba preview trần đúng màu và di chuyển không xuyên tường.
