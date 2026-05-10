# CONTRACT — Word Scramble Exercise v1.4

---

## Scope IN — Sẽ build

| # | Tính năng | Mô tả |
|---|---|---|
| 1 | Scrape câu từ trang | Content script đọc DOM, lấy câu EN + dịch VI |
| 2 | Nút "Lưu bài tập" | Inject vào trang dailydictation.com |
| 3 | Exercise storage | `dd_exercises` trong chrome.storage.local |
| 4 | Danh sách bài đã lưu | exercise.html: chọn bài để làm |
| 5 | Word Scramble game | Hiện VI → click từ EN ghép câu |
| 6 | Kiểm tra đúng/sai | Feedback màu + tự động next khi đúng |
| 7 | Màn hình kết quả | X/Y đúng + nút làm lại |
| 8 | Nút Bài tập trên Dashboard | Link từ index.html sang exercise.html |

---

## Scope OUT — KHÔNG build trong v1.4

| Tính năng | Lý do |
|---|---|
| Dạng bài điền từ vào chỗ trống | Để v1.5 |
| Dạng bài nối nghĩa | Để v1.5 |
| Audio phát câu (TTS) | Scope mở rộng, để sau |
| Sync Supabase cho exercises | Chưa có cloud sync cho từ vựng |
| Chỉnh sửa câu sau khi lưu | Để v1.5 |
| Tự nhập câu thủ công | Không phải luồng chính |

---

## Definition of Done (DoD)

Tất cả điều kiện sau phải test được và pass:

**Scraper:**
- [ ] Vào bài học bất kỳ trên dailydictation.com → thấy nút "💾 Lưu bài tập"
- [ ] Click nút → không có lỗi console
- [ ] Sau khi lưu → popup extension hiện badge số bài mới (hoặc thông báo xác nhận)

**Storage:**
- [ ] `chrome.storage.local` có key `dd_exercises` sau lần lưu đầu tiên
- [ ] Lưu 2 bài khác nhau → 2 entry riêng biệt, không ghi đè
- [ ] Mỗi sentence có đủ: `textEN`, `textVI`, `words` (đã shuffle)

**Word Scramble UI:**
- [ ] exercise.html load → hiện danh sách bài đã lưu
- [ ] Chọn bài → màn hình câu 1, hiện nghĩa VI + các từ EN xáo trộn
- [ ] Progress "Câu 1/10" cập nhật đúng
- [ ] Click từ EN → từ hiện trong answer area
- [ ] Click từ trong answer area → trả về word bank
- [ ] Click "Kiểm tra" khi đúng → border xanh + next sau 1.2s
- [ ] Click "Kiểm tra" khi sai → border đỏ + cho thử lại
- [ ] Hết bài → màn hình kết quả X/Y đúng

**Integration:**
- [ ] Dashboard (index.html) có nút "📝 Bài tập" link đến exercise.html
- [ ] Không có console error khi dùng bình thường
- [ ] Responsive trên màn hình 1280px và 768px

---

## Timeline

| Phase | JOB | Ước tính |
|---|---|---|
| BUILD | JOB-027 đến JOB-031 | 5 JOB |
| VERIFY | Thầu đọc + test | 1 buổi |
| SHIP | Thợ chạy checklist | 30 phút |
