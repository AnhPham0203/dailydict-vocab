# REDESIGN LAYOUT v2 — DailyDict Vocab
### Sidebar Navigation + 2-Column Dashboard (inspired by 4English.vn)

> **Thay đổi cốt lõi:** Chuyển từ top header → sidebar cố định bên trái.
> Tất cả trang webapp đều dùng chung layout mới này.
> **Design tokens:** Giữ nguyên từ REDESIGN_UIUX.md — chỉ thay layout, không đổi màu/font.
> **Files cần sửa:** `style.css` (thêm layout CSS), `index.html` (restructure hoàn toàn)
> **Files cần cập nhật:** Tất cả trang còn lại — thêm sidebar wrapper

---

## PHẦN 1 — LAYOUT SHELL (dùng chung toàn bộ webapp)

### Cấu trúc HTML mới cho MỌI trang

Tất cả trang hiện tại đang dùng cấu trúc:
```html
<header class="app-header">...</header>
<div class="container">...</div>
```

**Thay bằng cấu trúc mới:**
```html
<div class="app-shell">

  <!-- SIDEBAR — giống nhau trên mọi trang -->
  <aside class="sidebar" id="sidebar">
    <!-- Logo -->
    <div class="sidebar-logo">
      <div class="sidebar-logo__icon">◆</div>
      <span class="sidebar-logo__name">DailyDict</span>
    </div>

    <!-- Nav chính -->
    <nav class="sidebar-nav">
      <a href="index.html"        class="nav-item" data-page="home">
        <i class="sidebar-nav__icon">⌂</i>
        <span>Trang chủ</span>
      </a>
      <a href="words.html"        class="nav-item" data-page="words">
        <i class="sidebar-nav__icon">☰</i>
        <span>Từ vựng</span>
        <span class="nav-badge" id="nav-total-badge"></span>
      </a>
      <a href="review.html"       class="nav-item nav-item--primary" data-page="review">
        <i class="sidebar-nav__icon">⟳</i>
        <span>Ôn tập</span>
        <span class="nav-badge nav-badge--alert" id="nav-due-badge"></span>
      </a>
      <a href="writing.html"      class="nav-item" data-page="writing">
        <i class="sidebar-nav__icon">✎</i>
        <span>Writing</span>
      </a>
      <a href="quiz.html"         class="nav-item" data-page="quiz">
        <i class="sidebar-nav__icon">◎</i>
        <span>Quiz</span>
      </a>
      <a href="exercise.html"     class="nav-item" data-page="exercise">
        <i class="sidebar-nav__icon">⊞</i>
        <span>Bài tập</span>
      </a>
    </nav>

    <!-- Nav phụ -->
    <div class="sidebar-section-label">BỘ SƯU TẬP</div>
    <nav class="sidebar-nav">
      <a href="tags.html"         class="nav-item" data-page="tags">
        <i class="sidebar-nav__icon">⊡</i>
        <span>Tags</span>
      </a>
      <a href="achievements.html" class="nav-item" data-page="achievements">
        <i class="sidebar-nav__icon">★</i>
        <span>Thành tích</span>
        <span class="nav-dot" id="nav-badge-dot" style="display:none"></span>
      </a>
      <a href="export.html"       class="nav-item" data-page="export">
        <i class="sidebar-nav__icon">↑</i>
        <span>Export / Import</span>
      </a>
    </nav>

    <!-- Streak ở cuối sidebar -->
    <div class="sidebar-streak" id="sidebar-streak">
      <span class="sidebar-streak__fire">🔥</span>
      <div>
        <div class="sidebar-streak__num" id="sidebar-streak-num">0</div>
        <div class="sidebar-streak__label">ngày liên tiếp</div>
      </div>
    </div>
  </aside>

  <!-- MAIN CONTENT — mỗi trang khác nhau -->
  <main class="main-content">
    <!-- Nội dung từng trang nằm ở đây -->
  </main>

</div>
```

---

## PHẦN 2 — CSS LAYOUT SHELL

Thêm vào `style.css` — sau phần `:root` variables, trước các component styles:

```css
/* ══════════════════════════════════════════
   APP SHELL — Sidebar Layout
   Thay thế toàn bộ .app-header cũ
══════════════════════════════════════════ */

/* Reset: bỏ margin/padding mặc định của body */
body {
  margin: 0;
  background: var(--c-bg);
}

/* Shell: grid 2 cột */
.app-shell {
  display: grid;
  grid-template-columns: 220px 1fr;
  min-height: 100vh;
}

/* ── SIDEBAR ── */
.sidebar {
  background: var(--c-surface);
  border-right: 1px solid var(--c-border);
  position: sticky;
  top: 0;
  height: 100vh;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 0;
  /* Ẩn scrollbar nhưng vẫn scroll được */
  scrollbar-width: none;
}
.sidebar::-webkit-scrollbar { display: none; }

/* Logo */
.sidebar-logo {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 20px 20px 16px;
  border-bottom: 1px solid var(--c-border);
  margin-bottom: 8px;
  flex-shrink: 0;
}

.sidebar-logo__icon {
  font-size: 18px;
  color: var(--c-primary);
  line-height: 1;
  flex-shrink: 0;
}

.sidebar-logo__name {
  font-size: 15px;
  font-weight: 700;
  color: var(--c-text-1);
  letter-spacing: -0.01em;
}

/* Section label */
.sidebar-section-label {
  font-size: 10px;
  font-weight: 600;
  color: var(--c-text-4);
  letter-spacing: .08em;
  padding: 16px 20px 6px;
  flex-shrink: 0;
}

/* Nav group */
.sidebar-nav {
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding: 0 8px;
  flex-shrink: 0;
}

/* Nav item */
.nav-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 9px 12px;
  border-radius: var(--radius-md);
  font-size: 14px;
  font-weight: 500;
  color: var(--c-text-3);
  text-decoration: none;
  transition: all 0.15s;
  position: relative;
}

.nav-item:hover {
  background: var(--c-surface-2);
  color: var(--c-text-1);
}

/* Active state: set bằng JS hoặc class trên <body> */
.nav-item.active {
  background: var(--c-primary-light);
  color: var(--c-primary);
}

/* Primary item (Ôn tập) — luôn nổi bật hơn */
.nav-item--primary {
  color: var(--c-text-2);
}
.nav-item--primary:hover,
.nav-item--primary.active {
  background: var(--c-primary-light);
  color: var(--c-primary);
}

/* Nav icon — dùng text/emoji thay Tabler vì extension không load CDN */
.sidebar-nav__icon {
  font-size: 16px;
  width: 20px;
  text-align: center;
  flex-shrink: 0;
  font-style: normal;
}

/* Nav badges */
.nav-badge {
  margin-left: auto;
  background: var(--c-primary-light);
  color: var(--c-primary);
  font-size: 11px;
  font-weight: 600;
  padding: 1px 7px;
  border-radius: 99px;
  line-height: 1.6;
}

.nav-badge--alert {
  background: var(--c-danger-bg);
  color: var(--c-danger);
}

/* Notification dot (achievements) */
.nav-dot {
  position: absolute;
  right: 12px;
  top: 50%;
  transform: translateY(-50%);
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: var(--c-danger);
  border: 1.5px solid var(--c-surface);
}

/* Streak widget ở cuối sidebar */
.sidebar-streak {
  margin-top: auto;
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 16px 20px;
  border-top: 1px solid var(--c-border);
  flex-shrink: 0;
}

.sidebar-streak__fire { font-size: 24px; line-height: 1; }

.sidebar-streak__num {
  font-size: 22px;
  font-weight: 700;
  color: var(--c-streak);
  letter-spacing: -0.02em;
  line-height: 1;
}

.sidebar-streak__label {
  font-size: 11px;
  color: var(--c-text-4);
  margin-top: 1px;
}

/* ── MAIN CONTENT ── */
.main-content {
  min-width: 0; /* Prevent grid blowout */
  padding: 24px 28px;
  max-width: 900px;
}

/* ── RESPONSIVE: Mobile ── */
@media (max-width: 768px) {
  .app-shell {
    grid-template-columns: 1fr;
  }

  .sidebar {
    position: fixed;
    left: -220px;
    top: 0;
    height: 100vh;
    z-index: 200;
    transition: left 0.25s ease;
    box-shadow: 4px 0 20px rgba(0,0,0,0.08);
  }

  .sidebar.open { left: 0; }

  .main-content {
    padding: 16px;
  }

  /* Mobile top bar */
  .mobile-topbar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 14px 16px;
    background: var(--c-surface);
    border-bottom: 1px solid var(--c-border);
    position: sticky;
    top: 0;
    z-index: 100;
  }

  .mobile-menu-btn {
    background: none;
    border: none;
    font-size: 22px;
    cursor: pointer;
    color: var(--c-text-1);
    padding: 4px;
  }

  .sidebar-overlay {
    display: none;
    position: fixed;
    inset: 0;
    background: rgba(0,0,0,0.3);
    z-index: 199;
  }

  .sidebar.open ~ .sidebar-overlay { display: block; }
}

@media (min-width: 769px) {
  .mobile-topbar { display: none; }
}
```

---

## PHẦN 3 — JS SIDEBAR SHARED (`webapp/sidebar.js` — file mới)

Tạo file `webapp/sidebar.js` — load trên mọi trang để:
1. Set active state đúng theo URL
2. Load stats vào sidebar (streak, due count)
3. Mobile toggle

```js
// sidebar.js — load trên mọi trang webapp
(async function initSidebar() {

  // ── 1. Active state theo URL hiện tại ──
  const page = window.location.pathname.split('/').pop() || 'index.html'
  document.querySelectorAll('.nav-item').forEach(item => {
    const href = item.getAttribute('href')
    if (href && page.includes(href.replace('.html', ''))) {
      item.classList.add('active')
    }
  })
  // Trang chủ: chỉ active khi đúng index.html
  if (page === 'index.html' || page === '') {
    document.querySelector('[data-page="home"]')?.classList.add('active')
  }

  // ── 2. Load stats vào sidebar ──
  try {
    const stats = await window.DailyDictStorage.getStats()

    // Streak
    const streakEl = document.getElementById('sidebar-streak-num')
    if (streakEl) streakEl.textContent = stats.streak || 0

    // Badge tổng từ
    const totalBadge = document.getElementById('nav-total-badge')
    if (totalBadge && stats.total > 0) {
      totalBadge.textContent = stats.total
      totalBadge.style.display = 'block'
    }

    // Badge cần ôn (alert đỏ)
    const dueBadge = document.getElementById('nav-due-badge')
    if (dueBadge && stats.dueCount > 0) {
      dueBadge.textContent = stats.dueCount
      dueBadge.style.display = 'block'
    }

    // Dot thành tích chưa xem
    const unseen = await window.DailyDictStorage.getUnseenBadges()
    const dot = document.getElementById('nav-badge-dot')
    if (dot && unseen.length > 0) {
      dot.style.display = 'block'
    }
  } catch (e) {
    // Storage chưa sẵn sàng — bỏ qua
  }

  // ── 3. Mobile toggle ──
  const sidebar   = document.getElementById('sidebar')
  const menuBtn   = document.getElementById('mobile-menu-btn')
  const overlay   = document.getElementById('sidebar-overlay')

  menuBtn?.addEventListener('click', () => {
    sidebar?.classList.toggle('open')
  })

  overlay?.addEventListener('click', () => {
    sidebar?.classList.remove('open')
  })

})()
```

---

## PHẦN 4 — INDEX.HTML MỚI (Dashboard)

Thay toàn bộ `webapp/index.html` bằng cấu trúc sau:

```html
<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width">
  <title>DailyDict Vocab</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700&display=swap" rel="stylesheet">
  <link rel="stylesheet" href="style.css">
</head>
<body>

<div class="app-shell">

  <!-- SIDEBAR -->
  <aside class="sidebar" id="sidebar">
    <div class="sidebar-logo">
      <span class="sidebar-logo__icon">◆</span>
      <span class="sidebar-logo__name">DailyDict</span>
    </div>

    <nav class="sidebar-nav">
      <a href="index.html"        class="nav-item" data-page="home"><i class="sidebar-nav__icon">⌂</i><span>Trang chủ</span></a>
      <a href="words.html"        class="nav-item" data-page="words"><i class="sidebar-nav__icon">☰</i><span>Từ vựng</span><span class="nav-badge" id="nav-total-badge" style="display:none"></span></a>
      <a href="review.html"       class="nav-item nav-item--primary" data-page="review"><i class="sidebar-nav__icon">⟳</i><span>Ôn tập</span><span class="nav-badge nav-badge--alert" id="nav-due-badge" style="display:none"></span></a>
      <a href="writing.html"      class="nav-item" data-page="writing"><i class="sidebar-nav__icon">✎</i><span>Writing</span></a>
      <a href="quiz.html"         class="nav-item" data-page="quiz"><i class="sidebar-nav__icon">◎</i><span>Quiz</span></a>
      <a href="exercise.html"     class="nav-item" data-page="exercise"><i class="sidebar-nav__icon">⊞</i><span>Bài tập</span></a>
    </nav>

    <div class="sidebar-section-label">BỘ SƯU TẬP</div>
    <nav class="sidebar-nav">
      <a href="tags.html"         class="nav-item" data-page="tags"><i class="sidebar-nav__icon">⊡</i><span>Tags</span></a>
      <a href="achievements.html" class="nav-item" data-page="achievements"><i class="sidebar-nav__icon">★</i><span>Thành tích</span><span class="nav-dot" id="nav-badge-dot" style="display:none"></span></a>
      <a href="export.html"       class="nav-item" data-page="export"><i class="sidebar-nav__icon">↑</i><span>Export / Import</span></a>
    </nav>

    <div class="sidebar-streak">
      <span class="sidebar-streak__fire">🔥</span>
      <div>
        <div class="sidebar-streak__num" id="sidebar-streak-num">0</div>
        <div class="sidebar-streak__label">ngày liên tiếp</div>
      </div>
    </div>
  </aside>

  <!-- MOBILE TOPBAR -->
  <div class="mobile-topbar">
    <button class="mobile-menu-btn" id="mobile-menu-btn">☰</button>
    <span style="font-size:15px;font-weight:700;color:var(--c-text-1);">DailyDict</span>
    <span></span>
  </div>
  <div class="sidebar-overlay" id="sidebar-overlay"></div>

  <!-- MAIN -->
  <main class="main-content">

    <!-- SEARCH BAR -->
    <div class="search-bar">
      <span class="search-bar__icon">⌕</span>
      <input type="text" class="search-bar__input"
             placeholder="Tìm kiếm từ vựng..."
             id="search-input"
             autocomplete="off">
    </div>

    <!-- STATS ROW: 4 ô -->
    <div class="dash-stats">
      <div class="dash-stat">
        <div class="dash-stat__num accent" id="stat-total">0</div>
        <div class="dash-stat__label">Tổng từ vựng</div>
      </div>
      <div class="dash-stat">
        <div class="dash-stat__num streak" id="stat-streak">0</div>
        <div class="dash-stat__label">Ngày liên tiếp</div>
      </div>
      <div class="dash-stat">
        <div class="dash-stat__num success" id="stat-retention">0%</div>
        <div class="dash-stat__label">Tỷ lệ nhớ</div>
      </div>
      <div class="dash-stat">
        <div class="dash-stat__num warning" id="stat-due">0</div>
        <div class="dash-stat__label">Cần ôn tập</div>
      </div>
    </div>

    <!-- GRID 2 CỘT -->
    <div class="dash-grid">

      <!-- CỘT TRÁI -->
      <div class="dash-col-left">

        <!-- Goal Ring + Progress -->
        <div class="dash-card" id="goal-section">
          <div class="dash-card__header">
            <span class="dash-card__title">Mục tiêu hôm nay</span>
            <button class="goal-edit-btn" id="btn-edit-goal">Chỉnh sửa</button>
          </div>
          <div class="goal-row">
            <svg class="goal-ring" viewBox="0 0 80 80" width="72" height="72">
              <circle class="ring-track" cx="40" cy="40" r="32" fill="none" stroke-width="6"/>
              <circle class="ring-progress" cx="40" cy="40" r="32" fill="none" stroke-width="6"
                      stroke-linecap="round" transform="rotate(-90 40 40)" id="ring-progress"/>
              <text x="40" y="36" text-anchor="middle" class="ring-num" id="ring-num">0</text>
              <text x="40" y="50" text-anchor="middle" class="ring-label" id="ring-label">/ 10</text>
            </svg>
            <div class="goal-text">
              <div class="goal-text__today" id="goal-today-text">Hôm nay chưa lưu từ nào</div>
              <div class="goal-text__sub" id="goal-sub-text">Bôi đen từ bất kỳ trên DailyDictation</div>
            </div>
          </div>
          <!-- Goal setter inline -->
          <div id="goal-setter" style="display:none">
            <!-- giữ nguyên từ bản cũ -->
          </div>
        </div>

        <!-- Bar Chart -->
        <div class="dash-card">
          <div class="dash-card__header">
            <span class="dash-card__title">Từ vựng 7 ngày qua</span>
            <span class="dash-card__meta" id="chart-total-label"></span>
          </div>
          <div class="chart-bars" id="chart-bars"></div>
        </div>

        <!-- CTA Buttons -->
        <div class="dash-cta-grid">
          <button class="dash-cta dash-cta--primary" id="btn-review">
            <span class="dash-cta__icon">⟳</span>
            <div>
              <div class="dash-cta__label">Bắt đầu ôn tập</div>
              <div class="dash-cta__sub" id="cta-due-sub">0 từ đến hạn</div>
            </div>
          </button>
          <a href="writing.html" class="dash-cta">
            <span class="dash-cta__icon">✎</span>
            <div>
              <div class="dash-cta__label">Writing</div>
              <div class="dash-cta__sub">Luyện gõ từ</div>
            </div>
          </a>
          <a href="quiz.html" class="dash-cta">
            <span class="dash-cta__icon">◎</span>
            <div>
              <div class="dash-cta__label">Quiz</div>
              <div class="dash-cta__sub">Trắc nghiệm</div>
            </div>
          </a>
          <a href="exercise.html" class="dash-cta">
            <span class="dash-cta__icon">⊞</span>
            <div>
              <div class="dash-cta__label">Bài tập</div>
              <div class="dash-cta__sub">Word scramble</div>
            </div>
          </a>
        </div>

      </div>

      <!-- CỘT PHẢI -->
      <div class="dash-col-right">

        <!-- Word of Day -->
        <div class="dash-card word-of-day" id="word-of-day-card">
          <div class="dash-card__header">
            <span class="dash-card__title">Từ cần ôn tiếp theo</span>
          </div>
          <div class="wod-word" id="wod-word">—</div>
          <div class="wod-phonetic" id="wod-phonetic"></div>
          <div class="wod-vi" id="wod-vi"></div>
          <div class="wod-en" id="wod-en"></div>
          <div class="wod-example" id="wod-example"></div>
          <div class="wod-footer">
            <span class="wod-source" id="wod-source"></span>
            <a href="review.html" class="btn-primary-sm">Ôn tập →</a>
          </div>
        </div>

        <!-- Due List -->
        <div class="dash-card">
          <div class="dash-card__header">
            <span class="dash-card__title">Cần ôn hôm nay</span>
            <a href="words.html?rating=again" class="dash-card__link">Xem tất cả</a>
          </div>
          <div id="due-list" class="due-list"></div>
          <div id="due-empty" class="due-empty" style="display:none">
            <span>🎉</span> Không có từ nào cần ôn hôm nay!
          </div>
        </div>

        <!-- Heatmap -->
        <div class="dash-card">
          <div class="dash-card__header">
            <span class="dash-card__title">Lịch học tập</span>
            <span class="dash-card__meta" id="heatmap-total"></span>
          </div>
          <div class="heatmap-wrap" id="heatmap-wrap"></div>
          <div class="heatmap-legend">
            <span class="legend-label">Ít</span>
            <div class="legend-cells">
              <div class="legend-cell" style="background:var(--hm-0)"></div>
              <div class="legend-cell" style="background:var(--hm-1)"></div>
              <div class="legend-cell" style="background:var(--hm-2)"></div>
              <div class="legend-cell" style="background:var(--hm-3)"></div>
              <div class="legend-cell" style="background:var(--hm-4)"></div>
            </div>
            <span class="legend-label">Nhiều</span>
          </div>
        </div>

      </div>
    </div>

  </main>
</div>

<script src="../extension/shared/storage.js"></script>
<script src="../extension/shared/badges.js"></script>
<script src="sidebar.js"></script>
<script src="app.js"></script>
</body>
</html>
```

---

## PHẦN 5 — CSS DASHBOARD (thêm vào style.css)

```css
/* ══════════════════════════════════════════
   SEARCH BAR
══════════════════════════════════════════ */
.search-bar {
  display: flex;
  align-items: center;
  gap: 10px;
  background: var(--c-surface);
  border: 1px solid var(--c-border);
  border-radius: var(--radius-xl);
  padding: 10px 16px;
  margin-bottom: var(--space-5);
  transition: border-color 0.15s;
}
.search-bar:focus-within { border-color: var(--c-primary); }

.search-bar__icon { font-size: 18px; color: var(--c-text-4); flex-shrink: 0; }

.search-bar__input {
  flex: 1;
  border: none;
  background: none;
  font-size: 14px;
  font-family: var(--font-main);
  color: var(--c-text-1);
  outline: none;
}
.search-bar__input::placeholder { color: var(--c-text-4); }

/* ══════════════════════════════════════════
   STATS ROW
══════════════════════════════════════════ */
.dash-stats {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: var(--space-3);
  margin-bottom: var(--space-5);
}

@media (max-width: 600px) {
  .dash-stats { grid-template-columns: repeat(2, 1fr); }
}

.dash-stat {
  background: var(--c-surface);
  border: 1px solid var(--c-border);
  border-radius: var(--radius-lg);
  padding: var(--space-4) var(--space-5);
  transition: border-color 0.15s;
}
.dash-stat:hover { border-color: var(--c-border-strong); }

.dash-stat__num {
  font-size: 26px;
  font-weight: 700;
  letter-spacing: -0.03em;
  line-height: 1;
  margin-bottom: 4px;
}
.dash-stat__num.accent  { color: var(--c-primary); }
.dash-stat__num.streak  { color: var(--c-streak); }
.dash-stat__num.success { color: var(--c-success); }
.dash-stat__num.warning { color: var(--c-warning); }

.dash-stat__label {
  font-size: 12px;
  color: var(--c-text-4);
  font-weight: 500;
}

/* ══════════════════════════════════════════
   DASHBOARD 2-COLUMN GRID
══════════════════════════════════════════ */
.dash-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: var(--space-5);
  align-items: start;
}

@media (max-width: 900px) {
  .dash-grid { grid-template-columns: 1fr; }
}

.dash-col-left,
.dash-col-right {
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
}

/* ── CARD chung ── */
.dash-card {
  background: var(--c-surface);
  border: 1px solid var(--c-border);
  border-radius: var(--radius-xl);
  padding: var(--space-5) var(--space-5);
}

.dash-card__header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: var(--space-4);
}

.dash-card__title {
  font-size: 14px;
  font-weight: 600;
  color: var(--c-text-1);
  padding-left: var(--space-3);
  border-left: 3px solid var(--c-primary);
}

.dash-card__meta {
  font-size: 12px;
  color: var(--c-text-4);
}

.dash-card__link {
  font-size: 12px;
  color: var(--c-primary);
  text-decoration: none;
  font-weight: 500;
}
.dash-card__link:hover { text-decoration: underline; }

/* ── Goal Row ── */
.goal-row {
  display: flex;
  align-items: center;
  gap: var(--space-4);
}

.goal-text__today {
  font-size: 14px;
  font-weight: 600;
  color: var(--c-text-1);
  margin-bottom: 4px;
}

.goal-text__sub {
  font-size: 12px;
  color: var(--c-text-4);
  line-height: 1.5;
}

/* ── CTA grid ── */
.dash-cta-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: var(--space-3);
}

.dash-cta {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  padding: var(--space-3) var(--space-4);
  background: var(--c-surface);
  border: 1px solid var(--c-border);
  border-radius: var(--radius-lg);
  cursor: pointer;
  text-decoration: none;
  transition: all 0.15s;
  font-family: var(--font-main);
}

.dash-cta:hover {
  border-color: var(--c-primary);
  background: var(--c-primary-light);
}

.dash-cta--primary {
  background: var(--c-primary);
  border-color: var(--c-primary);
  box-shadow: 0 4px 14px rgba(79,70,229,.25);
  grid-column: 1 / -1; /* Full width */
}

.dash-cta--primary:hover {
  background: #4338CA;
  border-color: #4338CA;
}

.dash-cta--primary .dash-cta__label { color: white; }
.dash-cta--primary .dash-cta__sub   { color: rgba(255,255,255,.7); }
.dash-cta--primary .dash-cta__icon  { color: white; font-size: 20px; }

.dash-cta__icon {
  font-size: 18px;
  color: var(--c-text-3);
  flex-shrink: 0;
  width: 24px;
  text-align: center;
}

.dash-cta__label {
  font-size: 13px;
  font-weight: 600;
  color: var(--c-text-1);
}

.dash-cta__sub {
  font-size: 11px;
  color: var(--c-text-4);
  margin-top: 1px;
}

/* ── Word of Day ── */
.wod-word {
  font-size: 28px;
  font-weight: 700;
  color: var(--c-text-1);
  letter-spacing: -0.03em;
  margin-bottom: var(--space-2);
}

.wod-phonetic {
  font-size: 13px;
  color: var(--c-text-4);
  font-style: italic;
  margin-bottom: var(--space-3);
}

.wod-vi {
  font-size: 15px;
  font-weight: 600;
  color: var(--c-primary);
  margin-bottom: 4px;
}

.wod-en {
  font-size: 13px;
  color: var(--c-text-3);
  line-height: 1.5;
  margin-bottom: var(--space-3);
}

.wod-example {
  font-size: 12px;
  color: var(--c-text-4);
  font-style: italic;
  padding: var(--space-3);
  background: var(--c-surface-2);
  border-radius: var(--radius-md);
  line-height: 1.5;
  margin-bottom: var(--space-4);
}

.wod-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding-top: var(--space-3);
  border-top: 1px solid var(--c-border);
}

.wod-source {
  font-size: 11px;
  color: var(--c-text-4);
  max-width: 60%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

/* ── Due List ── */
.due-list { display: flex; flex-direction: column; gap: 0; }

.due-row {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  padding: var(--space-3) 0;
  border-bottom: 1px solid var(--c-border);
}
.due-row:last-child { border-bottom: none; }

.due-row__word {
  font-size: 14px;
  font-weight: 600;
  color: var(--c-text-1);
  flex: 1;
  letter-spacing: -0.01em;
}

.due-row__vi {
  font-size: 12px;
  color: var(--c-text-3);
  flex: 1.2;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.due-empty {
  text-align: center;
  padding: var(--space-6);
  color: var(--c-text-4);
  font-size: 14px;
}
```

---

## PHẦN 6 — CẬP NHẬT CÁC TRANG KHÁC

Tất cả trang còn lại (`review.html`, `words.html`, `quiz.html`, `writing.html`, `exercise.html`, `achievements.html`, `export.html`, `tags.html`, `word.html`) cần được cập nhật để dùng layout mới.

**Pattern áp dụng cho mỗi trang:**

```html
<!-- TRƯỚC (cấu trúc cũ): -->
<header class="app-header">
  <div class="header-inner">
    <a href="index.html" class="back-btn">← Dashboard</a>
    <h1>Tên trang</h1>
    <span id="header-meta"></span>
  </div>
</header>
<div class="container">
  ... nội dung ...
</div>

<!-- SAU (cấu trúc mới): -->
<div class="app-shell">
  <!-- SIDEBAR (copy y hệt từ index.html) -->
  <aside class="sidebar" id="sidebar">
    ... giống index.html ...
  </aside>

  <div class="mobile-topbar">
    <button class="mobile-menu-btn" id="mobile-menu-btn">☰</button>
    <span style="font-size:15px;font-weight:700">Tên trang</span>
    <span></span>
  </div>
  <div class="sidebar-overlay" id="sidebar-overlay"></div>

  <main class="main-content">
    <!-- Page header inline thay vì header cũ -->
    <div class="page-header">
      <h1 class="page-title">Tên trang</h1>
      <span class="page-meta" id="page-meta"></span>
    </div>

    ... nội dung cũ giữ nguyên ...
  </main>
</div>

<script src="../extension/shared/storage.js"></script>
<script src="sidebar.js"></script>  <!-- THÊM DÒNG NÀY -->
<script src="[page-specific].js"></script>
```

**CSS thêm vào style.css cho page header:**

```css
.page-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: var(--space-6);
  padding-bottom: var(--space-4);
  border-bottom: 1px solid var(--c-border);
}

.page-title {
  font-size: 22px;
  font-weight: 700;
  color: var(--c-text-1);
  letter-spacing: -0.02em;
}

.page-meta {
  font-size: 13px;
  color: var(--c-text-4);
}
```

---

## PHẦN 7 — CẬP NHẬT app.js

Trong `app.js`, hàm `initDashboard()` cần cập nhật để render vào các ID mới:

```js
// THAY CÁC ID CŨ → ID MỚI:
// stat-streak    → stat-streak     (giữ nguyên)
// stat-total     → stat-total      (giữ nguyên)
// stat-retention → stat-retention  (giữ nguyên)
// stat-due       → stat-due        (giữ nguyên)

// THÊM: render Word of Day (từ cần ôn tiếp theo)
async function renderWordOfDay(dueWords) {
  if (!dueWords || dueWords.length === 0) {
    document.getElementById('word-of-day-card').style.display = 'none'
    return
  }

  // Lấy từ khó nhất (lastRating === 'again' → first, hoặc từ đầu danh sách)
  const word = dueWords.find(w => w.lastRating === 'again') || dueWords[0]

  document.getElementById('wod-word').textContent     = word.word
  document.getElementById('wod-phonetic').textContent = word.phonetic || ''
  document.getElementById('wod-vi').textContent       = word.definitionVi || ''
  document.getElementById('wod-en').textContent       = word.definitionEn || ''
  document.getElementById('wod-example').textContent  = word.example ? `"${word.example}"` : ''
  document.getElementById('wod-source').textContent   = word.sourceLesson ? `📌 ${word.sourceLesson}` : ''
}

// Gọi trong initDashboard():
// renderWordOfDay(dueToday)
```

**Xóa khỏi app.js:**
- `renderGoalRing()` vẫn giữ nguyên — ID không đổi
- `renderHeatmap()` vẫn giữ nguyên
- `checkStreakWarning()` vẫn giữ nguyên
- `checkMilestoneOnLoad()` vẫn giữ nguyên

**Search bar — thêm vào app.js:**

```js
// Search real-time từ dashboard → navigate sang words.html với filter
document.getElementById('search-input')?.addEventListener('input', debounce(async (e) => {
  const q = e.target.value.trim()
  if (q.length < 2) return
  window.location.href = `words.html?search=${encodeURIComponent(q)}`
}, 600))
```

---

## CHECKLIST THI CÔNG

**Bước 1 — CSS Foundation:**
- [ ] Thêm `.app-shell`, `.sidebar`, `.main-content` CSS vào `style.css`
- [ ] Xóa `.app-header`, `.header-inner`, `.back-btn` CSS cũ
- [ ] Thêm Dashboard CSS mới (search bar, stats, grid, cards)

**Bước 2 — Sidebar file:**
- [ ] Tạo `webapp/sidebar.js` mới
- [ ] Test: active state đúng trên từng trang

**Bước 3 — index.html:**
- [ ] Thay toàn bộ theo cấu trúc mới
- [ ] Test: stats render đúng, chart đúng, heatmap đúng

**Bước 4 — Từng trang còn lại (theo thứ tự):**
- [ ] `review.html` + `review-app.js`
- [ ] `words.html` + `words-app.js`
- [ ] `quiz.html` + `quiz.js`
- [ ] `writing.html` + `writing.js`
- [ ] `exercise.html` + `exercise.js`
- [ ] `achievements.html` + `achievements.js`
- [ ] `export.html` + `export.js`
- [ ] `tags.html` + `tags.js`
- [ ] `word.html` + `word.js`

**Bước 5 — Test tổng:**
- [ ] Sidebar hiện trên mọi trang
- [ ] Active state đúng theo URL
- [ ] Badge streak hiện đúng số
- [ ] Badge due count hiện đúng màu đỏ
- [ ] Mobile 375px: sidebar ẩn, có hamburger menu
- [ ] Click hamburger → sidebar mở overlay
- [ ] Click overlay → sidebar đóng
- [ ] Không có console error

---

*REDESIGN LAYOUT v2 — DailyDict Vocab*
*Sidebar Navigation + 2-Column Dashboard · Inspired by 4English.vn*
*Tổng hợp bởi Ông Thầu Vibecode*
