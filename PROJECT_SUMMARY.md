# PROJECT SUMMARY — DailyDict Vocab (v1.0.0)

> **Mô tả:** Chrome Extension hỗ trợ học tiếng Anh trên `dailydictation.com` với cơ chế tra từ thông minh và ôn tập SRS.
> **Trạng thái:** Hoàn thiện Giai đoạn 1 (Chạy Local 100%).

---

## 1. Tính năng Content Script (Tra từ trên trang web)

### 🚀 Cơ chế Tra từ "Smart-Hover" (Kỹ thuật từ MouseTooltipTranslator)
- **Hover Detection:** Tự động nhận diện từ dưới con trỏ chuột mà không cần bôi đen hay click. Sử dụng `document.caretRangeFromPoint`.
- **Debounce:** Độ trễ 600ms giúp tránh spam API khi di chuyển chuột nhanh.
- **Auto-Hide:** Tooltip tự động biến mất khi chuột rời khỏi ranh giới của từ (Bounding Box) sau 300ms.
- **Select Mode:** Vẫn hỗ trợ bôi đen (Highlight) để tra các cụm từ hoặc câu ngắn (tối đa 60 ký tự).

### 🧠 Bộ lọc Ngôn ngữ thông minh (Anti-False Positive)
- **English-Only Regex:** Chỉ nhận diện các từ thuộc bảng chữ cái Latin [a-zA-Z].
- **Context Check:** Nếu trong một đoạn văn bản có chứa ký tự tiếng Việt có dấu, hệ thống sẽ bỏ qua toàn bộ đoạn đó (Tránh tra nhầm từ tiếng Việt không dấu như "ban", "toi", "the").
- **UI Filter:** Tự động bỏ qua các khu vực menu, nút bấm, footer để tránh hiện tooltip rác.

### 🎨 Tooltip UI/UX
- **Smart Positioning:** Tự động tính toán tọa độ để không bị tràn khỏi khung hình (Edge Detection).
- **Loading State:** Hiệu ứng Loading dots mượt mà trong khi chờ API.
- **Animation:** Hiệu ứng Fade-in và Transform nhẹ nhàng khi xuất hiện/biến mất.
- **Quick Save:** Lưu từ chỉ với 1 click, tự động lấy tên bài học và URL gốc làm ngữ cảnh.

---

## 2. Tính năng Extension Popup
- **Stats Real-time:** Hiển thị Tổng số từ, số từ lưu trong ngày và chuỗi ngày học liên tục (Streak).
- **Recent Word:** Xem nhanh từ vựng vừa mới lưu gần nhất.
- **Quick Navigation:** Nút tắt mở Dashboard và Trang ôn tập trong tab mới.
- **Dynamic Badge:** Hiển thị số lượng từ cần ôn tập ngay trên nút "Ôn tập".

---

## 3. Web App (Dashboard & Management)

### 📊 Dashboard
- **Analytics Grid:** Xem tỷ lệ ghi nhớ (Retention rate) và số từ đến hạn ôn tập.
- **7-Day Activity Chart:** Biểu đồ cột hiển thị số lượng từ vựng mới tích lũy trong tuần qua.
- **Due Preview:** Danh sách 5 từ cần ôn tập gấp nhất.

### 🃏 Flashcard Review (SRS Algorithm)
- **Thuật toán Spaced Repetition:** Phân loại từ vựng theo 4 mức độ: *Quên (1), Khó (2), Nhớ (3), Dễ (4)* để tính toán ngày ôn tập tiếp theo.
- **Smart Queue:** Ưu tiên từ đến hạn. Nếu không có từ đến hạn, hệ thống cho phép ôn tập 10 từ mới nhất (để test và học luôn).
- **Keyboard Shortcuts:** Hỗ trợ phím Space để lật mặt, phím 1-4 để đánh giá mức độ nhớ.
- **Progress Bar:** Thanh tiến trình hiển thị trực quan quá trình hoàn thành buổi học.

### 📋 Word List Management
- **Search & Sort:** Tìm kiếm theo từ hoặc nghĩa tiếng Việt. Sắp xếp theo: *Mới nhất, Cũ nhất, A-Z, Cần ôn trước*.
- **Expandable Detail:** Click vào mỗi dòng để xem định nghĩa tiếng Anh và ví dụ minh họa.
- **Back-to-Source:** Click vào tên bài học để quay lại đúng trang web gốc nơi từ vựng được lưu.
- **Delete:** Xóa từ vựng kèm hộp thoại xác nhận.

---

## 4. Kiến trúc Kỹ thuật & Bảo mật

### 🛠 Tech Stack
- **Core:** Vanilla JS (ES6+), HTML5, CSS3.
- **Storage:** `chrome.storage.local` (Dữ liệu bền vững).
- **API:** 
    - `dictionaryapi.dev` (Nghĩa Anh-Anh, Phiên âm, Ví dụ).
    - `MyMemory API` (Dịch Anh-Việt).
- **Caching:** `sessionStorage` giúp lưu kết quả tra từ trong 1 giờ để tiết kiệm request.

### 🔒 Security (CSP Compliance)
- Tuân thủ tuyệt đối **Chrome Extension V3 CSP**.
- Không sử dụng Inline Script (`onclick`, `oninput`, v.v.).
- Toàn bộ sự kiện được gán qua `addEventListener` và **Event Delegation**.

### 📁 Cấu trúc thư mục hiện tại
```
dailydict-vocab/
├── extension/
│   ├── manifest.json
│   ├── background/background.js
│   ├── content/ (content.js, tooltip.js, tooltip.css)
│   ├── popup/ (popup.html, popup.js)
│   ├── shared/ (api.js, storage.js)
│   ├── webapp/ (Dashboard, Review, Words...)
│   └── icons/ (icon16, icon48, icon128)
└── README.md
```

---
*Tổng hợp bởi Ông Thợ Vibecode - 15/03/2026*
