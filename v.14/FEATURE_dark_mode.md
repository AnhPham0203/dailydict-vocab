# FEATURE — Dark / Light Mode Toggle

> **Cách hoạt động:** Thêm attribute `data-theme="dark"` vào `<html>` tag.
> CSS override toàn bộ variables khi attribute này có mặt.
> Lưu preference vào `localStorage` — không cần storage.js.
> **Files cần sửa:** `style.css`, `sidebar.js`, `webapp/index.html` (thêm nút toggle)
> **Không cần sửa** bất kỳ file JS logic nào khác.

---

## BƯỚC 1 — `style.css`: Thêm dark mode variables

Tìm dòng `:root {` hiện tại trong `style.css`.
Thêm block sau **ngay bên dưới** closing `}` của `:root`:

```css
/* ══════════════════════════════════════════
   DARK MODE — override toàn bộ color tokens
   Trigger: <html data-theme="dark">
══════════════════════════════════════════ */
[data-theme="dark"] {
  /* PRIMARY — giữ indigo nhưng sáng hơn để readable trên nền tối */
  --c-primary:       #818CF8;   /* Indigo 400 — sáng hơn bản light */
  --c-primary-light: #1E1B4B;   /* Indigo 950 — nền nhấn tối */
  --c-primary-dim:   #6366F1;   /* Indigo 500 */

  /* NEUTRALS — đảo ngược hoàn toàn */
  --c-bg:            #0C0A09;   /* Stone 950 — nền tối nhất */
  --c-surface:       #1C1917;   /* Stone 900 — card surface */
  --c-surface-2:     #292524;   /* Stone 800 — nested surface */
  --c-border:        #44403C;   /* Stone 700 — border */
  --c-border-strong: #57534E;   /* Stone 600 — border hover */

  /* TEXT — đảo ngược */
  --c-text-1: #FAFAF9;          /* Trắng ấm — headings */
  --c-text-2: #D6D3D1;          /* Stone 300 — body */
  --c-text-3: #A8A29E;          /* Stone 400 — muted */
  --c-text-4: #78716C;          /* Stone 500 — placeholder */

  /* SEMANTIC — giữ màu nhưng bg tối hơn */
  --c-success:       #4ADE80;   /* Green 400 — sáng hơn để readable */
  --c-success-bg:    #052E16;   /* Green 950 */
  --c-warning:       #FCD34D;   /* Amber 300 */
  --c-warning-bg:    #1C1101;   /* Amber 950 */
  --c-danger:        #F87171;   /* Red 400 */
  --c-danger-bg:     #1C0202;   /* Red 950 */

  /* ACCENT */
  --c-streak:        #FB923C;   /* Orange 400 */
  --c-streak-bg:     #1C0A01;   /* Orange 950 */
  --c-gold:          #FDE047;   /* Yellow 300 */
  --c-gold-bg:       #1C1200;   /* Yellow 950 */

  /* HEATMAP — tối hơn */
  --hm-0: #1C1917;
  --hm-1: #1E1B4B;
  --hm-2: #3730A3;
  --hm-3: #4F46E5;
  --hm-4: #818CF8;
}

/* Transition mượt khi switch theme */
*, *::before, *::after {
  transition: background-color 0.2s ease, border-color 0.2s ease, color 0.15s ease;
}

/* Loại trừ các element không cần transition */
button, a, input, .word-chip, .rating-btn, .answer-chip {
  transition: background-color 0.15s, border-color 0.15s, color 0.15s, transform 0.1s;
}
```

---

## BƯỚC 2 — `sidebar.js`: Thêm theme toggle logic

Tìm dòng `})()` cuối cùng trong `sidebar.js` (closing của IIFE).
Thêm toàn bộ đoạn sau **trước** dòng `})()`:

```js
  // ── DARK / LIGHT MODE ──

  const THEME_KEY = 'dd_theme'

  // Áp dụng theme đã lưu ngay khi load (trước khi render)
  // Gọi trước DOMContentLoaded để tránh flash
  function applyTheme(theme) {
    if (theme === 'dark') {
      document.documentElement.setAttribute('data-theme', 'dark')
    } else {
      document.documentElement.removeAttribute('data-theme')
    }
  }

  // Load theme từ localStorage — chạy ngay
  const savedTheme = localStorage.getItem(THEME_KEY) ||
    (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')
  applyTheme(savedTheme)

  // Toggle khi click nút
  function toggleTheme() {
    const current = document.documentElement.getAttribute('data-theme')
    const next    = current === 'dark' ? 'light' : 'dark'
    applyTheme(next)
    localStorage.setItem(THEME_KEY, next)
    updateToggleBtn(next)
  }

  // Cập nhật icon + label của nút
  function updateToggleBtn(theme) {
    const btn   = document.getElementById('theme-toggle')
    const icon  = document.getElementById('theme-icon')
    const label = document.getElementById('theme-label')
    if (!btn) return

    if (theme === 'dark') {
      if (icon)  icon.textContent  = '☀'
      if (label) label.textContent = 'Light mode'
    } else {
      if (icon)  icon.textContent  = '☽'
      if (label) label.textContent = 'Dark mode'
    }
  }

  // Bind event sau khi DOM sẵn sàng
  document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('theme-toggle')
      ?.addEventListener('click', toggleTheme)
    // Sync icon với theme hiện tại
    updateToggleBtn(savedTheme)
  })

  // Lắng nghe thay đổi system theme
  window.matchMedia('(prefers-color-scheme: dark)')
    .addEventListener('change', (e) => {
      // Chỉ auto-switch nếu user chưa set preference
      if (!localStorage.getItem(THEME_KEY)) {
        const systemTheme = e.matches ? 'dark' : 'light'
        applyTheme(systemTheme)
        updateToggleBtn(systemTheme)
      }
    })
```

---

## BƯỚC 3 — Thêm nút toggle vào Sidebar

Trong **mọi trang** có sidebar, tìm phần `sidebar-streak` ở cuối sidebar:

```html
<!-- TÌM đoạn này: -->
<div class="sidebar-streak">
  ...
</div>

<!-- THÊM NGAY TRƯỚC sidebar-streak: -->
<button class="theme-toggle-btn" id="theme-toggle">
  <span id="theme-icon">☽</span>
  <span id="theme-label">Dark mode</span>
</button>
```

**CSS cho nút toggle** — thêm vào `style.css`:

```css
/* ── Theme Toggle Button ── */
.theme-toggle-btn {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 20px;
  background: none;
  border: none;
  border-top: 1px solid var(--c-border);
  cursor: pointer;
  font-size: 13px;
  font-weight: 500;
  color: var(--c-text-3);
  font-family: var(--font-main);
  width: 100%;
  text-align: left;
  transition: background 0.15s, color 0.15s;
  flex-shrink: 0;
}

.theme-toggle-btn:hover {
  background: var(--c-surface-2);
  color: var(--c-text-1);
}

#theme-icon {
  font-size: 16px;
  width: 20px;
  text-align: center;
}
```

---

## BƯỚC 4 — Thêm 1 dòng vào `<head>` của mọi trang

Để tránh **flash trắng** khi load trang (FOUC — Flash Of Unstyled Content),
thêm inline script này vào `<head>` **trước** `<link rel="stylesheet">`:

```html
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width">

  <!-- THÊM ĐOẠN NÀY TRƯỚC MỌI THỨ KHÁC -->
  <script>
    (function() {
      var t = localStorage.getItem('dd_theme') ||
        (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
      if (t === 'dark') document.documentElement.setAttribute('data-theme', 'dark');
    })();
  </script>

  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link href="..." rel="stylesheet">
  <link rel="stylesheet" href="style.css">
</head>
```

> Đây là inline script duy nhất được phép — nó chạy đồng bộ trước khi CSS load,
> ngăn màn hình bị trắng rồi tối trong tích tắc.

---

## CHECKLIST TEST

```
□ Mở app → theme khớp với system preference (dark/light)
□ Click nút "☽ Dark mode" → toàn bộ màu chuyển sang tối
□ Icon đổi thành "☀ Light mode"
□ Click lại → chuyển về light
□ Reload trang → giữ nguyên theme đã chọn (không flash)
□ Mở trang khác (words.html, review.html...) → theme vẫn đúng
□ Flashcard: chữ readable trên nền tối
□ Rating buttons (đỏ/vàng/xanh/tím): màu đúng trên nền tối
□ Word chips trong exercise: border visible trên nền tối
□ Heatmap cells: phân biệt được 5 mức độ
□ Chart bars: màu indigo visible trên nền tối
□ Đổi system theme (macOS System Preferences) khi chưa set → app tự đổi
□ Đổi system theme sau khi đã set manual → app KHÔNG tự đổi
```

---

## LƯU Ý: Extension Popup

Extension popup (`popup.html`) chạy trong Chrome popup window riêng biệt,
không dùng `sidebar.js`. Cần xử lý riêng:

Thêm vào `popup.js`:
```js
// Sync theme với webapp
const theme = localStorage.getItem('dd_theme') ||
  (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')
if (theme === 'dark') document.documentElement.setAttribute('data-theme', 'dark')
```

Nhưng popup dùng localStorage của **extension context** khác với webapp.
Giải pháp đơn giản: lưu theme vào `chrome.storage.local` thay vì `localStorage`:

```js
// Thay localStorage.getItem('dd_theme') bằng:
const result = await chrome.storage.local.get('dd_theme')
const theme  = result.dd_theme || 'light'

// Thay localStorage.setItem('dd_theme', next) bằng:
await chrome.storage.local.set({ dd_theme: next })
```

Cập nhật đồng thời trong cả `sidebar.js` và `popup.js`.

---

*FEATURE Dark Mode — DailyDict Vocab*
*Tổng hợp bởi Ông Thầu Vibecode*
