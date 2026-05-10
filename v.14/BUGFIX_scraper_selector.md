# BUGFIX — Exercise Scraper: Không tìm được câu

> **Lỗi:** Nút hiện "❌ Không tìm được câu" — `getSentences()` trả về `[]`
> **Nguyên nhân:** dailydictation.com là SPA (React), DOM render dynamic.
>   Các selector cũ đoán mò đều sai.
> **File cần sửa:** `content/exercise-scraper.js`

---

## PHÂN TÍCH DOM TỪ ẢNH

Nhìn vào ảnh trang bài học, có 3 nguồn câu tiếng Anh:

```
Nguồn 1 — Textarea đang gõ:
  Câu hiện tại đang làm (1 câu, thay đổi theo Next)
  → KHÔNG dùng: chỉ có 1 câu, không đủ

Nguồn 2 — Cột bên phải (nghĩa VI):
  "Chào buổi sáng, Jack." — do trang dịch sẵn
  → Đây là textVI có sẵn, không cần gọi API dịch nữa

Nguồn 3 — Tab "Full transcript":
  Chứa TẤT CẢ câu EN của bài (1/17 → 17 câu)
  → ĐÂY LÀ NGUỒN ĐÚNG cần scrape
```

---

## CHIẾN LƯỢC FIX

### Bước 1 — Click vào tab "Full transcript" trước khi scrape

Tab "Full transcript" chứa toàn bộ câu. Nhưng vì là SPA, tab cần được
click để render nội dung vào DOM.

```js
async function clickFullTranscriptTab() {
  // Tìm tab "Full transcript" theo text content
  const tabs = document.querySelectorAll('[role="tab"], button, .tab')
  const fullTab = Array.from(tabs).find(el =>
    el.textContent.trim().toLowerCase().includes('full transcript')
  )

  if (fullTab) {
    fullTab.click()
    // Chờ DOM render sau khi click tab
    await new Promise(resolve => setTimeout(resolve, 800))
    return true
  }
  return false
}
```

### Bước 2 — Lấy câu EN + nghĩa VI cùng lúc từ DOM

Sau khi Full transcript render, trang hiện cả câu EN lẫn nghĩa VI đã dịch
sẵn (trang đã có "Translated by ChatGPT4.1" cho mỗi câu). Không cần
gọi API dịch nữa — lấy thẳng từ DOM, nhanh hơn và chính xác hơn.

```js
function getSentencesFromTranscript() {
  // Thợ PHẢI mở DevTools → Console → paste đoạn sau để tìm selector đúng:
  //
  // document.querySelectorAll('[class*="sentence"]').forEach(el => console.log(el.className, el.textContent.slice(0,50)))
  // document.querySelectorAll('[class*="transcript"]').forEach(el => console.log(el.className, el.textContent.slice(0,50)))
  // document.querySelectorAll('[class*="line"]').forEach(el => console.log(el.className, el.textContent.slice(0,50)))
  //
  // Sau đó điền selector tìm được vào đây:

  const SELECTORS_TO_TRY = [
    // Nhóm 1: Selector theo class có chứa từ khóa
    '[class*="sentence"]',
    '[class*="transcript-line"]',
    '[class*="TranscriptLine"]',
    '[class*="dictation-line"]',

    // Nhóm 2: Selector theo data attribute
    '[data-sentence]',
    '[data-index]',

    // Nhóm 3: Cấu trúc phổ biến của SPA dạng bài tập
    '.sentence-item',
    '.transcript-item',
    '.exercise-line',

    // Nhóm 4: Fallback — tìm tất cả p trong vùng transcript
    '.transcript p',
    '.full-transcript p',
    '[class*="content"] p',
  ]

  for (const sel of SELECTORS_TO_TRY) {
    const els = document.querySelectorAll(sel)
    if (els.length >= 2) {
      // Lọc chỉ lấy element có nội dung là tiếng Anh (chứa chữ Latin)
      const EN_REGEX = /^[a-zA-Z\s.,!?'"()-]+$/
      const results = Array.from(els)
        .map(el => el.textContent.trim())
        .filter(t => t.length > 5 && EN_REGEX.test(t))

      if (results.length >= 2) {
        console.log(`[DailyDict] Tìm được ${results.length} câu với selector: ${sel}`)
        return results
      }
    }
  }
  return []
}
```

### Bước 3 — Lấy nghĩa VI từ DOM (không cần gọi API)

Trang đã có nghĩa VI cho mỗi câu (hiện bên phải). Tìm và ghép cặp EN-VI:

```js
function getViTranslationsFromDOM() {
  // VI text nằm ở cột bên phải, có thể nhận diện vì:
  // 1. Chứa ký tự tiếng Việt có dấu
  // 2. Nằm cùng cấu trúc DOM với câu EN

  const VI_REGEX = /[àáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđ]/

  const allText = document.querySelectorAll('p, span, div')
  const viTexts = Array.from(allText)
    .map(el => el.textContent.trim())
    .filter(t =>
      t.length > 3 &&
      t.length < 300 &&
      VI_REGEX.test(t) &&
      !t.includes('DailyDictation') // loại bỏ UI text
    )

  return viTexts
}
```

---

## CODE FIX HOÀN CHỈNH — Thay toàn bộ `handleSaveExercise`

Thay hàm `handleSaveExercise` trong `exercise-scraper.js` bằng:

```js
async function handleSaveExercise() {
  const btn = document.getElementById('dd-save-exercise')
  btn.textContent = '⏳ Đang tìm câu...'
  btn.disabled = true

  try {
    // BƯỚC 1: Click tab Full transcript
    const tabClicked = await clickFullTranscriptTab()

    // BƯỚC 2: Lấy câu EN
    let sentences = getSentencesFromTranscript()

    // BƯỚC 3: Nếu vẫn không có → fallback lấy từ textarea hiện tại
    if (sentences.length === 0) {
      sentences = getFallbackFromCurrentSentence()
    }

    // BƯỚC 4: Vẫn không có → báo lỗi với hướng dẫn
    if (sentences.length === 0) {
      btn.textContent = '❌ Không tìm được câu'
      btn.title = 'Hãy click tab "Full transcript" rồi thử lại'
      setTimeout(() => {
        btn.textContent = '💾 Lưu bài tập'
        btn.disabled = false
        btn.title = ''
      }, 3000)
      return
    }

    btn.textContent = `⏳ Đang dịch ${sentences.length} câu...`

    // BƯỚC 5: Thử lấy VI từ DOM trước, nếu không đủ mới gọi API
    const viFromDOM = getViTranslationsFromDOM()

    const translated = await Promise.all(
      sentences.slice(0, 15).map(async (textEN, i) => {
        // Dùng VI từ DOM nếu có và đủ số lượng
        let textVI = viFromDOM[i] || null

        // Fallback: gọi API dịch nếu không lấy được từ DOM
        if (!textVI) {
          textVI = await translateSentence(textEN)
        }

        return {
          id: crypto.randomUUID(),
          textEN,
          textVI,
          words: [] // storage.js sẽ shuffle
        }
      })
    )

    // BƯỚC 6: Lưu vào storage
    const result = await window.DailyDictStorage.saveExercise({
      title: getLessonTitle(),
      sourceUrl: window.location.href,
      sentences: translated
    })

    if (result.success) {
      btn.textContent = `✅ Đã lưu ${translated.length} câu`

      // Nếu tab đã click → switch về tab Dictation
      if (tabClicked) {
        const dictTab = Array.from(
          document.querySelectorAll('[role="tab"], button, .tab')
        ).find(el => el.textContent.trim().toLowerCase() === 'dictation')
        dictTab?.click()
      }

      setTimeout(() => {
        btn.textContent = '💾 Lưu bài tập'
        btn.disabled = false
      }, 3000)
    }

  } catch (err) {
    console.error('[DailyDict] Lỗi khi lưu bài tập:', err)
    btn.textContent = '❌ Lỗi — thử lại'
    setTimeout(() => {
      btn.textContent = '💾 Lưu bài tập'
      btn.disabled = false
    }, 2000)
  }
}

// Fallback: lấy câu đang hiển thị trong textarea
function getFallbackFromCurrentSentence() {
  const textarea = document.querySelector('textarea, input[type="text"]')
  if (!textarea || !textarea.value.trim()) return []
  return [textarea.value.trim()]
}

// Lấy tên bài học
function getLessonTitle() {
  return (
    document.querySelector('h1')?.textContent?.trim() ||
    document.querySelector('[class*="title"]')?.textContent?.trim() ||
    document.title
  )
}
```

---

## HƯỚNG DẪN THỢ: TÌM SELECTOR ĐÚNG

Đây là bước **bắt buộc** — phải làm trên trang thật trước khi code.

**Bước 1:** Mở bài học trên dailydictation.com

**Bước 2:** Click tab **"Full transcript"**

**Bước 3:** Mở DevTools (F12) → Console → paste từng lệnh sau:

```js
// Lệnh 1: Tìm theo class chứa "sentence"
document.querySelectorAll('[class*="sentence"]')
  .forEach(el => console.log(el.tagName, el.className, '|', el.textContent.slice(0,60)))

// Lệnh 2: Tìm theo class chứa "transcript"
document.querySelectorAll('[class*="transcript"]')
  .forEach(el => console.log(el.tagName, el.className, '|', el.textContent.slice(0,60)))

// Lệnh 3: Tìm theo class chứa "line"
document.querySelectorAll('[class*="line"]')
  .forEach(el => console.log(el.tagName, el.className, '|', el.textContent.slice(0,60)))

// Lệnh 4: Tìm tất cả p trong trang
document.querySelectorAll('p')
  .forEach(el => console.log(el.className, '|', el.textContent.slice(0,60)))
```

**Bước 4:** Tìm element nào chứa câu tiếng Anh như `"Good morning, Jack."`, `"How are you?"`, v.v.

**Bước 5:** Điền className tìm được vào đầu `SELECTORS_TO_TRY` trong code.

**Bước 6:** Test lại bằng lệnh:
```js
// Paste vào Console để test selector vừa tìm:
document.querySelectorAll('SELECTOR_CỦA_BẠN')
  .forEach(el => console.log(el.textContent.trim()))
```

---

## CHECKLIST TEST SAU KHI FIX

```
□ Mở bài học → thấy nút "💾 Lưu bài tập"
□ Click nút → hiện "⏳ Đang tìm câu..."
□ KHÔNG hiện "❌ Không tìm được câu" nữa
□ Hiện "⏳ Đang dịch X câu..."
□ Hiện "✅ Đã lưu X câu"
□ Mở exercise.html → thấy bài vừa lưu với đủ câu
□ Mỗi câu có textEN và textVI
□ words[] đã được shuffle (không theo thứ tự gốc)
□ Console không có error đỏ
```

---

*BUGFIX Scraper Selector — DailyDict Vocab v1.4*
*Tổng hợp bởi Ông Thầu Vibecode*
