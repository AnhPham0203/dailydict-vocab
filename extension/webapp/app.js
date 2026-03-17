// --- SHARED STATE ---
let filterState = {
  search: '',
  tag: 'all',
  rating: 'all',
  source: 'all',
  sort: 'newest'
}
let selectMode = false
let selectedIds = new Set()

// --- REVIEW LOGIC ---
let queue = []
let currentIndex = 0
let flipped = false
let reviewedCount = 0

async function initReview() {
  if (!window.location.pathname.includes('review.html')) return
  
  document.getElementById('rate-again')?.addEventListener('click', () => rate('again'))
  document.getElementById('rate-hard')?.addEventListener('click', () => rate('hard'))
  document.getElementById('rate-good')?.addEventListener('click', () => rate('good'))
  document.getElementById('rate-easy')?.addEventListener('click', () => rate('easy'))
  document.getElementById('card')?.addEventListener('click', flipCard)

  queue = await window.DailyDictStorage.getWordsDueToday()
  
  if (queue.length === 0) {
    const allWords = await window.DailyDictStorage.getWords()
    if (allWords.length === 0) {
      showDone(0)
      return
    }
    queue = allWords.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)).slice(0, 10)
  }
  
  showCard(0)
}

function showCard(index) {
  if (index >= queue.length) { showDone(reviewedCount); return }
  flipped = false
  const word = queue[index]
  
  const cardFront = document.getElementById('card-front')
  const cardBack = document.getElementById('card-back')
  const ratingRow = document.getElementById('rating-row')

  document.getElementById('word-text').textContent = word.word
  document.getElementById('phonetic-text').textContent = word.phonetic || ''
  document.getElementById('definition-vi').textContent = word.definitionVi || 'Chưa có nghĩa'
  document.getElementById('definition-en').textContent = word.definitionEn || ''
  document.getElementById('example-text').textContent = word.example ? `"${word.example}"` : ''
  document.getElementById('source-text').textContent = word.sourceLesson ? `📌 ${word.sourceLesson}` : ''
  
  cardFront.style.display = 'block'; cardBack.style.display = 'none'; ratingRow.style.display = 'none'
  updateProgress()
}

function flipCard() {
  if (flipped) return
  flipped = true
  document.getElementById('card-front').style.display = 'none'
  document.getElementById('card-back').style.display = 'block'
  document.getElementById('rating-row').style.display = 'grid'
}

async function rate(rating) {
  if (!flipped) return
  const word = queue[currentIndex]
  await window.DailyDictStorage.updateReview(word.id, rating)
  reviewedCount++; currentIndex++
  showCard(currentIndex)
}

function updateProgress() {
  const pct = (currentIndex / queue.length) * 100
  const fill = document.getElementById('progress-fill')
  const text = document.getElementById('progress-text')
  if (fill) fill.style.width = `${pct}%`
  if (text) text.textContent = `${currentIndex} / ${queue.length}`
}

function showDone(count) {
  const cardContainer = document.getElementById('card-container')
  const ratingRow = document.getElementById('rating-row')
  const done = document.getElementById('done-screen')
  const doneText = document.getElementById('done-text')

  if (cardContainer) cardContainer.style.display = 'none'
  if (ratingRow) ratingRow.style.display = 'none'
  if (done) done.style.display = 'flex'
  if (doneText) doneText.textContent = count > 0 ? `Bạn đã ôn tập xong ${count} từ cho ngày hôm nay.` : "Hôm nay bạn không có từ nào cần ôn tập. Hãy lưu thêm từ mới nhé!"
}

// --- DASHBOARD LOGIC ---
async function initDashboard() {
  if (!window.location.pathname.includes('index.html')) return
  
  const stats = await window.DailyDictStorage.getStats()
  const words = await window.DailyDictStorage.getWords()
  const dueToday = await window.DailyDictStorage.getWordsDueToday()

  document.getElementById('stat-streak').textContent = stats.streak
  document.getElementById('stat-total').textContent = stats.total
  document.getElementById('stat-retention').textContent = stats.retentionRate
  document.getElementById('stat-due').textContent = stats.dueCount

  renderChart(words)
  renderDueList(dueToday)
  renderGoalRing()
  renderHeatmap()
  checkStreakWarning()
  checkNewBadges()
  initGoalSetter()

  const btn = document.getElementById('btn-start-review')
  const badge = document.getElementById('due-count-badge')
  if (btn) {
    if (badge) badge.textContent = `${dueToday.length} từ đến hạn`
    btn.addEventListener('click', () => { window.location.href = 'review.html' })
    if (dueToday.length === 0) { btn.disabled = true; btn.classList.add('cta-primary--empty') }
  }
}

function renderChart(words) {
  const chartWrap = document.getElementById('chart-bars')
  if (!chartWrap) return
  const last7Days = []
  const daysName = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7']
  for (let i = 6; i >= 0; i--) {
    const d = new Date(); d.setDate(d.getDate() - i)
    const count = words.filter(w => new Date(w.createdAt).toDateString() === d.toDateString()).length
    last7Days.push({ label: daysName[d.getDay()], count })
  }
  const maxCount = Math.max(...last7Days.map(d => d.count), 1)
  chartWrap.innerHTML = last7Days.map(day => `
    <div class="bar-item">
      <div class="bar ${day.count === 0 ? 'empty' : ''}" style="height: ${(day.count / maxCount) * 100}%" title="${day.count} từ"></div>
      <div class="bar-label">${day.label}</div>
    </div>`).join('')
}

function renderDueList(dueWords) {
  const list = document.getElementById('due-list')
  if (!list) return
  if (dueWords.length === 0) {
    list.innerHTML = `<div class="empty-state"><div class="empty-state__circle"><span class="empty-state__icon">📖</span></div><h3 class="empty-state__title">Chưa có từ nào cần ôn</h3></div>`
    return
  }
  list.innerHTML = dueWords.slice(0, 5).map(w => `
    <div class="word-row">
      <div class="word-row__main"><span class="word-row__word">${w.word}</span><span class="word-row__phonetic">${w.phonetic || ''}</span></div>
      <div class="word-row__vi">${w.definitionVi || ''}</div>
      <div class="word-row__actions"><span class="status-pill ${getPillClass(w.lastRating)}">${getPillLabel(w.lastRating)}</span></div>
    </div>`).join('')
}

// --- v1.2 FEATURES ---
async function renderGoalRing() {
  const goal = await window.DailyDictStorage.getDailyGoal()
  const todayCount = await window.DailyDictStorage.getTodayCount()
  const pct = Math.min(100, Math.round((todayCount / goal) * 100))
  const CIRCUMFERENCE = 201.06
  const offset = CIRCUMFERENCE - (pct / 100) * CIRCUMFERENCE
  const ring = document.getElementById('ring-progress')
  if (ring) {
    ring.style.strokeDasharray = CIRCUMFERENCE; ring.style.strokeDashoffset = CIRCUMFERENCE
    ring.getBoundingClientRect(); ring.style.strokeDashoffset = offset
    if (pct >= 100) ring.style.stroke = '#16A34A'; else if (pct >= 50) ring.style.stroke = '#4F46E5'; else ring.style.stroke = '#EA580C'
  }
  if (document.getElementById('ring-num')) document.getElementById('ring-num').textContent = todayCount
  if (document.getElementById('ring-label')) document.getElementById('ring-label').textContent = `/ ${goal}`
  const wrap = document.getElementById('goal-ring-wrap')
  if (wrap) wrap.classList.toggle('goal-achieved', pct >= 100)
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
  const data = await window.DailyDictStorage.getHeatmapData(365), CELL_SIZE = 11, CELL_GAP = 2, WEEKS = 53, DAYS = 7
  const maxVal = Math.max(...Object.values(data), 1)
  const getColor = (count) => count === 0 ? 'var(--hm-0)' : `var(--hm-${Math.min(Math.ceil((count / maxVal) * 4), 4)})`
  const today = new Date(), cells = []
  for (let i = 364; i >= 0; i--) {
    const d = new Date(today); d.setDate(d.getDate() - i)
    const key = d.toISOString().split('T')[0]
    cells.push({ date: key, count: data[key] || 0, dow: (d.getDay() + 6) % 7, d })
  }
  let svg = `<svg width="100%" viewBox="0 0 ${WEEKS * (CELL_SIZE + CELL_GAP)} ${DAYS * (CELL_SIZE + CELL_GAP) + 20}" xmlns="http://www.w3.org/2000/svg">`
  let lastMonth = -1, weekIdx = 0
  cells.forEach((cell, i) => {
    const wk = Math.floor(i / 7), month = cell.d.getMonth()
    if (month !== lastMonth && wk !== weekIdx) {
      svg += `<text x="${wk * (CELL_SIZE + CELL_GAP)}" y="10" font-size="9" fill="var(--c-text-4)" font-family="var(--font-main)">${['T1','T2','T3','T4','T5','T6','T7','T8','T9','T10','T11','T12'][month]}</text>`
      lastMonth = month; weekIdx = wk
    }
    svg += `<rect x="${wk * (CELL_SIZE + CELL_GAP)}" y="${cell.dow * (CELL_SIZE + CELL_GAP) + 16}" width="${CELL_SIZE}" height="${CELL_SIZE}" rx="2" fill="${getColor(cell.count)}"><title>${cell.count > 0 ? `${cell.date}: ${cell.count} từ` : `${cell.date}: chưa học`}</title></rect>`
  })
  wrap.innerHTML = svg + '</svg>'
  const total = Object.values(data).reduce((s, v) => s + v, 0)
  if (document.getElementById('heatmap-total')) document.getElementById('heatmap-total').textContent = `${total} từ trong năm qua`
}

async function checkStreakWarning() {
  const streak = await window.DailyDictStorage.getCurrentStreak(), todayCount = await window.DailyDictStorage.getTodayCount()
  if (streak === 0 || todayCount > 0 || new Date().getHours() < 20) return
  const banner = document.createElement('div'); banner.className = 'streak-warning'
  banner.innerHTML = `<span class="streak-warning__icon">⚠️</span><div class="streak-warning__text"><strong>Streak ${streak} ngày sắp bị mất!</strong><span>Lưu ít nhất 1 từ trước nửa đêm để giữ chuỗi.</span></div><a href="https://dailydictation.com" target="_blank" class="streak-warning__cta">Học ngay →</a>`
  document.querySelector('.app-header').insertAdjacentElement('afterend', banner)
}

async function checkNewBadges() {
  const unseen = await window.DailyDictStorage.getUnseenBadges()
  if (unseen.length > 0) document.querySelector('a[href="achievements.html"]')?.classList.add('nav-link--has-new')
}

// --- WORD LIST LOGIC (v1.3 Updated) ---
async function initWordList() {
  if (!window.location.pathname.includes('words.html')) return
  
  // URL Params for deep linking
  const params = new URLSearchParams(window.location.search)
  if (params.get('tag')) filterState.tag = params.get('tag')
  if (params.get('rating')) filterState.rating = params.get('rating')

  await renderFilterTags()
  await renderFilterSources()
  await applyFilters()
  initBulkActions()

  document.getElementById('search-input')?.addEventListener('input', debounce((e) => {
    filterState.search = e.target.value.trim(); applyFilters()
  }, 200))

  document.getElementById('sort-select')?.addEventListener('change', (e) => {
    filterState.sort = e.target.value; applyFilters()
  })

  // Filter Event Listeners
  document.getElementById('filter-tags')?.addEventListener('click', (e) => {
    const btn = e.target.closest('.filter-chip'); if (!btn) return
    document.querySelectorAll('#filter-tags .filter-chip').forEach(b => b.classList.remove('filter-chip--active'))
    btn.classList.add('filter-chip--active'); filterState.tag = btn.dataset.tag; applyFilters()
  })

  document.getElementById('filter-rating')?.addEventListener('click', (e) => {
    const btn = e.target.closest('.filter-chip'); if (!btn) return
    document.querySelectorAll('#filter-rating .filter-chip').forEach(b => b.classList.remove('filter-chip--active'))
    btn.classList.add('filter-chip--active'); filterState.rating = btn.dataset.rating; applyFilters()
  })

  document.getElementById('filter-source')?.addEventListener('change', (e) => {
    filterState.source = e.target.value; applyFilters()
  })

  document.getElementById('btn-clear-filters')?.addEventListener('click', () => {
    filterState = { search: '', tag: 'all', rating: 'all', source: 'all', sort: 'newest' }
    document.getElementById('search-input').value = ''
    document.getElementById('filter-source').value = 'all'
    document.querySelectorAll('.filter-chip').forEach(b => b.classList.toggle('filter-chip--active', b.dataset.tag === 'all' || b.dataset.rating === 'all'))
    applyFilters()
  })

  document.getElementById('btn-reset-empty')?.addEventListener('click', () => document.getElementById('btn-clear-filters').click())

  // Delegation for Word List
  document.getElementById('word-list-container')?.addEventListener('click', (e) => {
    const target = e.target, row = target.closest('.word-row'), del = target.closest('.btn-delete')
    if (del) { e.stopPropagation(); deleteWord(del.dataset.id, del.dataset.word); return }
    if (row) {
      if (selectMode) {
        const id = row.dataset.id
        if (selectedIds.has(id)) selectedIds.delete(id); else selectedIds.add(id)
        row.classList.toggle('selected', selectedIds.has(id)); updateBulkToolbar()
      } else {
        window.location.href = `word.html?id=${row.dataset.id}`
      }
    }
  })
}

async function renderFilterTags() {
  const tags = await window.DailyDictStorage.getTags()
  const container = document.getElementById('filter-tags')
  if (!container) return
  const currentTag = filterState.tag
  container.innerHTML = `<button class="filter-chip ${currentTag === 'all' ? 'filter-chip--active' : ''}" data-tag="all">Tất cả</button>` +
    tags.map(t => `<button class="filter-chip ${currentTag === t.name ? 'filter-chip--active' : ''}" data-tag="${t.name}" style="--tag-color: ${t.color}">${t.name}</button>`).join('')
}

async function renderFilterSources() {
  const words = await window.DailyDictStorage.getWords()
  const sources = Array.from(new Set(words.map(w => w.sourceLesson).filter(Boolean))).sort()
  const select = document.getElementById('filter-source')
  if (!select) return
  select.innerHTML = '<option value="all">Tất cả bài</option>' + sources.map(s => `<option value="${s}" ${filterState.source === s ? 'selected' : ''}>${s}</option>`).join('')
}

async function applyFilters() {
  let words = await window.DailyDictStorage.getWords()
  if (filterState.search) {
    const q = filterState.search.toLowerCase()
    words = words.filter(w => w.word.toLowerCase().includes(q) || (w.definitionVi||'').toLowerCase().includes(q) || (w.definitionEn||'').toLowerCase().includes(q))
  }
  if (filterState.tag !== 'all') words = words.filter(w => (w.tags || []).includes(filterState.tag))
  if (filterState.rating !== 'all') {
    if (filterState.rating === 'new') words = words.filter(w => !w.lastRating)
    else words = words.filter(w => w.lastRating === filterState.rating)
  }
  if (filterState.source !== 'all') words = words.filter(w => w.sourceLesson === filterState.source)
  
  words = sortWords(words, filterState.sort)
  renderWordList(words)
  updateFilterSummary(words.length)
}

function updateFilterSummary(count) {
  const summary = document.getElementById('filter-summary'), hasFilter = filterState.tag !== 'all' || filterState.rating !== 'all' || filterState.source !== 'all' || filterState.search
  if (summary) summary.style.display = hasFilter ? 'flex' : 'none'
  if (document.getElementById('filter-result-count')) document.getElementById('filter-result-count').textContent = `${count} từ tìm thấy`
}

function renderWordList(words) {
  const container = document.getElementById('word-list-container'), totalCount = document.getElementById('total-count'), emptyState = document.getElementById('empty-state')
  if (!container || !totalCount || !emptyState) return
  totalCount.textContent = `${words.length} từ vựng`
  if (words.length === 0) { container.innerHTML = ''; emptyState.style.display = 'flex'; return }
  emptyState.style.display = 'none'
  container.innerHTML = words.map(w => `
    <div class="word-row ${selectMode ? 'selectable' : ''} ${selectedIds.has(w.id) ? 'selected' : ''}" data-id="${w.id}">
      <div class="word-row__main">
        <span class="word-row__word">${w.word}</span>
        <span class="word-row__phonetic">${w.phonetic || ''}</span>
      </div>
      <div class="word-row__vi">${w.definitionVi || ''}</div>
      <div class="word-row__actions">
        <div class="word-tags-preview" style="display:flex; gap:4px; margin-right:8px;">
          ${(w.tags || []).slice(0, 2).map(t => `<span style="font-size:9px; background:#F5F5F4; padding:1px 5px; border-radius:4px; color:#78716C;">${t}</span>`).join('')}
          ${(w.tags || []).length > 2 ? `<span style="font-size:9px; color:#A8A29E;">+${w.tags.length - 2}</span>` : ''}
        </div>
        <span class="status-pill ${getPillClass(w.lastRating)}">${getPillLabel(w.lastRating)}</span>
        <button class="delete-btn btn-delete" data-id="${w.id}" data-word="${w.word}"><svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M2 3.5h10M5.5 3.5V2.5h3v1M3.5 3.5l.5 8h6l.5-8" stroke="currentColor" stroke-width="1.2" stroke-linecap="round"/></svg></button>
      </div>
    </div>`).join('')
}

function initBulkActions() {
  document.getElementById('btn-toggle-select')?.addEventListener('click', () => {
    selectMode = !selectMode; selectedIds.clear()
    document.getElementById('btn-toggle-select').textContent = selectMode ? '✕ Thoát chọn' : '☑ Chọn nhiều'
    document.getElementById('btn-toggle-select').style.background = selectMode ? 'var(--c-primary-light)' : 'var(--c-surface)'
    applyFilters(); updateBulkToolbar()
  })
  document.getElementById('btn-deselect-all')?.addEventListener('click', () => { selectedIds.clear(); applyFilters(); updateBulkToolbar() })
  document.getElementById('btn-bulk-delete')?.addEventListener('click', async () => {
    if (!confirm(`Xoá ${selectedIds.size} từ đã chọn?`)) return
    await Promise.all([...selectedIds].map(id => window.DailyDictStorage.deleteWord(id)))
    selectedIds.clear(); applyFilters(); updateBulkToolbar()
  })
  document.getElementById('btn-bulk-tag')?.addEventListener('click', async () => {
    const tagName = prompt('Nhập tên tag để gán cho các từ đã chọn:')
    if (!tagName) return
    await Promise.all([...selectedIds].map(id => window.DailyDictStorage.addTagToWord(id, tagName)))
    selectedIds.clear(); applyFilters(); updateBulkToolbar()
  })
}

function updateBulkToolbar() {
  const toolbar = document.getElementById('bulk-toolbar'), count = document.getElementById('bulk-count')
  if (toolbar) toolbar.style.display = selectedIds.size > 0 ? 'flex' : 'none'
  if (count) count.textContent = `${selectedIds.size} đã chọn`
}

async function deleteWord(id, word) {
  if (confirm(`Bạn có chắc muốn xóa từ "${word}"?`)) {
    await window.DailyDictStorage.deleteWord(id); applyFilters()
  }
}

function sortWords(words, criteria) {
  const sorted = [...words]
  if (criteria === 'newest') return sorted.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
  if (criteria === 'oldest') return sorted.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt))
  if (criteria === 'az') return sorted.sort((a, b) => a.word.localeCompare(b.word))
  if (criteria === 'due') return sorted.sort((a, b) => new Date(a.nextReviewAt) - new Date(b.nextReviewAt))
  return sorted
}

function debounce(fn, ms) { let timeout; return function() { clearTimeout(timeout); timeout = setTimeout(() => fn.apply(this, arguments), ms) } }
function getPillClass(r) { return !r ? 'pill-new' : r === 'again' ? 'pill-again' : r === 'hard' ? 'pill-hard' : 'pill-review' }
function getPillLabel(r) { return !r ? 'Mới' : r === 'again' ? 'Quên' : r === 'hard' ? 'Khó' : 'Ôn tập' }

document.addEventListener('DOMContentLoaded', () => {
  initReview(); initDashboard(); initWordList()
  document.addEventListener('keydown', (e) => {
    if (!window.location.pathname.includes('review.html')) return
    if (e.code === 'Space' || e.key === 'Enter') { e.preventDefault(); flipCard() }
    if (flipped) { if (e.key === '1') rate('again'); if (e.key === '2') rate('hard'); if (e.key === '3') rate('good'); if (e.key === '4') rate('easy') }
  })
})
