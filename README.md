# Quét & Dịch

[English](README.en.md)

Extension Chrome/Edge để dịch chữ ngay trên trang web. Bạn có thể bôi đen chữ, dùng menu chuột phải, hoặc khoanh vùng chữ trong ảnh. OCR chạy trên máy; phần dịch cần kết nối Internet.

## Tính năng

- Dịch chữ bôi đen và hiển thị kết quả trong thẻ nổi trên trang.
- Quét vùng màn hình bằng OCR tiếng Anh/Việt, Nhật, Hàn, Trung giản thể hoặc Trung phồn thể.
- Mở khoanh vùng bằng phím tắt đề xuất `Alt+Shift+Q`; có thể đổi phím trong popup.
- Bật/tắt extension, chọn ngôn ngữ đích và ngôn ngữ OCR. Cài đặt được lưu bằng `chrome.storage.sync`.
- Dịch qua Google; nếu Google lỗi, thử MyMemory. Thẻ kết quả cho biết nguồn đã dùng.

## Cài nhanh từ mã nguồn

Bạn cần Node.js và npm. Repo này chứa **mã nguồn**; lệnh build tạo thư mục `dist` để nạp vào trình duyệt.

```bash
npm ci
npm run build
```

Mở `chrome://extensions` hoặc `edge://extensions`, bật **Developer mode**, chọn **Load unpacked** và trỏ tới thư mục `dist` vừa tạo. Xem [hướng dẫn cài đặt và cập nhật](docs/INSTALLATION.md) nếu bạn đang dùng một bản cũ hoặc cài từ ZIP đã giải nén.

## Dùng nhanh

1. Mở trang web, bấm biểu tượng **Quét & Dịch** và bật công tắc nếu cần.
2. Chọn **Dịch sang**. Nếu quét ảnh, chọn đúng mục **Chữ trong ảnh**.
3. Bấm **Bôi đen chữ để dịch** hoặc **Khoanh vùng & quét chữ**. Bạn cũng có thể dùng menu chuột phải hoặc phím tắt đang hiển thị trong popup.
4. Bản dịch hiện trên trang; nhấn **Sao chép** để lấy bản dịch, hoặc `Esc` để thoát chế độ chọn.

Xem [hướng dẫn sử dụng](docs/USAGE.md) để biết rõ từng chế độ và giới hạn của chúng.

## Tài liệu

| Tài liệu | Nội dung |
| --- | --- |
| [Cài đặt](docs/INSTALLATION.md) | Build, nạp vào Chrome/Edge, cập nhật và gỡ cài đặt |
| [Sử dụng](docs/USAGE.md) | Chọn chữ, quét ảnh, phím tắt và công tắc |
| [Xử lý lỗi](docs/TROUBLESHOOTING.md) | Reload, trang bị chặn, OCR sai và lỗi dịch |
| [Quyền riêng tư](docs/PRIVACY.md) | Dữ liệu nào ở trên máy, dữ liệu nào được gửi đi và lý do cần từng quyền |
| [Phát triển](docs/DEVELOPMENT.md) | Cấu trúc mã, build, kiểm thử và đóng gói |

## Lưu ý về dữ liệu

Ảnh chụp màn hình được xử lý cục bộ để lấy chữ; extension không gửi ảnh tới dịch vụ dịch. **Văn bản bạn chọn hoặc OCR nhận được sẽ được gửi qua HTTPS tới Google Dịch và, khi cần dự phòng, MyMemory.** Extension không lưu lịch sử văn bản hay bản dịch. Xem [chi tiết về quyền riêng tư](docs/PRIVACY.md).

Google endpoint đang dùng là endpoint không chính thức. MyMemory có giới hạn dung lượng và hạn mức miễn phí; nếu hai nguồn đều lỗi, extension sẽ báo lỗi thay vì tạo bản dịch giả.
