# Hướng dẫn sử dụng

[Về README](../README.md) · [Cài đặt](INSTALLATION.md)

## Chọn cài đặt

Mở popup từ biểu tượng **Quét & Dịch**:

- **Đang bật / Đang tắt:** khi tắt, extension dừng vùng chọn/OCR đang mở, ẩn thẻ dịch và không chạy phím tắt hay menu chuột phải.
- **Dịch sang:** ngôn ngữ của bản dịch. Mặc định là tiếng Việt; các lựa chọn hiện có gồm Anh, Nhật, Hàn, Trung giản thể, Pháp, Đức, Tây Ban Nha và Thái.
- **Chữ trong ảnh:** mô hình OCR cho ảnh. Mặc định là Anh + Việt; có thể chọn Nhật, Hàn, Trung giản thể hoặc Trung phồn thể. Chọn trước khi khoanh vùng. Đây là ngôn ngữ **chữ gốc trong ảnh**, không phải ngôn ngữ đích.

Ngôn ngữ đích, ngôn ngữ OCR và trạng thái bật/tắt được trình duyệt lưu để dùng lần sau.

## Bôi đen chữ có sẵn trên trang

1. Bấm **Bôi đen chữ để dịch** trong popup.
2. Bôi đen một đoạn chữ trên trang. Nếu đã bôi đen trước khi bấm nút, extension sẽ dịch đoạn đó ngay.
3. Mỗi lần chọn đoạn khác, thẻ dịch được cập nhật.
4. Nhấn `Esc` để thoát chế độ này.

Chế độ này không đọc chữ được vẽ trong ảnh. Với chữ trong ảnh, dùng khoanh vùng.

## Dịch một lần bằng menu chuột phải

Bôi đen chữ, nhấp chuột phải và chọn **Dịch đoạn đã chọn**. Bản dịch hiện một lần trong thẻ nổi; bạn không cần bật chế độ bôi đen liên tục. Mục này chỉ hoạt động khi công tắc đang bật.

## Khoanh vùng chữ trong ảnh

1. Chọn đúng **Chữ trong ảnh** ở popup.
2. Bấm **Khoanh vùng & quét chữ**, hoặc dùng phím tắt đang hiển thị ngay dưới nút đó.
3. Kéo chuột khoanh sát đoạn chữ **đang hiển thị** trên tab hiện tại.
4. Đợi OCR nhận dạng và dịch. Thẻ nổi cho biết chữ đã nhận, bản dịch và nguồn dịch; bấm **Sao chép** để lấy bản dịch.

Phím tắt đề xuất là `Alt+Shift+Q`. Bấm **Đổi phím** trong popup nếu cần chỉnh; nhấn `Esc` để hủy khoanh vùng. Lần đầu dùng một ngôn ngữ OCR có thể chậm hơn do extension nạp dữ liệu mô hình đã đóng gói. Chữ quá nhỏ, mờ, tương phản thấp hoặc trình bày phức tạp có thể nhận sai.

## Giới hạn và trang không hỗ trợ

- Extension nhận tối đa 12.000 ký tự cho mỗi lần chọn. Nếu cần dịch dự phòng, extension chỉ gửi tới MyMemory khi đoạn không quá 4.500 byte; mỗi yêu cầu dự phòng được chia tối đa 450 byte.
- Các trang nội bộ như `chrome://` / `edge://` và một số trang bị trình duyệt khóa không cho extension chèn thẻ dịch.
- OCR chỉ quét phần đang hiển thị của tab, không tự cuộn trang và không tự đoán ngôn ngữ OCR.
- Cần Internet để dịch, dù bước OCR diễn ra trên máy.

Nếu gặp trục trặc, xem [Xử lý lỗi](TROUBLESHOOTING.md) và [Quyền riêng tư](PRIVACY.md).
