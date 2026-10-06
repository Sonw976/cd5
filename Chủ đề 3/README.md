# Chủ đề 3 — Phong trào và hoạt động tiêu biểu

## Kiến trúc mã nguồn

Chủ đề 3 đã được chuyển từ một tệp HTML nguyên khối sang cấu trúc ES module. HTML chỉ giữ bộ khung giao diện và import map; CSS, dữ liệu, cấu hình, hình học và va chạm nằm ở các tệp độc lập.

```text
cd3_1.html
├── styles/chu-de-3.css
└── scripts/main.js
    ├── config/assets.js
    ├── config/scene-config.js
    ├── data/zone-content.js
    ├── geometry/radial-geometry.js
    └── collision/radial-collision.js
```

Nguyên tắc tổ chức được tiếp thu từ Chủ đề 5 là tách cấu hình và tài nguyên khỏi logic dựng cảnh, gom các hàm hình học dùng lại được, dùng một entry duy nhất để điều phối, đồng thời đặt tài liệu kỹ thuật cạnh mã nguồn.

Tài liệu chi tiết:

- [Structure.md](./Structure.md): kiến trúc, luồng khởi động và quy ước phát triển.
- [OBJECT_INVENTORY.md](./OBJECT_INVENTORY.md): kiểm kê các nhóm đối tượng trong scene.
- [GEOMETRY_GUARDRAILS.md](./GEOMETRY_GUARDRAILS.md): các bất biến hình học và checklist khi chỉnh mặt bằng.

## Engine

Scene sử dụng Three.js `0.185.1` (`r185`) dạng ES module. Phiên bản được khóa trong import map của `cd3_1.html` để Three.js và các addon luôn đồng bộ.

Các điểm đã nâng cấp từ r128:

- Chuyển build global `three.min.js` sang ES module.
- Chuyển `outputEncoding`/`texture.encoding` sang hệ `outputColorSpace`/`texture.colorSpace`.
- Đánh dấu ảnh, canvas và video màu là sRGB.
- Bật ACES Filmic tone mapping và hiệu chỉnh lại PointLight theo thang ánh sáng vật lý.
- Dùng `renderer.setAnimationLoop()` và kiểm tra WebGL 2 trước khi khởi tạo scene.

## Hệ trần hướng tâm

Trần được cải tạo theo nguyên lý trần thả giật cấp của Chủ đề 5 nhưng chuyển sang hình học phù hợp mặt bằng tròn:

- Sảnh trung tâm có trần nền kín, vành hạ cốt, lõi tròn cao và nẹp kim loại màu vàng.
- Mỗi khu vực trưng bày có trần nền theo cung 120 độ, hai vành hạ cốt, lõi cong và dải màu nhận diện mảnh.
- Ba dầm hướng tâm che mối nối giữa các cung trần.
- Hành lang dùng trần thả chữ nhật với lõi cao và nẹp vàng.
- Ánh sáng chính là trắng ấm; đỏ, xanh dương và xanh lá chỉ dùng làm điểm nhấn trên trần.

## Bố trí các cụm

- Cụm 1 — Yêu nước cách mạng: cung `150° → 270°`.
- Cụm 2 — Tình nguyện và Sư phạm: cung `30° → 150°`, phía đối diện.
- Cụm 3 — Học tập và NCKH: cung `-90° → 30°`, tiếp cận từ lối vào.

Các builder lấy cấu hình bằng ID thay vì vị trí phần tử trong mảng, vì vậy tên, màu, âm thanh, nội dung và tọa độ của mỗi cụm luôn đi cùng nhau khi thay đổi bố trí.

## Chạy cục bộ

ES module cần được mở qua HTTP server và cần Internet để tải Three.js từ CDN.

Từ PowerShell, chạy:

```powershell
.\start-scene-3.ps1
```

Nếu chính sách PowerShell chặn script, chạy:

```powershell
powershell -ExecutionPolicy Bypass -File .\start-scene-3.ps1
```

## Kiểm tra sau thay đổi hình ảnh

Thêm `?ceilingPreview=1` vào URL để xem trần trung tâm, hoặc dùng `?ceilingPreview=zone1`, `zone2`, `zone3` để xem từng cung trần mà không kích hoạt âm thanh hay video.

- Bản đồ miền Bắc tải GLB dùng chung từ thư mục `Đồ 3D decord`; các vùng tương tác là lớp hotspot độc lập để bấm cập nhật TV bên cạnh.
- Ảnh, bảng canvas, video và bản đồ nhiệt có màu đúng.
- Ba vùng âm thanh chuyển bài đúng theo vị trí.
- Di chuyển, va chạm, kéo chuột và mở modal hoạt động bình thường.
- Console hiển thị `Three.js r185` và không có lỗi shader/WebGL.
