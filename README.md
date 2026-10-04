# Quét & Dịch

Extension Chrome/Edge dịch ngay trên trang web theo ba cách:

- **Bôi đen chữ:** chọn chữ có sẵn trên trang; nếu chữ đã được chọn trước khi bấm extension, tiện ích dịch ngay. Sau đó, mỗi lần bôi đen đoạn khác trên cùng trang, bản dịch sẽ cập nhật. Nhấn `Esc` để tắt chế độ này.
- **Menu chuột phải:** bôi đen chữ, nhấp chuột phải và chọn **Dịch đoạn đã chọn**. Bản dịch hiện một lần trên trang mà không cần mở popup.
- **Khoanh vùng & quét chữ:** kéo một hình chữ nhật quanh chữ đang hiển thị, kể cả chữ trong ảnh trên trang web. Tiện ích nhận dạng chữ bằng Tesseract.js trên máy rồi dịch. OCR hỗ trợ Anh/Việt, Nhật, Hàn, Trung giản thể và Trung phồn thể; chọn ngôn ngữ quét trong popup trước khi khoanh vùng.

Phím tắt đề xuất `Alt+Shift+Q` mở ngay chế độ khoanh vùng trên trang đang xem. Popup hiển thị phím đã được trình duyệt gán; bấm **Đổi phím** để chỉnh tại trang phím tắt của tiện ích. Nhấn `Esc` để hủy khoanh vùng. Phím tắt chỉ hoạt động khi công tắc đang bật.

Popup có công tắc **Đang bật / Đang tắt**. Khi tắt, tiện ích dừng chế độ chọn chữ và vùng OCR trên các thẻ đang mở, ẩn thẻ dịch, hủy yêu cầu dịch đang chạy, khóa hai nút thao tác và vô hiệu hóa mục chuột phải. Trạng thái được lưu cho lần mở trình duyệt sau; biểu tượng hiện huy hiệu **OFF** khi tắt.

## Cài đặt

1. Trong thư mục này, chạy `npm install` rồi `npm run build`.
2. Mở `chrome://extensions` hoặc `edge://extensions`, bật **Developer mode**.
3. Chọn **Load unpacked** và mở thư mục `dist`.

Nếu đã cài bản trước từ thư mục `dist`, bấm **Reload** trên thẻ extension ở trang quản lý tiện ích để nhận bản mới.
Nếu popup hiển thị **Mở trang tiện ích**, bấm nút đó, tìm **Quét & Dịch**, bấm **Reload** rồi mở popup lần nữa. Điều này xảy ra khi trình duyệt vẫn giữ service worker của bản cũ sau khi các file trong `dist` được cập nhật.

## Cách dùng

1. Mở trang web cần dịch, bấm biểu tượng **Quét & Dịch**.
2. Bật công tắc nếu đang tắt, rồi chọn ngôn ngữ đích (mặc định là tiếng Việt). Nếu quét ảnh, chọn **Chữ trong ảnh** cho đúng ngôn ngữ (mặc định là Anh/Việt).
3. Bấm **Bôi đen chữ để dịch** hoặc **Khoanh vùng & quét chữ**, rồi chọn nội dung trên trang.
4. Bản dịch hiện trong một thẻ nổi. Có thể bấm **Sao chép** để lấy bản dịch.

Để dịch nhanh chữ đã bôi đen, dùng mục **Dịch đoạn đã chọn** trong menu chuột phải. Cách này hoạt động khi công tắc đang bật.
Để quét nhanh mà không mở popup, nhấn phím tắt hiển thị dưới nút **Khoanh vùng & quét chữ**.

Extension chỉ được cấp quyền với thẻ đang dùng khi bạn bấm biểu tượng, mục chuột phải hoặc phím tắt. Các trang nội bộ của trình duyệt và một số trang bị khóa không cho tiện ích chạy. Chế độ bôi đen chữ không đọc chữ nằm trong ảnh; hãy dùng khoanh vùng cho trường hợp đó. OCR có thể nhận sai chữ nhỏ hoặc ảnh mờ.

OCR xử lý ảnh cục bộ; lần đầu quét bằng một ngôn ngữ mới có thể chậm hơn vì tiện ích cần nạp dữ liệu OCR đã đóng gói sẵn. **Văn bản được chọn hoặc nhận dạng sẽ gửi tới Google Dịch** qua `translate.googleapis.com`; nếu Google lỗi, tiện ích gửi văn bản đó tới **MyMemory** qua `api.mymemory.translated.net` để dịch dự phòng. Thẻ dịch cho biết nguồn đã dùng. Cần kết nối Internet. Google dùng endpoint không chính thức; MyMemory miễn phí giới hạn 450 byte mỗi yêu cầu và 4.500 byte cho một lần dịch dự phòng, nên hãy chọn đoạn ngắn hơn nếu gặp thông báo giới hạn. Không lưu văn bản hoặc bản dịch; chỉ lưu ngôn ngữ đích, ngôn ngữ quét và trạng thái bật/tắt. Mỗi lần chọn tối đa 12.000 ký tự khi Google hoạt động.
MyMemory cũng có hạn mức miễn phí hằng ngày; khi hết hạn mức, tiện ích sẽ báo lỗi thay vì hiển thị bản dịch giả.

## Phát triển

- `npm test` kiểm tra tách đoạn, xử lý phản hồi dịch và logic phím tắt.
- `npm run build` tạo extension tự chứa trong `dist`.
- `npm run test:browser` thử bôi đen, kiểm tra phím tắt đã được Chromium đăng ký, đường dịch một lần của menu chuột phải, nguồn dự phòng, OCR đa ngôn ngữ và công tắc với phản hồi dịch mô phỏng cục bộ (cần Chromium đã cài cho Playwright).
- OCR: Tesseract.js 7 (Apache 2.0), dữ liệu ngôn ngữ `eng`/`vie`/`jpn`/`kor`/`chi_sim`/`chi_tra` từ `@tesseract.js-data` (MIT).
