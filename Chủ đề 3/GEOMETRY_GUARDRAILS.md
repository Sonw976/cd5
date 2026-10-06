# Hàng rào hình học — Chủ đề 3

Các giá trị dưới đây là bất biến thiết kế đang được cả dựng hình, đặt nội dung và va chạm sử dụng. Không đổi riêng lẻ trong `main.js`; nguồn chuẩn nằm ở `scripts/config/scene-config.js`.

## 1. Bất biến mặt bằng

| Hằng số | Giá trị | Ý nghĩa |
|---|---:|---|
| `R_CORE` | 5.5 | bán kính lõi/sảnh trung tâm |
| `R_OUTER` | 18.5 | bán kính tường ngoài |
| `WALL_H` | 10.5 | chiều cao tường danh nghĩa |
| `WALL_THICK` | 0.4 | bề dày va chạm/tường |
| `MARGIN` | 0.55 | khoảng an toàn của camera |
| `BOUNDARY_GAP.r0` | 11.0 | đầu trong của khe qua vách |
| `BOUNDARY_GAP.r1` | 14.6 | đầu ngoài của khe qua vách |
| `WALL_MOUNT_R` | công thức | mặt chuẩn để treo nội dung lên tường ngoài |

`WALL_MOUNT_R` phải tiếp tục được tính từ `R_OUTER`, `WALL_THICK`, khoảng hở và chiều sâu khung. Không thay bằng số cứng, nếu không tranh có thể chìm vào hoặc nổi khỏi tường.

## 2. Bất biến góc

Ba cung phải phủ đủ 360° và chỉ tiếp giáp, không để hở/đè semantic:

- Cụm 1: `150° → 270°`.
- Cụm 2: `30° → 150°`.
- Cụm 3: `-90° → 30°` (tương đương `270° → 390°`).
- Vách phân khu vật lý: `30°` và `150°`; phía 270° được xử lý bởi lối vào/sảnh.

Các phép so sánh góc trong va chạm phải dùng góc chuẩn hóa. Khoảng cách đến vách hướng tâm là `angleDiff × radius`, không so trực tiếp độ lệch góc vì độ rộng vật lý thay đổi theo bán kính.

## 3. Bất biến trần

- Trần không được thấp hơn chiều cao đặt tiêu đề lớn nhất cộng khoảng hở thị giác.
- Các sector trần dùng chồng góc nhỏ (`angleOverlap`) để tránh khe sáng do sai số raster.
- Dầm hướng tâm phải che mối nối sector nhưng không lấn xuống vùng di chuyển.
- Fascia cong phải dùng cùng `a0/a1` và bán kính tương ứng với sector của nó.
- Mặt sau/trần nền phải kín để camera không nhìn thấy nền trời qua sai số mesh.
- Màu cụm chỉ dùng ở dải nhấn; ánh sáng chiếu chính giữ trắng ấm để không làm sai màu ảnh trưng bày.

## 4. Bất biến va chạm

- Camera phải nằm trong `R_OUTER - MARGIN`.
- Không được xuyên lõi tại các đoạn tường kín.
- Chỉ được xuyên vách hướng tâm khi bán kính nằm trong `[11.0, 14.6]`.
- Hành lang vào có luật hình chữ nhật riêng; sửa hình học hành lang phải sửa đồng thời luật tương ứng trong `radial-collision.js`.
- `resolveMovement` ưu tiên vị trí mới, sau đó thử trượt theo tiếp tuyến, rồi theo bán kính, cuối cùng giữ vị trí cũ. Thứ tự này là một phần của cảm giác điều khiển.

## 5. Quy tắc đặt object

- Vật treo tường: dùng `zonePoint(zone, fraction, WALL_MOUNT_R)`.
- Vật hướng về tâm: dùng `faceCoreRotY(point.angle)`; chỉ cộng offset khi hình học procedural có trục trước khác chuẩn.
- Nội thất procedural đứng sàn: dùng `y = 0`, trừ khi hình học có pivot cần bù được ghi chú rõ.
- Không đặt nội thất trong dải khe vách hoặc sát biên `R_OUTER - MARGIN`.
- Audio cụm: dùng `MID_R`, `WALL_H / 2`, ID audio trùng ID cụm.

## 6. Checklist thay đổi hình học

1. Sửa nguồn chuẩn trong `scene-config.js`.
2. Đối chiếu công thức tạo mesh ở `radial-geometry.js`.
3. Đồng bộ luật trong `radial-collision.js` nếu ranh giới vật lý thay đổi.
4. Kiểm tra tổng ba cung vẫn phủ đủ vòng tròn và ID/nội dung không bị đổi theo index.
5. Mở lần lượt `?ceilingPreview=1`, `zone1`, `zone2`, `zone3`.
6. Đi bộ dọc tường ngoài, quanh lõi, qua hai khe vách và toàn bộ hành lang.
7. Kiểm tra tranh không z-fighting, trần không hở, ánh sáng không đổi màu nội dung.
8. Kiểm tra console không có lỗi WebGL, shader, asset 404 hay CORS.

Nếu thay đổi làm sai từ hai hệ trở lên (ví dụ mặt bằng và va chạm), nên thực hiện trong cùng một commit để không tồn tại trạng thái trung gian không chạy được.
