// --- SHARED UTILS ---
function showGlobalError(message = 'Đã xảy ra lỗi. Vui lòng thử tải lại trang.') {
  const container = document.querySelector('.container')
  if (!container) return
  container.innerHTML = `
    <div class="empty-state" style="padding: 80px 20px;">
      <div class="empty-state__circle" style="background: var(--c-danger-bg);">
        <span class="empty-state__icon">⚠️</span>
      </div>
      <h3 class="empty-state__title">Có lỗi xảy ra</h3>
      <p class="empty-state__desc">${message}</p>
      <button onclick="location.reload()" class="empty-state__cta" style="border: none; background: var(--c-primary); color: white; cursor: pointer; padding: 10px 20px; border-radius: 8px; margin-top: 20px; font-weight: 600;">
        Tải lại trang
      </button>
    </div>`
}

function debounce(fn, ms) { let timeout; return function() { clearTimeout(timeout); timeout = setTimeout(() => fn.apply(this, arguments), ms) } }
function getPillClass(r) { return !r ? 'status-pill status-pill--new' : r === 'again' ? 'status-pill status-pill--again' : r === 'hard' ? 'status-pill status-pill--hard' : r === 'easy' ? 'status-pill status-pill--easy' : 'status-pill status-pill--review' }
function getPillLabel(r) { return !r ? 'Mới' : r === 'again' ? 'Quên' : r === 'hard' ? 'Khó' : 'Ôn tập' }

// --- DASHBOARD LOGIC ---
async function initDashboard() {
  if (!window.location.pathname.includes('index.html')) return
  try {
    const stats = await window.DailyDictStorage.getStats(), words = await window.DailyDictStorage.getWords(), dueToday = await window.DailyDictStorage.getWordsDueToday()
    document.getElementById('stat-streak').textContent = stats.streak
    document.getElementById('stat-total').textContent = stats.total
    document.getElementById('stat-retention').textContent = stats.retentionRate
    document.getElementById('stat-due').textContent = stats.dueCount
    
    // BUG-08: Longest Streak
    const longestStreak = await window.DailyDictStorage.getLongestStreak()
    const longestStreakEl = document.getElementById('stat-longest-streak')
    if (longestStreakEl) longestStreakEl.textContent = longestStreak

    renderChart(words); renderDueList(dueToday); renderGoalRing(); renderHeatmap(); checkStreakWarning(); checkNewBadges(); initGoalSetter()

    // BUG-09: Milestone Toast
    const settings = await window.DailyDictStorage.getSettings()
    const milestones = [7, 14, 30, 60, 100, 200, 365]
    if (milestones.includes(stats.streak) && stats.streak > (settings.lastStreakCelebration || 0)) {
      setTimeout(() => showMilestoneToast(stats.streak), 800)
      await window.DailyDictStorage.saveSettings({ lastStreakCelebration: stats.streak })
    }

    const btn = document.getElementById('btn-start-review'), badge = document.getElementById('due-count-badge')
    if (btn) {
      if (badge) badge.textContent = `${dueToday.length} từ đến hạn`
      btn.addEventListener('click', () => { window.location.href = 'review.html' })
      if (dueToday.length === 0) { btn.disabled = true; btn.classList.add('cta-primary--empty') }
    }
  } catch (err) { console.error('Dashboard init error:', err); showGlobalError() }
}

function renderChart(words) {
  const chartWrap = document.getElementById('chart-bars'); if (!chartWrap) return
  const last7Days = [], daysName = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7']
  for (let i = 6; i >= 0; i--) {
    const d = new Date(); d.setDate(d.getDate() - i)
    const count = words.filter(w => new Date(w.createdAt).toDateString() === d.toDateString()).length
    last7Days.push({ label: daysName[d.getDay()], count })
  }
  const maxCount = Math.max(...last7Days.map(d => d.count), 1)
  chartWrap.innerHTML = last7Days.map(day => `<div class="bar-item"><div class="bar ${day.count === 0 ? 'empty' : ''}" style="height: ${(day.count / maxCount) * 100}%" title="${day.count} từ"></div><div class="bar-label">${day.label}</div></div>`).join('')
}

function renderDueList(dueWords) {
  const list = document.getElementById('due-list'); if (!list) return
  if (dueWords.length === 0) {
    list.innerHTML = `<div class="empty-state"><div class="empty-state__circle"><span class="empty-state__icon">📖</span></div><h3 class="empty-state__title">Chưa có từ nào cần ôn</h3></div>`; return
  }
  list.innerHTML = dueWords.slice(0, 5).map(w => `<div class="word-row"><div class="word-row__main"><span class="word-row__word">${w.word}</span><span class="word-row__phonetic">${w.phonetic || ''}</span></div><div class="word-row__vi">${w.definitionVi || ''}</div><div class="word-row__actions"><span class="status-pill ${getPillClass(w.lastRating)}">${getPillLabel(w.lastRating)}</span></div></div>`).join('')
}

async function renderGoalRing() {
  const goal = await window.DailyDictStorage.getDailyGoal(), todayCount = await window.DailyDictStorage.getTodayCount()
  const pct = Math.min(100, Math.round((todayCount / goal) * 100)), CIRCUMFERENCE = 201.06, offset = CIRCUMFERENCE - (pct / 100) * CIRCUMFERENCE
  const ring = document.getElementById('ring-progress')
  if (ring) {
    ring.style.strokeDasharray = CIRCUMFERENCE; ring.style.strokeDashoffset = CIRCUMFERENCE
    ring.getBoundingClientRect(); ring.style.strokeDashoffset = offset
    if (pct >= 100) ring.style.stroke = '#16A34A'; else if (pct >= 50) ring.style.stroke = '#4F46E5'; else ring.style.stroke = '#EA580C'
  }
  if (document.getElementById('ring-num')) document.getElementById('ring-num').textContent = todayCount
  if (document.getElementById('ring-label')) document.getElementById('ring-label').textContent = `/ ${goal}`
  const wrap = document.getElementById('goal-ring-wrap'); if (wrap) wrap.classList.toggle('goal-achieved', pct >= 100)
}

function initGoalSetter() {
  const btnEdit = document.getElementById('btn-edit-goal'), setter = document.getElementById('goal-setter'), customInput = document.getElementById('goal-custom-input')
  btnEdit?.addEventListener('click', () => setter.style.display = setter.style.display === 'none' ? 'block' : 'none')
  document.querySelectorAll('.goal-opt').forEach(btn => btn.addEventListener('click', async () => {
    document.querySelectorAll('.goal-opt').forEach(b => b.classList.remove('active')); btn.classList.add('active')
    await window.DailyDictStorage.setDailyGoal(parseInt(btn.dataset.val)); renderGoalRing(); setter.style.display = 'none'
  }))
  document.getElementById('btn-save-goal')?.addEventListener('click', async () => {
    const val = parseInt(customInput.value); if (!val || val < 1 || val > 100) return
    await window.DailyDictStorage.setDailyGoal(val); renderGoalRing(); setter.style.display = 'none'
  })
}

async function renderHeatmap() {
  const wrap = document.getElementById('heatmap-wrap'); if (!wrap) return
  const data = await window.DailyDictStorage.getHeatmapData(365), CELL_SIZE = 11, CELL_GAP = 2, DAYS = 7
  const maxVal = Math.max(...Object.values(data), 1)
  const getColor = (count) => count === 0 ? 'var(--hm-0)' : `var(--hm-${Math.min(Math.ceil((count / maxVal) * 4), 4)})`
  
  const today = new Date(), cells = []
  for (let i = 364; i >= 0; i--) {
    const d = new Date(today); d.setDate(d.getDate() - i)
    const key = d.toISOString().split('T')[0]
    cells.push({ date: key, count: data[key] || 0, dow: (d.getDay() + 6) % 7, d })
  }

  // BUG-FIX: Calculate week columns correctly based on DOW of the first day
  const firstDayDow = cells[0].dow
  const getWeekIdx = (i) => Math.floor((i + firstDayDow) / 7)
  const totalWeeks = getWeekIdx(cells.length - 1) + 1

  let svg = `<svg width="100%" viewBox="0 0 ${totalWeeks * (CELL_SIZE + CELL_GAP)} ${DAYS * (CELL_SIZE + CELL_GAP) + 20}" xmlns="http://www.w3.org/2000/svg">`
  let lastMonth = -1
  cells.forEach((cell, i) => {
    const wk = getWeekIdx(i), month = cell.d.getMonth()
    if (month !== lastMonth) {
      // Only show month label if there's enough space (first week of the month)
      const prevCell = cells[i-1]
      if (!prevCell || prevCell.d.getMonth() !== month) {
        svg += `<text x="${wk * (CELL_SIZE + CELL_GAP)}" y="10" font-size="9" fill="var(--c-text-4)" font-family="var(--font-main)">${['T1','T2','T3','T4','T5','T6','T7','T8','T9','T10','T11','T12'][month]}</text>`
        lastMonth = month
      }
    }
    svg += `<rect x="${wk * (CELL_SIZE + CELL_GAP)}" y="${cell.dow * (CELL_SIZE + CELL_GAP) + 16}" width="${CELL_SIZE}" height="${CELL_SIZE}" rx="2" fill="${getColor(cell.count)}"><title>${cell.count > 0 ? `${cell.date}: ${cell.count} từ` : `${cell.date}: chưa học`}</title></rect>`
  })
  wrap.innerHTML = svg + '</svg>'
  const total = Object.values(data).reduce((s, v) => s + v, 0)
  if (document.getElementById('heatmap-total')) document.getElementById('heatmap-total').textContent = `${total} từ trong năm qua`
}

async function checkStreakWarning() {
  async function _doCheck() {
    const streak = await window.DailyDictStorage.getCurrentStreak(), todayCount = await window.DailyDictStorage.getTodayCount()
    if (streak === 0 || todayCount > 0 || new Date().getHours() < 20) { document.querySelector('.streak-warning')?.remove(); return }
    if (document.querySelector('.streak-warning')) return
    const banner = document.createElement('div'); banner.className = 'streak-warning'
    banner.innerHTML = `<span class="streak-warning__icon">⚠️</span><div class="streak-warning__text"><strong>Streak ${streak} ngày sắp bị mất!</strong><span>Lưu ít nhất 1 từ trước nửa đêm để giữ chuỗi.</span></div><a href="https://dailydictation.com" target="_blank" class="streak-warning__cta">Học ngay →</a>`
    document.querySelector('.app-header').insertAdjacentElement('afterend', banner)
  }
  await _doCheck(); setInterval(_doCheck, 5 * 60 * 1000)
}

async function checkNewBadges() {
  const unseen = await window.DailyDictStorage.getUnseenBadges()
  if (unseen.length > 0) document.querySelector('a[href="achievements.html"]')?.classList.add('nav-link--has-new')
}

function showMilestoneToast(streak) {
  const messages = { 7: { emoji: '🔥', text: `${streak} ngày liên tiếp!`, sub: 'Thói quen đang hình thành.' }, 14: { emoji: '💪', text: `${streak} ngày liên tiếp!`, sub: 'Bạn thật kiên trì!' }, 30: { emoji: '🏆', text: `${streak} ngày liên tiếp!`, sub: 'Một tháng không nghỉ. Tuyệt vời!' }, 60: { emoji: '⭐', text: `${streak} ngày liên tiếp!`, sub: 'Hai tháng! Bạn là máy học từ.' }, 100: { emoji: '👑', text: `${streak} ngày liên tiếp!`, sub: '100 ngày — Legend!' } }
  const msg = messages[streak] || { emoji: '🎯', text: `${streak} ngày liên tiếp!`, sub: '' }
  const toast = document.createElement('div'); toast.className = 'milestone-toast'
  toast.innerHTML = `<div class="milestone-toast__inner"><span class="milestone-toast__emoji">${msg.emoji}</span><div style="flex: 1;"><div class="milestone-toast__title">${msg.text}</div><div class="milestone-toast__sub">${msg.sub}</div></div><button class="milestone-toast__close" id="toast-close">×</button></div>`
  document.body.appendChild(toast)
  const timer = setTimeout(() => toast.remove(), 5000)
  document.getElementById('toast-close')?.addEventListener('click', () => { clearTimeout(timer); toast.remove() })
}

document.addEventListener('DOMContentLoaded', initDashboard)
