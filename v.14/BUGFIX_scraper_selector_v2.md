# BUGFIX — Scraper Selector: Fix chính xác từ DOM thực tế

> **Dữ liệu:** Inspect trực tiếp từ dailydictation.com — Full transcript tab
> **Kết quả:** Tìm được selector chính xác + cấu trúc EN/VI cùng block
> **File cần sửa:** `content/exercise-scraper.js`

---

## CẤU TRÚC DOM THỰC TẾ

Từ ảnh Console, Full transcript render như sau:

```
DIV.fs-4  → "Hi Elizabeth, please take a seat, make yourself at home."  ← câu EN
             (nghĩa VI nằm ngay bên dưới cùng parent block)

DIV.fs-6  → "I am going to mix up the sales teams and see if that makes a"  ← câu EN khác
DIV.      → "I am going to mix up the sales teams and see if that makes a"  ← cùng text, div khác
```

**Selector chính xác:**
- `DIV.fs-4` — câu EN (font-size 4, dạng heading nhỏ)
- `DIV.fs-6` — câu EN (font-size 6, dạng body)
- Nghĩa VI: nằm trong cùng parent element, ngay sau câu EN

---

## CÁCH LẤY CẢ EN VÀ VI CÙNG LÚC

Nhìn vào ảnh Full transcript bên phải:
```
[►] Hi Elizabeth, please take a seat, make yourself at home.
    Chào Elizabeth, vui lòng ngồi xuống, cứ tự nhiên như ở nhà nhé.

[►] I called you up here because I have some bad news.
    Tôi gọi bạn lên đây vì tôi có một vài tin xấu.

[►] I just looked at the end of the month reports and they aren't good.
    ...
```

Mỗi block có **cả EN lẫn VI** — không cần gọi API dịch.

---

## CODE FIX HOÀN CHỈNH

Thay toàn bộ hàm `getSentences` và thêm hàm `getSentencePairs`
trong `content/exercise-scraper.js`:

```js
// XÓA hàm getSentences() cũ
// THAY BẰNG hàm này:

function getSentencePairs() {
  // Selector chính xác từ DOM thực tế của dailydictation.com
  // Full transcript render các câu EN trong DIV.fs-4 và DIV.fs-6

  const pairs = []

  // Tìm tất cả block câu trong Full transcript
  // Mỗi block chứa: [play button] + [câu EN] + [câu VI]
  const transcriptContainer = findTranscriptContainer()
  if (!transcriptContainer) return []

  // Lấy tất cả div con trực tiếp của container
  // Mỗi div con = 1 câu (có cả EN và VI)
  const blocks = transcriptContainer.querySelectorAll('div')

  blocks.forEach(block => {
    // Tìm câu EN: DIV.fs-4 hoặc DIV.fs-6 bên trong block
    const enEl = block.querySelector('.fs-4, .fs-6, [class*="fs-"]')
    if (!enEl) return

    const textEN = enEl.textContent.trim()
    if (!textEN || textEN.length < 5) return

    // Validate: phải là tiếng Anh (có chữ Latin)
    if (!/^[A-Za-z]/.test(textEN)) return

    // Tìm câu VI: element ngay sau câu EN trong cùng block
    // VI text chứa ký tự có dấu tiếng Việt
    const VI_REGEX = /[àáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđ]/i
    let textVI = ''

    // Tìm element anh em (sibling) hoặc con khác của block chứa VI
    const allInBlock = block.querySelectorAll('*')
    for (const el of allInBlock) {
      const t = el.textContent.trim()
      if (t.length > 5 && VI_REGEX.test(t) && el.children.length === 0) {
        textVI = t
        break
      }
    }

    pairs.push({ textEN, textVI })
  })

  // Deduplicate: bỏ câu trùng
  const seen = new Set()
  return pairs.filter(p => {
    if (seen.has(p.textEN)) return false
    seen.add(p.textEN)
    return true
  })
}

function findTranscriptContainer() {
  // Tìm container của Full transcript
  // Dựa vào DOM: các câu nằm trong vùng có class chứa "transcript"
  // hoặc vùng bên phải của layout (cột phải trong ảnh)

  const candidates = [
    document.querySelector('[class*="transcript"]'),
    document.querySelector('[class*="full-transcript"]'),
    document.querySelector('[class*="FullTranscript"]'),
    // Fallback: tìm container có nhiều DIV.fs-4 hoặc DIV.fs-6
    findContainerWithManyFS(),
  ]

  return candidates.find(el => el !== null) || null
}

function findContainerWithManyFS() {
  // Tìm element cha nào chứa nhiều nhất các .fs-4 hoặc .fs-6
  let best = null
  let bestCount = 0

  document.querySelectorAll('div, section, article').forEach(container => {
    const count = container.querySelectorAll('.fs-4, .fs-6').length
    // Chỉ lấy container TRỰC TIẾP chứa nhiều câu (không phải body hay html)
    if (count > bestCount && count >= 2 && container !== document.body) {
      bestCount = count
      best = container
    }
  })

  return best
}
```

---

## CẬP NHẬT `handleSaveExercise`

Thay đoạn lấy sentences trong `handleSaveExercise`:

```js
async function handleSaveExercise() {
  const btn = document.getElementById('dd-save-exercise')
  btn.textContent = '⏳ Đang tìm câu...'
  btn.disabled = true

  try {
    // BƯỚC 1: Click tab Full transcript
    await clickFullTranscriptTab()

    // BƯỚC 2: Lấy cặp EN + VI trực tiếp từ DOM
    // Không cần gọi API dịch — trang đã có sẵn VI
    const pairs = getSentencePairs()

    if (pairs.length === 0) {
      // Fallback: thử lấy từ textarea đang hiện
      const textarea = document.querySelector('TEXTAREA.form-control')
      if (textarea && textarea.value.trim()) {
        pairs.push({
          textEN: textarea.value.trim(),
          textVI: ''
        })
      }
    }

    if (pairs.length === 0) {
      btn.textContent = '❌ Không tìm được câu'
      btn.title = 'Hãy click tab "Full transcript" rồi thử lại'
      setTimeout(() => {
        btn.textContent = '💾 Lưu bài tập'
        btn.disabled = false
        btn.title = ''
      }, 3000)
      return
    }

    btn.textContent = `⏳ Đang lưu ${pairs.length} câu...`

    // BƯỚC 3: Lưu vào storage
    // Không cần translateSentence() nữa — VI đã có từ DOM
    const sentences = pairs.slice(0, 15).map(p => ({
      id: crypto.randomUUID(),
      textEN: p.textEN,
      textVI: p.textVI,
      words: [] // storage.js shuffle khi save
    }))

    const result = await window.DailyDictStorage.saveExercise({
      title: getLessonTitle(),
      sourceUrl: window.location.href,
      sentences
    })

    if (result.success) {
      btn.textContent = `✅ Đã lưu ${sentences.length} câu`
      setTimeout(() => {
        btn.textContent = '💾 Lưu bài tập'
        btn.disabled = false
      }, 3000)
    }

  } catch (err) {
    console.error('[DailyDict] Lỗi:', err)
    btn.textContent = '❌ Lỗi — thử lại'
    setTimeout(() => {
      btn.textContent = '💾 Lưu bài tập'
      btn.disabled = false
    }, 2000)
  }
}
```

---

## XÓA CODE KHÔNG CẦN NỮA

Sau khi áp dụng fix này, **xóa hoàn toàn** hàm `translateSentence()`:

```js
// XÓA TOÀN BỘ HÀM NÀY — không cần nữa vì lấy VI từ DOM
async function translateSentence(textEN) { ... }
```

Lý do: trang đã dịch sẵn, gọi thêm API vừa chậm vừa tốn rate limit.

---

## TEST NHANH TRONG CONSOLE

Trước khi Thợ update code, paste lệnh này vào Console để verify:

```js
// Test 1: Tìm container
(function() {
  let best = null, bestCount = 0
  document.querySelectorAll('div, section').forEach(c => {
    const n = c.querySelectorAll('.fs-4, .fs-6').length
    if (n > bestCount && n >= 2 && c !== document.body) {
      bestCount = n; best = c
    }
  })
  if (best) {
    console.log('✅ Container:', best.className, '— có', bestCount, 'câu')
    best.querySelectorAll('.fs-4, .fs-6').forEach((el, i) => {
      console.log(`Câu ${i+1}:`, el.textContent.trim().slice(0, 60))
    })
  } else {
    console.log('❌ Không tìm được container')
  }
})()
```

**Kết quả mong đợi:**
```
✅ Container: [tên class] — có 10 câu
Câu 1: Hi Elizabeth, please take a seat, make yourself at home.
Câu 2: I called you up here because I have some bad news.
Câu 3: I just looked at the end of the month reports...
...
```

Paste kết quả vào đây nếu vẫn không ra — tôi fix tiếp.

---

## CHECKLIST TEST SAU FIX

```
□ Click tab "Full transcript" → thấy danh sách câu EN + VI
□ Click "💾 Lưu bài tập" → hiện "⏳ Đang lưu X câu..."
□ Hiện "✅ Đã lưu X câu" (X >= 3)
□ KHÔNG hiện "❌ Không tìm được câu" nữa
□ Mở exercise.html → bài có đủ câu
□ Mỗi câu có cả textEN và textVI (VI lấy từ DOM, không gọi API)
□ Console không có error đỏ
```

---

*BUGFIX Scraper Selector v2 — Dựa trên DOM thực tế dailydictation.com*
*Selector xác nhận: DIV.fs-4, DIV.fs-6 · VI lấy từ DOM không cần API*
