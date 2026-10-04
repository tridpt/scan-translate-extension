# Xử lý lỗi thường gặp

[Về README](../README.md) · [Cài đặt](INSTALLATION.md) · [Sử dụng](USAGE.md)

| Hiện tượng | Cách xử lý |
| --- | --- |
| Popup báo **“Trình duyệt còn chạy mã nền của bản cũ”** hoặc **“Lệnh không hợp lệ”** | Mở `chrome://extensions` / `edge://extensions`, bấm **Reload** cho **Quét & Dịch**, rồi mở popup lại. Tải lại trang web đang dùng. |
| Không thấy thay đổi sau khi build hoặc giải nén ZIP mới | Kiểm tra đường dẫn của extension trong trang quản lý. Bạn phải cập nhật đúng thư mục đã chọn bằng **Load unpacked**, rồi bấm **Reload**. |
| Nút thao tác bị mờ hoặc menu chuột phải không dùng được | Mở popup và kiểm tra công tắc **Đang bật**. Nếu popup đang yêu cầu Reload, làm theo thông báo đó. |
| Phím tắt không mở khoanh vùng | Xem phím **thực tế** dưới nút quét trong popup. Nếu chưa được gán hoặc bị trùng, bấm **Đổi phím**. Bảo đảm extension đang bật và tab hiện tại là trang web thông thường. |
| Báo **“Không thể chạy trên trang này”** | Chuyển sang một trang web thông thường. Trình duyệt chặn extension trên trang nội bộ, cửa hàng tiện ích và một số trang được bảo vệ. |
| OCR không thấy chữ hoặc nhận sai | Chọn đúng **Chữ trong ảnh**, khoanh sát dòng chữ, tăng độ phóng to trang hoặc dùng ảnh rõ hơn. OCR có thể kém với chữ dọc, chữ quá nhỏ và nền phức tạp. |
| OCR chậm lần đầu | Chờ mô hình ngôn ngữ được nạp. Những lần quét tiếp theo với cùng ngôn ngữ thường nhanh hơn. |
| Dịch báo lỗi Google và MyMemory | Kiểm tra kết nối Internet, thử lại sau hoặc chọn đoạn ngắn hơn. Endpoint Google không chính thức có thể thay đổi; MyMemory có giới hạn miễn phí. |
| Báo giới hạn **4.500 byte** | Chọn đoạn ngắn hơn. Byte khác ký tự: chữ có dấu, Nhật, Hàn và Trung thường dùng nhiều byte hơn chữ ASCII. |
| Bấm nút trong popup rồi popup biến mất | Đây là hành vi bình thường: chế độ chọn chữ hoặc khoanh vùng đã được bật trên trang. Nhấn `Esc` trên trang để hủy. |

## Khi cần báo lỗi

Ghi lại phiên bản extension trong `src/manifest.json`, trình duyệt và phiên bản của nó, các bước làm lỗi xuất hiện, cùng thông báo lỗi chính xác. Nếu gửi ảnh chụp màn hình, hãy che thông tin riêng tư trước. Với lỗi build, kèm đầu ra của `npm run build`; với lỗi kiểm thử, kèm lệnh đã chạy và phần lỗi liên quan.

Các giới hạn về dữ liệu và nguồn dịch được giải thích trong [Quyền riêng tư](PRIVACY.md).
