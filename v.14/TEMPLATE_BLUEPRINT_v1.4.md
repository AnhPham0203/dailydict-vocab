# BLUEPRINT — Word Scramble Exercise (v1.4)

---

## 1. System Architecture

```
dailydictation.com (trang học)
  └── content/exercise-scraper.js  ← MỚI
        │  Đọc DOM bài học → lấy danh sách câu EN
        │  Gọi API dịch → lấy nghĩa VI từng câu
        │  Hiện nút "💾 Lưu bài tập" trên trang
        │
        ▼ chrome.storage.local { dd_exercises }
        │
        ▼
  webapp/exercise.html             ← MỚI
  webapp/exercise.js               ← MỚI
        │  Load exercises từ storage
        │  Render Word Scramble UI
        │  Xử lý click, kiểm tra, next câu
        │
  webapp/index.html                ← CẬP NHẬT (thêm nút "Bài tập")
  shared/storage.js                ← CẬP NHẬT (thêm exercise CRUD)
```

**Dùng chung (không đổi):**
- `shared/api.js` — translate API
- `webapp/style.css` — design system
- `shared/storage.js` — thêm methods mới, không xóa cũ

---

## 2. Core Modules

### Module A — `exercise-scraper.js` (content script mới)
**Trách nhiệm:**
- Detect khi đang ở trang bài học dailydictation.com
- Đọc DOM lấy tất cả câu tiếng Anh trong transcript
- Gọi translate API lấy nghĩa VI từng câu
- Inject nút "💾 Lưu bài tập" vào UI trang
- Khi click → gọi `saveExercise()` → lưu vào storage

**Cách lấy câu từ DOM:**
```
dailydictation.com render câu trong các element có class
chứa text transcript. Scraper sẽ:
1. Query tất cả câu trong bài (selector cần test thực tế)
2. Clean text: bỏ dấu câu, lowercase để so sánh
3. Lấy tên bài từ <h1> hoặc <title>
```

### Module B — Storage Exercise CRUD
**Trách nhiệm:** Lưu/đọc/xóa exercises trong `dd_exercises`

**Structure:**
```js
// Key: 'dd_exercises' → array
{
  id: "uuid",
  title: "Hidden travel gems",          // tên bài học
  sourceUrl: "https://dailydictation.com/...",
  createdAt: "ISO string",
  sentences: [
    {
      id: "uuid",
      textEN: "Hidden travel gems are places...", // câu gốc tiếng Anh
      textVI: "Những điểm du lịch ít người biết", // nghĩa tiếng Việt
      words: ["Hidden", "travel", "gems", "are", "places"] // đã shuffle
    }
  ]
}
```

### Module C — `exercise.html` + `exercise.js`
**Trách nhiệm:** Toàn bộ game UI

**States:**
```
LOADING → SELECT_EXERCISE → PLAYING → RESULT
```

---

## 3. User Flow

```
Người dùng đang làm bài trên dailydictation.com
  ↓
Thấy nút "💾 Lưu bài tập" (inject bởi scraper)
  ↓
Click → scraper đọc DOM → dịch VI → lưu vào storage
  ↓ (badge extension hiện số bài mới)
Mở webapp → Dashboard → nút "📝 Bài tập"
  ↓
exercise.html: danh sách các bài đã lưu
  ↓
Chọn bài → màn hình Word Scramble
  ↓
[VÒNG LẶP]
  Hiện nghĩa VI → người dùng click từ EN để ghép
  Click "Kiểm tra"
  - Đúng → ✅ xanh → tự động next sau 1.2s
  - Sai  → ❌ đỏ → highlight sai → cho thử lại
  Hết câu → màn hình kết quả
  ↓
Kết quả: X/Y đúng, nút "Làm lại" hoặc "Chọn bài khác"
```

---

## 4. Data Flow chi tiết

```
exercise-scraper.js
  → querySelectorAll(SENTENCE_SELECTOR)
  → map(el => el.textContent.trim())
  → filter(text => text.length > 3)
  → Promise.all(sentences.map(s => translateVI(s)))
  → DailyDictStorage.saveExercise({ title, sourceUrl, sentences })
  → chrome.storage.local.set({ dd_exercises: [...] })

exercise.js
  → DailyDictStorage.getExercises()
  → user chọn bài
  → renderQuestion(sentence):
      words = sentence.words (đã shuffle khi save)
      hiện .word-bank chips
  → user click chip → append vào .answer-area
  → click "Kiểm tra":
      userAnswer = answer-area chips.join(' ')
      correct = sentence.textEN (normalize)
      compare → show feedback
```

---

## 5. Selector Strategy cho dailydictation.com

Cần test thực tế. Thợ phải kiểm tra DOM của trang để xác định selector chính xác. Gợi ý:
```js
// Thử các selector này theo thứ tự ưu tiên:
const SELECTORS = [
  '.sentence-text',
  '.transcript-line',
  '[data-sentence]',
  '.exercise-text p'
]
// Nếu không có selector rõ ràng → lấy tất cả <p> trong main content area
// Lọc: chỉ lấy text > 10 ký tự, có ít nhất 3 từ
```

---

## 6. Shuffle Algorithm

```js
function shuffleWords(sentence) {
  const words = sentence.split(' ')
    .map(w => w.replace(/[.,!?;:]/g, '')) // bỏ dấu câu
    .filter(w => w.length > 0)

  // Fisher-Yates shuffle
  for (let i = words.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [words[i], words[j]] = [words[j], words[i]]
  }
  return words
}
```

---

## 7. Answer Comparison

```js
function checkAnswer(userWords, correctText) {
  const userStr    = userWords.join(' ').toLowerCase().trim()
  const correctStr = correctText.toLowerCase()
    .replace(/[.,!?;:]/g, '').trim()
  return userStr === correctStr
}
```
