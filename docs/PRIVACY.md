# Dữ liệu và quyền truy cập

[Về README](../README.md)

Tài liệu này mô tả hành vi của mã nguồn hiện tại. Extension không có tài khoản riêng, không có tính năng lưu lịch sử và không gửi ảnh chụp màn hình tới dịch vụ dịch.

## Dữ liệu được xử lý như thế nào?

| Dữ liệu | Cách xử lý |
| --- | --- |
| Chữ bạn bôi đen hoặc chọn từ menu chuột phải | Gửi tới service worker của extension rồi gửi qua HTTPS tới Google Dịch. Nếu Google lỗi, văn bản được gửi tới MyMemory để thử dịch dự phòng. |
| Ảnh chụp tab khi bạn khoanh vùng | Extension chụp phần tab đang hiển thị vào bộ nhớ, cắt vùng bạn chọn và chạy Tesseract.js cục bộ. **Ảnh không được gửi tới Google hay MyMemory**; chỉ văn bản OCR nhận được mới được gửi để dịch. |
| Bản dịch | Hiển thị trong thẻ nổi trên trang. Extension không lưu lịch sử văn bản hoặc bản dịch. |
| Công tắc, ngôn ngữ đích, ngôn ngữ OCR | Lưu trong `chrome.storage.sync`. Trình duyệt có thể đồng bộ những cài đặt này theo tài khoản trình duyệt của bạn. |

Yêu cầu dịch dùng HTTPS và truyền văn bản trong tham số URL của yêu cầu `GET`. Vì vậy, văn bản có thể xuất hiện trong nhật ký mạng của trình duyệt hoặc máy chủ dịch. Google và MyMemory xử lý dữ liệu theo chính sách của họ; extension không kiểm soát việc lưu giữ ở các dịch vụ đó. Không dùng extension để dịch nội dung bí mật nếu bạn không muốn gửi văn bản cho các dịch vụ này.

Không có mã theo dõi, quảng cáo hoặc API thu thập dữ liệu riêng trong repo này. Trình duyệt có thể lưu bộ dữ liệu ngôn ngữ OCR để tăng tốc; đó là mô hình nhận dạng, không phải lịch sử văn bản của bạn.

## Vì sao cần các quyền này?

| Quyền trong manifest | Mục đích |
| --- | --- |
| `activeTab` | Truy cập tạm thời tab đang dùng sau thao tác của bạn; cần cho việc lấy chữ trên trang và chụp phần tab hiển thị khi quét OCR. |
| `scripting` | Chèn giao diện chọn vùng và thẻ bản dịch vào trang đang dùng. |
| `storage` | Lưu trạng thái bật/tắt và hai lựa chọn ngôn ngữ. |
| `offscreen` | Chạy tài liệu nền và worker OCR cục bộ ngoài service worker. |
| `contextMenus` | Thêm mục **Dịch đoạn đã chọn** vào menu chuột phải. |
| `host_permissions` cho `translate.googleapis.com` và `api.mymemory.translated.net` | Cho phép service worker gọi đúng hai nguồn dịch nói trên. |

Phím tắt không cần thêm quyền riêng. Extension không được cấp quyền đọc mọi trang một cách thường trực. Một số trang nội bộ hoặc trang do trình duyệt bảo vệ không cho extension chạy.

## Tắt extension

Khi bạn tắt công tắc, extension ẩn giao diện đang mở, hủy yêu cầu dịch còn chạy và không bắt đầu tác vụ mới từ popup, menu chuột phải hoặc phím tắt. Việc tắt không thu hồi được văn bản đã gửi tới dịch vụ dịch trước đó.
