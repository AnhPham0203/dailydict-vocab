# PROJECT INTAKE — Word Scramble Exercise

## Product Name
DailyDict Vocab — Word Scramble Exercise (v1.4)

## Problem Statement
Người học tiếng Anh trên dailydictation.com sau khi luyện nghe xong không có cách ôn lại
câu theo dạng tương tác. Tính năng Word Scramble cho phép lưu lại các câu từ bài học,
sau đó luyện tập bằng cách ghép các từ tiếng Anh xáo trộn thành câu đúng — trực tiếp
bên trong extension đã có.

## Target Users
- Người Việt đang dùng DailyDict Vocab extension
- Đang học tiếng Anh qua dailydictation.com
- Muốn ôn lại câu hoàn chỉnh, không chỉ từ đơn lẻ

## Core Features (v1)
1. **Scrape câu từ dailydictation.com** — content script đọc transcript/câu tiếng Anh
   từ bài đang học, kèm nghĩa tiếng Việt từ API dịch
2. **Lưu exercise vào storage** — lưu tập hợp câu theo từng bài học
3. **Word Scramble UI** — hiện nghĩa VI → người dùng click từ EN để ghép thành câu
4. **Kiểm tra & phản hồi** — nút "Kiểm tra", hiện đúng/sai, next câu
5. **Progress tracking** — Câu X/Y, kết quả cuối buổi

## Platform
Chrome Extension (Manifest V3) — thêm vào webapp hiện tại của DailyDict Vocab
File mới: `webapp/exercise.html` + `exercise.js`
Dùng chung: `shared/storage.js`, `shared/api.js`, `webapp/style.css`

## Tech Stack
- Vanilla JS (giống toàn bộ project hiện tại)
- chrome.storage.local (lưu exercises)
- Google Translate API (lấy nghĩa VI cho từng câu)
- Content script mới: `content/exercise-scraper.js`

## Success Criteria
- [ ] Đang làm bài trên dailydictation.com → click nút "Lưu bài tập" → toàn bộ câu
      trong bài được lưu lại
- [ ] Mở exercise.html → chọn bài → làm Word Scramble từng câu
- [ ] Ghép đúng → hiện xanh + next câu tự động
- [ ] Ghép sai → hiện đỏ + cho thử lại
- [ ] Xong bài → màn hình tổng kết X/Y câu đúng
