# Kiếm Vực — game đấu kiếm online 2D

Game trình duyệt nhiều người chơi, tối đa 4 người/phòng. Dùng Node.js, Express, Socket.IO và HTML Canvas.

## Chạy thử trên máy tính
1. Cài Node.js phiên bản 18 trở lên từ https://nodejs.org/.
2. Giải nén thư mục này.
3. Mở terminal/cmd trong thư mục `kiem-vuc-online`.
4. Chạy `npm install`.
5. Chạy `npm start`.
6. Mở http://localhost:3000.

## Điều khiển
- A / D hoặc phím mũi tên trái/phải: di chuyển
- W / mũi tên lên / Space: nhảy
- J: chém thường
- K: kiếm kỹ
- L: tuyệt kỹ
- Shift: lướt né
- S: đỡ đòn

## Chơi online qua Render
1. Tạo repository GitHub mới tên `kiem-vuc-online`.
2. Đưa toàn bộ file trong thư mục này lên repository (phải có `package.json`, `server.js`, `render.yaml`, thư mục `public`).
3. Trên Render, chọn New + > Web Service và kết nối repository.
4. Build Command: `npm install`; Start Command: `npm start`.
5. Chọn gói phù hợp và nhấn Deploy Web Service. Khi deploy xong, mở URL `https://...onrender.com`.
6. Người đầu tiên nhập mã phòng và vào sẽ là chủ phòng. Gửi mã đó cho bạn bè. Chủ phòng chọn bản đồ trước khi bắt đầu. Cần ít nhất 2 người.

## Lưu ý
- Đây là bản khung chơi thử để phát triển tiếp, chưa có tài khoản, lưu tiến trình, ghép trận tự động hay chống gian lận nâng cao.
- Máy chủ hiện dùng trạng thái trong bộ nhớ; nếu dịch vụ khởi động lại, phòng và trận sẽ mất.
- Tối đa 4 người trong mỗi phòng. Dùng mã phòng khác để mở trận khác.
