# Kiểm kê đối tượng scene — Chủ đề 3

Tài liệu này kiểm kê theo nhóm sinh đối tượng. Số mesh thực tế có thể lớn hơn vì một builder procedural thường tạo nhiều mesh con.

## 1. Hạ tầng runtime

| Nhóm | Thành phần | Nguồn |
|---|---|---|
| Render | `WebGLRenderer`, scene, fog, perspective camera | `scripts/main.js` |
| Điều khiển | bàn phím, kéo chuột, raycaster, resize | `scripts/main.js` |
| UI | màn hình bắt đầu, hướng dẫn, nhãn hover, banner cụm, modal, điều khiển âm lượng | `cd3_1.html`, CSS, `main.js` |
| Animation | vòng lặp `renderer.setAnimationLoop()` và danh sách effect updater | `scripts/main.js` |

## 2. Kiến trúc cố định

| Nhóm | Thành phần chính | Quy tắc |
|---|---|---|
| Sàn | ba sector vành khuyên | mỗi sector theo cung của một cụm |
| Tường ngoài | các đoạn tường cong | bán kính `R_OUTER` |
| Lõi | tường cong trung tâm có khoảng mở | bán kính `R_CORE` |
| Vách phân khu | hai vách hướng tâm | góc 30° và 150°, chừa khe đi lại |
| Sảnh/lối vào | hành lang chữ nhật, cửa đôi | nối về phía `Z` âm |
| Chân tường | dải màu theo cụm | đỏ, xanh lá, xanh dương |

## 3. Hệ trần và ánh sáng

- Một group `radial-drop-ceiling` chứa trần sảnh, ba cung trần khu vực, các vành hạ cốt, fascia cong, nẹp vàng, dầm che mối nối và trần hành lang.
- Mỗi cụm có một nguồn sáng trắng ấm chính; màu cụm chỉ là điểm nhấn.
- Sảnh trung tâm và hành lang có nguồn sáng riêng.
- Toàn scene có hemisphere light và ambient light làm nền.

Chi tiết kích thước bắt buộc xem tại `GEOMETRY_GUARDRAILS.md`.

## 4. Nội dung tương tác

| Khu vực | Object tương tác | Số lượng logic |
|---|---|---:|
| Sảnh | TV/video và infographic trung tâm | 2 |
| Cụm 1 | infographic “Ba sẵn sàng”, “Xếp bút nghiên ra trận” | 2 |
| Cụm 2 | bản đồ nhiệt, TV bản đồ, hai tranh chiến dịch | 4 |
| Cụm 3 | 4 hồ sơ học giả/nhà khoa học và 3 hoạt động NCKH | 7 |

Cụm 3 không dùng một khung chung: hai chân dung lịch sử có hai biến thể phào gỗ/phào vàng; hai nhà khoa học đương đại dùng panel số ngang/dọc; ba hoạt động lần lượt dùng bục thành tựu, màn hình seminar và panorama số liệu.

Mỗi object tương tác phải có `userData.type`; các loại đang dùng gồm `infographic`, `artifact` và `map-panel`. Ảnh placeholder là tài nguyên từ xa và có thể thay bằng ảnh thật tại `zone-content.js`/`assets.js` trong lần phát triển sau.

## 5. Nội thất procedural

Scene không còn import hoặc khởi tạo vật thể GLB. Các tệp trong thư mục `models/` (nếu còn trên đĩa) là tài nguyên không được tham chiếu và không được trình duyệt tải.

- Cụm 1: một bục phát biểu.
- Cụm 3: một bàn tra cứu NCKH thu gọn và dải timeline cong; không đặt nội thất ở hai đầu cung.
- Khung tranh, bảng, tiêu đề, TV, cửa và nẹp được tạo bằng primitive/BufferGeometry trong runtime.

## 6. Media và âm thanh

| Vùng | Media | Nguồn |
|---|---|---|
| Sảnh | video mẫu | từ xa |
| Cụm 1 | “Bác Đang Cùng Chúng Cháu Hành Quân” | MP3 cục bộ |
| Cụm 2 | “Thanh Niên Làm Theo Lời Bác (Đoàn ca)” | MP3 cục bộ |
| Cụm 3 | Mozart, Symphony No. 40 | OGG từ xa |

Mỗi cụm có một `PositionalAudio` đặt tại bán kính giữa và cao `WALL_H / 2`.

## 7. Checklist khi thêm object

1. Dùng `zonePoint` và `faceCoreRotY` thay cho tọa độ/góc tự tính nếu object thuộc một cung.
2. Đường dẫn tài nguyên mới phải đăng ký trong `assets.js`.
3. Nội dung biên tập phải nằm trong `zone-content.js`.
4. Object click được phải thêm vào `interactiveObjects` và có đủ metadata `userData`.
5. Không che khe đi tại vách phân khu hoặc vượt bán kính tường.
6. Không thêm lại loader hoặc model GLB nếu chưa có quyết định kiến trúc mới.
7. Kiểm tra cả góc nhìn thường và URL preview trần sau khi đặt object cao.
