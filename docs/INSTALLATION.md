# Cài đặt và cập nhật

[Về README](../README.md)

Quét & Dịch được thử trên Chrome/Edge dưới dạng extension Manifest V3. GitHub repo chứa mã nguồn; thư mục `dist` được tạo khi build và không được commit.

## Cài từ mã nguồn

1. Cài Node.js bản LTS kèm npm.
2. Tải repo về máy và chạy trong thư mục dự án:

   ```bash
   npm ci
   npm run build
   ```

3. Mở `chrome://extensions` (Chrome) hoặc `edge://extensions` (Edge).
4. Bật **Developer mode** rồi chọn **Load unpacked**.
5. Chọn đúng thư mục `dist`, nơi có file `manifest.json`.
6. Ghim biểu tượng **Quét & Dịch** trên thanh công cụ nếu muốn mở popup nhanh.

Để dùng phím tắt, xem phím thực tế trong popup. Trình duyệt có thể không gán phím đề xuất `Alt+Shift+Q` nếu bị trùng. Bấm **Đổi phím** trong popup hoặc mở `chrome://extensions/shortcuts` / `edge://extensions/shortcuts` để đặt lại.

## Cài từ ZIP đã đóng gói

Nếu bạn được cung cấp file ZIP của extension, hãy **giải nén trước**. Chọn thư mục đã giải nén chứa trực tiếp `manifest.json` bằng **Load unpacked**. Chrome/Edge không nạp ZIP trực tiếp ở bước này. File ZIP cài đặt không nằm trong mã nguồn GitHub; bạn có thể tự tạo từ `dist` sau khi build.

## Cập nhật

Nếu đã cài từ `dist` của repo:

1. Cập nhật mã nguồn, chạy lại `npm ci` khi các gói phụ thuộc thay đổi, rồi chạy `npm run build`.
2. Ở trang quản lý extension, tìm **Quét & Dịch** và bấm **Reload**.
3. Tải lại các trang web đang mở trước khi thử phiên bản mới.

Nếu đã cài từ một thư mục ZIP giải nén riêng, hãy thay file trong **chính thư mục đã nạp vào trình duyệt** bằng bản ZIP mới, rồi bấm **Reload** và tải lại trang web. Build ở một thư mục khác sẽ không tự cập nhật bản đang cài.

Nếu popup báo **Mở trang tiện ích**, bấm nút đó, **Reload** extension và mở popup lại. Thông báo này xuất hiện khi trình duyệt vẫn dùng service worker của bản cũ.

## Gỡ cài đặt

Mở trang quản lý extension và chọn **Remove/Xóa** trên thẻ **Quét & Dịch**. Thư mục mã nguồn hoặc ZIP trên máy không bị xóa theo thao tác này.

Gặp lỗi trong quá trình cài? Xem [Xử lý lỗi](TROUBLESHOOTING.md).
