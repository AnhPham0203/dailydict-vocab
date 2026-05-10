# JOB LIST — Word Scramble Exercise v1.4
### 5 JOB: JOB-027 → JOB-031

> **Điều kiện bắt đầu:** Project DailyDict Vocab v1.3 đã chạy ổn định.
> **Đọc trước khi làm:** TEMPLATE_BLUEPRINT.md + TEMPLATE_CONTRACT.md
> **Stack:** Vanilla JS, chrome.storage.local, Manifest V3 — không thêm dependency mới.

---

## JOB-027 — Storage: Exercise CRUD

**Context:**
Thêm methods mới vào `shared/storage.js` để lưu/đọc exercises.
Không đụng đến bất kỳ function cũ nào — chỉ append vào cuối `window.DailyDictStorage`.

**Task:**
Thêm 5 hàm sau vào `window.DailyDictStorage` trong `shared/storage.js`:

```js
async saveExercise(exerciseData)
// exerciseData = { title, sourceUrl, sentences: [{textEN, textVI, words}] }
// Tạo id = crypto.randomUUID(), createdAt = new Date().toISOString()
// Lưu vào key 'dd_exercises' (array, mỗi phần tử là 1 bài)
// Không ghi đè — push vào array hiện có
// Return: { success: true, exercise: {...} }

async getExercises()
// Return: array tất cả exercises, sort mới nhất trước (createdAt desc)

async getExerciseById(id)
// Return: 1 exercise object hoặc null nếu không tìm thấy

async deleteExercise(id)
// Xóa exercise có id tương ứng khỏi array

async getExerciseCount()
// Return: số lượng exercises hiện có (dùng cho badge)
```

**Shuffle words khi save:**
```js
// Trong saveExercise, trước khi lưu mỗi sentence:
sentence.words = shuffleArray(
  sentence.textEN
    .replace(/[.,!?;:"']/g, '')
    .split(' ')
    .filter(w => w.trim().length > 0)
)

// Hàm helper — thêm vào đầu file hoặc cuối file:
function shuffleArray(arr) {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]]
  }
  return a
}
```

**Output:** `shared/storage.js` (cập nhật)

**Constraints:**
- Key storage: `dd_exercises` (không xung đột với `dd_words`)
- Tất cả hàm đều `async` — giống pattern hiện tại của storage.js
- Backward compatible: không có `dd_exercises` → trả về `[]`, không crash

---

## JOB-028 — Content Script: Exercise Scraper

**Context:**
File content script mới chạy trên dailydictation.com.
Đọc DOM trang → lấy câu EN → dịch VI → hiện nút lưu.

**Task:**
Tạo file `content/exercise-scraper.js` với logic sau:

### 1. Detect câu trong DOM
```js
// Thợ PHẢI mở dailydictation.com, inspect DOM thực tế
// để tìm selector đúng cho các câu transcript.
// Gợi ý selector cần thử theo thứ tự:
const CANDIDATE_SELECTORS = [
  '.sentence',
  '.transcript .text',
  '[data-sentence]',
  '.dictation-text',
  '.exercise-sentence'
]

function getSentences() {
  for (const sel of CANDIDATE_SELECTORS) {
    const els = document.querySelectorAll(sel)
    if (els.length > 0) {
      return Array.from(els)
        .map(el => el.textContent.trim())
        .filter(t => t.length > 10 && t.split(' ').length >= 3)
    }
  }
  return []
}
```

### 2. Inject nút "Lưu bài tập"
```js
// Chỉ inject 1 lần, không inject lại nếu đã có
function injectSaveButton() {
  if (document.getElementById('dd-save-exercise')) return

  const btn = document.createElement('button')
  btn.id = 'dd-save-exercise'
  btn.className = 'dd-exercise-btn'
  btn.innerHTML = '💾 Lưu bài tập'

  // Tìm vị trí inject phù hợp (header bài học hoặc sau H1)
  const target = document.querySelector('h1') || document.body
  target.insertAdjacentElement('afterend', btn)

  btn.addEventListener('click', handleSaveExercise)
}
```

### 3. Translate từng câu
```js
async function translateSentence(textEN) {
  // Dùng cùng endpoint như api.js đang dùng
  const res = await fetch(
    `https://translate.googleapis.com/translate_a/single?client=gtx&sl=en&tl=vi&dt=t&q=${encodeURIComponent(textEN)}`
  )
  const json = await res.json()
  return json?.[0]?.[0]?.[0] || ''
}
```

### 4. Handler lưu bài tập
```js
async function handleSaveExercise() {
  const btn = document.getElementById('dd-save-exercise')
  btn.textContent = '⏳ Đang lưu...'
  btn.disabled = true

  const sentences = getSentences()
  if (sentences.length === 0) {
    btn.textContent = '❌ Không tìm được câu'
    setTimeout(() => {
      btn.textContent = '💾 Lưu bài tập'
      btn.disabled = false
    }, 2000)
    return
  }

  // Dịch tất cả câu song song (max 10 câu để tránh rate limit)
  const limited = sentences.slice(0, 10)
  const translated = await Promise.all(
    limited.map(async textEN => ({
      id: crypto.randomUUID(),
      textEN,
      textVI: await translateSentence(textEN),
      words: []  // storage.js sẽ shuffle khi save
    }))
  )

  const result = await window.DailyDictStorage.saveExercise({
    title: document.querySelector('h1')?.textContent?.trim() || document.title,
    sourceUrl: window.location.href,
    sentences: translated
  })

  if (result.success) {
    btn.textContent = `✅ Đã lưu ${translated.length} câu`
    setTimeout(() => {
      btn.textContent = '💾 Lưu bài tập'
      btn.disabled = false
    }, 3000)
  }
}
```

### 5. CSS cho nút (inline trong JS)
```js
// Thêm style vào <head> khi inject
const style = document.createElement('style')
style.textContent = `
  .dd-exercise-btn {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 8px 16px;
    background: #4F46E5;
    color: white;
    border: none;
    border-radius: 8px;
    font-size: 14px;
    font-weight: 500;
    cursor: pointer;
    margin: 8px 0;
    font-family: 'Plus Jakarta Sans', sans-serif;
    transition: background 0.15s;
  }
  .dd-exercise-btn:hover { background: #4338CA; }
  .dd-exercise-btn:disabled { background: #9CA3AF; cursor: default; }
`
document.head.appendChild(style)
```

**Khởi động scraper:**
```js
// Chạy khi DOM sẵn sàng
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', injectSaveButton)
} else {
  injectSaveButton()
}
```

**Output:** `content/exercise-scraper.js` (file mới)

**Constraints:**
- Chỉ inject nút 1 lần — kiểm tra `getElementById` trước
- Giới hạn 10 câu / bài để tránh spam API dịch
- Không dùng `innerHTML` để set text user content (XSS)
- Phải dùng `window.DailyDictStorage` (đã load trước trong content_scripts)
- Thợ PHẢI test selector trên trang thật trước khi hardcode

**Cập nhật `manifest.json`:**
Thêm `exercise-scraper.js` vào `content_scripts.js` array, sau `content.js`:
```json
"js": [
  "shared/badges.js",
  "shared/tags.js",
  "shared/storage.js",
  "shared/api.js",
  "content/tooltip.js",
  "content/content.js",
  "content/exercise-scraper.js"
]
```

---

## JOB-029 — Web App: Exercise List + Word Scramble UI

**Context:**
Tạo `webapp/exercise.html` — trang có 2 màn hình:
1. Danh sách bài đã lưu (SELECT_EXERCISE)
2. Word Scramble game (PLAYING)

**Task:**
Tạo `webapp/exercise.html`:

```html
<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width">
  <title>Bài tập — DailyDict</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700&display=swap" rel="stylesheet">
  <link rel="stylesheet" href="style.css">
</head>
<body>

  <!-- HEADER -->
  <header class="app-header">
    <div class="header-inner">
      <a href="index.html" class="back-btn" id="back-btn">← Dashboard</a>
      <span class="header-title" id="header-title">Bài tập</span>
      <span id="header-meta"></span>
    </div>
  </header>

  <!-- MÀN HÌNH 1: DANH SÁCH BÀI -->
  <div id="screen-list" class="container">
    <div class="section-heading-wrap">
      <h2 class="section-heading">Bài tập đã lưu</h2>
      <span id="exercise-count" class="count-label"></span>
    </div>
    <div id="exercise-list" class="exercise-list">
      <!-- render bằng JS -->
    </div>
  </div>

  <!-- MÀN HÌNH 2: WORD SCRAMBLE -->
  <div id="screen-game" class="container" style="display:none">

    <!-- Progress bar -->
    <div class="progress-track">
      <div class="progress-fill" id="progress-fill"></div>
    </div>

    <!-- Card câu hỏi -->
    <div class="scramble-card">

      <!-- Câu hỏi: nghĩa tiếng Việt -->
      <div class="scramble-question">
        <div class="scramble-label">Câu tiếng Anh của câu sau là gì?</div>
        <div class="scramble-vi" id="scramble-vi"></div>
      </div>

      <!-- Answer area: chỗ thả từ vào -->
      <div class="answer-area" id="answer-area">
        <span class="answer-placeholder" id="answer-placeholder">
          Chọn các từ bên dưới để ghép thành câu tiếng Anh...
        </span>
      </div>

      <div class="scramble-divider"></div>

      <!-- Word bank: các từ xáo trộn -->
      <div class="word-bank" id="word-bank">
        <!-- render bằng JS -->
      </div>

    </div>

    <!-- Actions -->
    <div class="scramble-actions">
      <button class="btn-ghost-sm" id="btn-clear">↩ Xóa hết</button>
      <button class="btn-primary" id="btn-check">Kiểm tra</button>
    </div>

    <!-- Feedback (ẩn mặc định) -->
    <div class="scramble-feedback" id="scramble-feedback" style="display:none"></div>

  </div>

  <!-- MÀN HÌNH 3: KẾT QUẢ -->
  <div id="screen-result" class="container" style="display:none">
    <div class="result-screen">
      <div class="result-emoji" id="result-emoji">🎉</div>
      <h2 id="result-title">Hoàn thành!</h2>
      <div class="result-score" id="result-score"></div>
      <div class="result-pct"   id="result-pct"></div>
      <div class="result-actions">
        <button class="btn-primary" id="btn-retry">🔄 Làm lại</button>
        <button class="btn-outline" id="btn-back-list">← Chọn bài khác</button>
      </div>
    </div>
  </div>

  <script src="../extension/shared/storage.js"></script>
  <script src="exercise.js"></script>
</body>
</html>
```

**Output:** `webapp/exercise.html` (file mới)

**Constraints:**
- 3 màn hình dùng show/hide (`display:none`) — không dùng router
- Script path: `../extension/shared/storage.js` (giống review.html hiện tại)
- Không inline JS trong HTML — toàn bộ logic trong `exercise.js`

---

## JOB-030 — exercise.js: Game Logic

**Context:**
Toàn bộ logic của Word Scramble game.
Quản lý state, render UI, xử lý click, kiểm tra đáp án.

**Task:**
Tạo `webapp/exercise.js`:

```js
// ── State ──
let exercises     = []     // tất cả bài đã lưu
let currentEx     = null   // bài đang chơi
let currentIdx    = 0      // câu hiện tại (index trong sentences)
let correctCount  = 0
let selectedWords = []     // từ user đã chọn (theo thứ tự)

// ── MÀN HÌNH 1: Danh sách bài ──
async function initList() {
  exercises = await window.DailyDictStorage.getExercises()

  const list    = document.getElementById('exercise-list')
  const counter = document.getElementById('exercise-count')
  counter.textContent = `${exercises.length} bài`

  if (exercises.length === 0) {
    list.innerHTML = `
      <div class="empty-state">
        <div class="empty-state__circle"><span class="empty-state__icon">📝</span></div>
        <h3 class="empty-state__title">Chưa có bài tập</h3>
        <p class="empty-state__desc">
          Vào dailydictation.com, làm bài và nhấn
          "💾 Lưu bài tập" để tạo bài tập đầu tiên.
        </p>
        <a href="https://dailydictation.com" target="_blank" class="empty-state__cta">
          Đến DailyDictation →
        </a>
      </div>`
    return
  }

  list.innerHTML = exercises.map(ex => `
    <div class="exercise-row" data-id="${ex.id}">
      <div class="exercise-row__info">
        <div class="exercise-row__title">${ex.title}</div>
        <div class="exercise-row__meta">
          ${ex.sentences.length} câu ·
          ${new Date(ex.createdAt).toLocaleDateString('vi-VN')}
        </div>
      </div>
      <div class="exercise-row__actions">
        <button class="btn-start" data-id="${ex.id}">Làm bài →</button>
        <button class="btn-delete-ex" data-id="${ex.id}">🗑</button>
      </div>
    </div>`).join('')

  // Bind events
  list.addEventListener('click', async (e) => {
    const startBtn  = e.target.closest('.btn-start')
    const deleteBtn = e.target.closest('.btn-delete-ex')

    if (startBtn) {
      const ex = exercises.find(x => x.id === startBtn.dataset.id)
      if (ex) startExercise(ex)
    }

    if (deleteBtn) {
      if (!confirm('Xóa bài tập này?')) return
      await window.DailyDictStorage.deleteExercise(deleteBtn.dataset.id)
      initList()
    }
  })
}

// ── MÀN HÌNH 2: Game ──
function startExercise(ex) {
  currentEx    = ex
  currentIdx   = 0
  correctCount = 0

  // Switch màn hình
  showScreen('game')
  document.getElementById('header-title').textContent = ex.title
  document.getElementById('back-btn').textContent = '← Bài tập'
  document.getElementById('back-btn').onclick = () => showScreen('list')

  renderQuestion()
}

function renderQuestion() {
  const sentence = currentEx.sentences[currentIdx]
  const total    = currentEx.sentences.length

  // Progress
  const pct = (currentIdx / total) * 100
  document.getElementById('progress-fill').style.width = pct + '%'
  document.getElementById('header-meta').textContent = `Câu ${currentIdx + 1}/${total}`

  // Câu hỏi
  document.getElementById('scramble-vi').textContent = sentence.textVI || '(Không có nghĩa)'

  // Reset state
  selectedWords = []
  renderAnswerArea()
  renderWordBank(sentence.words)

  // Reset feedback
  const fb = document.getElementById('scramble-feedback')
  fb.style.display = 'none'
  fb.className = 'scramble-feedback'

  // Reset answer area border
  document.getElementById('answer-area').className = 'answer-area'

  // Btn check
  document.getElementById('btn-check').disabled = false
  document.getElementById('btn-check').textContent = 'Kiểm tra'
}

function renderWordBank(words) {
  const bank = document.getElementById('word-bank')
  bank.innerHTML = words.map((w, i) => `
    <button class="word-chip" data-index="${i}" data-word="${w}">${w}</button>
  `).join('')

  bank.addEventListener('click', (e) => {
    const chip = e.target.closest('.word-chip')
    if (!chip || chip.disabled) return
    chip.disabled = true
    chip.classList.add('word-chip--used')
    selectedWords.push({ word: chip.dataset.word, chipIndex: chip.dataset.index })
    renderAnswerArea()
  })
}

function renderAnswerArea() {
  const area        = document.getElementById('answer-area')
  const placeholder = document.getElementById('answer-placeholder')

  if (selectedWords.length === 0) {
    placeholder.style.display = 'block'
    // Xóa tất cả answer chips
    area.querySelectorAll('.answer-chip').forEach(c => c.remove())
    return
  }

  placeholder.style.display = 'none'

  // Re-render answer chips
  area.querySelectorAll('.answer-chip').forEach(c => c.remove())

  selectedWords.forEach((item, i) => {
    const chip = document.createElement('button')
    chip.className = 'answer-chip'
    chip.textContent = item.word
    chip.dataset.answerIndex = i
    chip.addEventListener('click', () => returnWord(i))
    area.appendChild(chip)
  })
}

function returnWord(answerIndex) {
  const removed = selectedWords.splice(answerIndex, 1)[0]

  // Re-enable chip trong word bank
  const bankChip = document.querySelector(
    `.word-chip[data-index="${removed.chipIndex}"]`
  )
  if (bankChip) {
    bankChip.disabled = false
    bankChip.classList.remove('word-chip--used')
  }

  renderAnswerArea()
}

// ── Kiểm tra ──
function checkAnswer() {
  const sentence   = currentEx.sentences[currentIdx]
  const userAnswer = selectedWords.map(w => w.word).join(' ').toLowerCase().trim()
  const correct    = sentence.textEN
    .replace(/[.,!?;:"']/g, '')
    .toLowerCase()
    .trim()

  const isCorrect = userAnswer === correct
  const area      = document.getElementById('answer-area')
  const feedback  = document.getElementById('scramble-feedback')

  if (isCorrect) {
    area.classList.add('answer-area--correct')
    feedback.className = 'scramble-feedback scramble-feedback--correct'
    feedback.textContent = '✅ Chính xác!'
    feedback.style.display = 'block'
    correctCount++

    // Tự động next sau 1.2s
    setTimeout(nextQuestion, 1200)
  } else {
    area.classList.add('answer-area--wrong')
    feedback.className = 'scramble-feedback scramble-feedback--wrong'
    feedback.innerHTML = `❌ Chưa đúng — Đáp án: <strong>${sentence.textEN}</strong>`
    feedback.style.display = 'block'

    // Cho thử lại sau 2s
    setTimeout(() => {
      area.classList.remove('answer-area--wrong')
      feedback.style.display = 'none'
    }, 2000)
  }
}

function nextQuestion() {
  currentIdx++
  if (currentIdx >= currentEx.sentences.length) {
    showResult()
  } else {
    renderQuestion()
  }
}

// ── Màn hình kết quả ──
function showResult() {
  showScreen('result')
  const total = currentEx.sentences.length
  const pct   = Math.round((correctCount / total) * 100)

  document.getElementById('result-emoji').textContent =
    pct >= 80 ? '🎉' : pct >= 50 ? '💪' : '📖'
  document.getElementById('result-title').textContent =
    pct >= 80 ? 'Xuất sắc!' : pct >= 50 ? 'Tốt lắm!' : 'Cần luyện thêm!'
  document.getElementById('result-score').textContent = `${correctCount} / ${total} câu đúng`
  document.getElementById('result-pct').textContent   = `${pct}%`

  document.getElementById('btn-retry').addEventListener('click', () => startExercise(currentEx))
  document.getElementById('btn-back-list').addEventListener('click', () => {
    showScreen('list')
    initList()
  })
}

// ── Utilities ──
function showScreen(name) {
  document.getElementById('screen-list').style.display   = name === 'list'   ? 'block' : 'none'
  document.getElementById('screen-game').style.display   = name === 'game'   ? 'block' : 'none'
  document.getElementById('screen-result').style.display = name === 'result' ? 'block' : 'none'
}

// ── Init & Events ──
document.addEventListener('DOMContentLoaded', () => {
  initList()

  document.getElementById('btn-check').addEventListener('click', checkAnswer)
  document.getElementById('btn-clear').addEventListener('click', () => {
    // Trả tất cả từ về word bank
    selectedWords.forEach(item => {
      const chip = document.querySelector(`.word-chip[data-index="${item.chipIndex}"]`)
      if (chip) { chip.disabled = false; chip.classList.remove('word-chip--used') }
    })
    selectedWords = []
    renderAnswerArea()
  })
})
```

**Output:** `webapp/exercise.js` (file mới)

**Constraints:**
- Không dùng innerHTML để render content người dùng nhập (XSS)
- `returnWord` phải re-enable đúng chip trong word bank theo `chipIndex`
- Answer comparison: lowercase + bỏ dấu câu ở cả 2 phía trước khi so sánh
- Không dùng `alert()` ở bất kỳ đâu

---

## JOB-031 — CSS + Dashboard Integration + Test

**Context:**
Thêm CSS cho exercise UI vào `style.css`, thêm nút "Bài tập" vào Dashboard.
Đây là JOB cuối — sau đó chạy full test.

**Task:**

### 1. Thêm CSS vào `webapp/style.css`

```css
/* ══════════════════════════════
   EXERCISE LIST
══════════════════════════════ */
.exercise-list { display: flex; flex-direction: column; gap: var(--space-3); }

.exercise-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-4);
  padding: var(--space-4) var(--space-5);
  background: var(--c-surface);
  border: 1px solid var(--c-border);
  border-radius: var(--radius-lg);
  transition: border-color 0.15s;
}
.exercise-row:hover { border-color: var(--c-primary); }

.exercise-row__title {
  font-size: var(--text-base);
  font-weight: var(--weight-semi);
  color: var(--c-text-1);
  margin-bottom: 2px;
}
.exercise-row__meta {
  font-size: var(--text-xs);
  color: var(--c-text-4);
}
.exercise-row__actions { display: flex; gap: var(--space-2); align-items: center; }

.btn-start {
  padding: var(--space-2) var(--space-4);
  background: var(--c-primary);
  color: white;
  border: none;
  border-radius: var(--radius-md);
  font-size: var(--text-sm);
  font-weight: var(--weight-medium);
  cursor: pointer;
  font-family: var(--font-main);
  white-space: nowrap;
  transition: background 0.15s;
}
.btn-start:hover { background: #4338CA; }

.btn-delete-ex {
  background: none;
  border: none;
  cursor: pointer;
  font-size: 16px;
  opacity: 0;
  padding: var(--space-1);
  border-radius: var(--radius-sm);
  transition: opacity 0.15s;
}
.exercise-row:hover .btn-delete-ex { opacity: 1; }
.btn-delete-ex:hover { background: var(--c-danger-bg); }

/* ══════════════════════════════
   SCRAMBLE GAME
══════════════════════════════ */
.scramble-card {
  background: var(--c-surface);
  border: 1px solid var(--c-border);
  border-radius: var(--radius-xl);
  padding: var(--space-6) var(--space-6);
  margin: var(--space-5) auto;
  max-width: 720px;
}

.scramble-label {
  font-size: var(--text-xs);
  font-weight: var(--weight-semi);
  text-transform: uppercase;
  letter-spacing: .06em;
  color: var(--c-text-4);
  margin-bottom: var(--space-3);
}

.scramble-vi {
  font-size: var(--text-xl);
  font-weight: var(--weight-semi);
  color: var(--c-primary);
  line-height: var(--leading-normal);
  margin-bottom: var(--space-5);
  letter-spacing: -0.01em;
}

/* Answer area */
.answer-area {
  min-height: 56px;
  border: 2px dashed var(--c-border-strong);
  border-radius: var(--radius-lg);
  padding: var(--space-3) var(--space-4);
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-2);
  align-items: center;
  margin-bottom: var(--space-4);
  transition: border-color 0.2s, background 0.2s;
}
.answer-area--correct {
  border-color: var(--c-success);
  background: var(--c-success-bg);
}
.answer-area--wrong {
  border-color: var(--c-danger);
  background: var(--c-danger-bg);
  animation: wp-shake 0.3s ease;
}
.answer-placeholder {
  font-size: var(--text-sm);
  color: var(--c-text-4);
}

/* Answer chips */
.answer-chip {
  padding: var(--space-2) var(--space-3);
  background: var(--c-primary);
  color: white;
  border: none;
  border-radius: var(--radius-md);
  font-size: var(--text-sm);
  font-weight: var(--weight-medium);
  cursor: pointer;
  font-family: var(--font-main);
  transition: opacity 0.15s, transform 0.1s;
}
.answer-chip:hover {
  opacity: 0.85;
  transform: translateY(-1px);
}
.answer-chip:active { transform: translateY(0); }

/* Divider */
.scramble-divider {
  height: 1px;
  background: var(--c-border);
  margin: var(--space-4) 0;
}

/* Word bank */
.word-bank {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-2);
  min-height: 44px;
}

.word-chip {
  padding: var(--space-2) var(--space-4);
  background: var(--c-surface);
  border: 1.5px solid var(--c-border);
  border-radius: var(--radius-md);
  font-size: var(--text-base);
  font-weight: var(--weight-medium);
  color: var(--c-text-1);
  cursor: pointer;
  font-family: var(--font-main);
  transition: all 0.15s;
}
.word-chip:hover:not(:disabled) {
  border-color: var(--c-primary);
  color: var(--c-primary);
  background: var(--c-primary-light);
  transform: translateY(-2px);
}
.word-chip--used { opacity: 0.3; }
.word-chip:disabled { cursor: default; }

/* Actions row */
.scramble-actions {
  display: flex;
  justify-content: space-between;
  align-items: center;
  max-width: 720px;
  margin: 0 auto var(--space-4);
  padding: 0 var(--space-1);
}

/* Feedback */
.scramble-feedback {
  max-width: 720px;
  margin: 0 auto;
  padding: var(--space-3) var(--space-5);
  border-radius: var(--radius-lg);
  font-size: var(--text-sm);
  font-weight: var(--weight-medium);
  animation: fadeSlideUp 0.2s ease;
}
.scramble-feedback--correct {
  background: var(--c-success-bg);
  color: var(--c-success);
}
.scramble-feedback--wrong {
  background: var(--c-danger-bg);
  color: var(--c-danger);
}
.scramble-feedback strong { font-weight: var(--weight-bold); }

/* Section heading wrap */
.section-heading-wrap {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: var(--space-4);
}
.count-label {
  font-size: var(--text-sm);
  color: var(--c-text-4);
}
```

### 2. Thêm nút "Bài tập" vào Dashboard `index.html`

Tìm phần `cta-secondary-row` trong `index.html`:
```html
<div class="cta-secondary-row">
  <button class="cta-secondary" id="btn-writing">✍️ Writing</button>
  <button class="cta-secondary" id="btn-quiz">🎯 Quiz</button>
  <a href="words.html" class="cta-secondary">📚 Từ vựng</a>
</div>
```

Thêm `a` tag vào sau `📚 Từ vựng`:
```html
<div class="cta-secondary-row">
  <button class="cta-secondary" id="btn-writing">✍️ Writing</button>
  <button class="cta-secondary" id="btn-quiz">🎯 Quiz</button>
  <a href="words.html"    class="cta-secondary">📚 Từ vựng</a>
  <a href="exercise.html" class="cta-secondary">📝 Bài tập</a>
</div>
```

> Cần cập nhật CSS `.cta-secondary-row` thành 4 cột:
> `grid-template-columns: repeat(4, 1fr);` (hoặc `repeat(2, 1fr)` trên mobile)

### 3. Checklist test sau khi hoàn thành

```
□ Vào dailydictation.com bài bất kỳ → thấy nút "💾 Lưu bài tập"
□ Click lưu → hiện "⏳ Đang lưu..." → hiện "✅ Đã lưu X câu"
□ Mở Dashboard → thấy nút "📝 Bài tập"
□ Click → exercise.html → thấy bài vừa lưu trong danh sách
□ Click "Làm bài →" → màn hình Word Scramble
□ Câu 1/N hiện đúng nghĩa VI
□ Click từ EN → hiện trong answer area
□ Click từ trong answer area → trả về word bank
□ Nút "↩ Xóa hết" → clear toàn bộ answer area
□ Ghép đúng + Kiểm tra → border xanh → next sau 1.2s
□ Ghép sai + Kiểm tra → border đỏ + shake → hiện đáp án đúng
□ Hết bài → màn hình kết quả đúng điểm
□ Nút "Làm lại" → chạy lại bài với từ shuffle mới
□ Xóa bài trong danh sách → confirm → biến mất
```

**Output:**
- `webapp/style.css` (cập nhật — thêm CSS mới vào cuối)
- `webapp/index.html` (cập nhật — thêm nút Bài tập)

**Constraints:**
- CSS mới thêm vào **cuối** `style.css`, không sửa phần cũ
- `.cta-secondary-row` cập nhật sang 4 cột — test responsive mobile trước
- Không xóa bất kỳ CSS nào đang dùng

---

## GATE CHECKLIST — SHIP

```
□ JOB-027: storage.js có đủ 5 hàm exercise, test saveExercise + getExercises
□ JOB-028: nút "💾 Lưu bài tập" hiện trên trang thật, lưu được dữ liệu
□ JOB-029: exercise.html render không lỗi, 3 màn hình switch đúng
□ JOB-030: game logic đúng — click, check, next, result
□ JOB-031: CSS đúng design system, Dashboard có nút Bài tập
□ Không có console error khi dùng bình thường
□ Responsive 1280px và 768px
```

---

## CẤU TRÚC FILE MỚI

```
extension/
  content/
    exercise-scraper.js     ← MỚI (JOB-028)
  shared/
    storage.js              ← CẬP NHẬT (JOB-027)
  webapp/
    exercise.html           ← MỚI (JOB-029)
    exercise.js             ← MỚI (JOB-030)
    style.css               ← CẬP NHẬT (JOB-031)
    index.html              ← CẬP NHẬT (JOB-031)
  manifest.json             ← CẬP NHẬT (JOB-028)
```

---

*JOB LIST v1.4 — Word Scramble Exercise*
*Tổng hợp bởi Ông Thầu Vibecode*
