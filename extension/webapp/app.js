// --- REVIEW LOGIC ---
let queue = []
let currentIndex = 0
let flipped = false
let reviewedCount = 0

async function initReview() {
  if (!window.location.pathname.includes('review.html')) return
  
  // Bind events for review buttons (CSP compliance)
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
  if (index >= queue.length) { 
    showDone(reviewedCount)
    return 
  }
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
  
  cardFront.style.display = 'flex'
  cardFront.style.flexDirection = 'column'
  cardFront.style.alignItems = 'center'
  cardFront.style.justifyContent = 'center'
  
  cardBack.style.display = 'none'
  ratingRow.style.display = 'none'
  
  updateProgress()
}

function flipCard() {
  if (flipped) return
  flipped = true
  document.getElementById('card-front').style.display = 'none'
  
  const cardBack = document.getElementById('card-back')
  cardBack.style.display = 'flex'
  cardBack.style.flexDirection = 'column'
  cardBack.style.alignItems = 'center'
  cardBack.style.justifyContent = 'center'
  
  document.getElementById('rating-row').style.display = 'flex'
}

async function rate(rating) {
  if (!flipped) return
  const word = queue[currentIndex]
  await window.DailyDictStorage.updateReview(word.id, rating)
  
  reviewedCount++
  currentIndex++
  showCard(currentIndex)
}

function updateProgress() {
  const total = queue.length
  const pct = (currentIndex / total) * 100
  const fill = document.getElementById('progress-fill')
  const text = document.getElementById('progress-text')
  if (fill) fill.style.width = `${pct}%`
  if (text) text.textContent = `${currentIndex} / ${total}`
}

function showDone(count) {
  const cardContainer = document.getElementById('card-container')
  const ratingRow = document.getElementById('rating-row')
  const fill = document.getElementById('progress-fill')
  const done = document.getElementById('done-screen')
  const doneText = document.getElementById('done-text')

  if (cardContainer) cardContainer.style.display = 'none'
  if (ratingRow) ratingRow.style.display = 'none'
  if (fill) fill.style.width = '100%'
  if (done) done.style.display = 'flex'
  if (doneText) doneText.textContent = count > 0 
    ? `Bạn đã ôn tập xong ${count} từ cho ngày hôm nay.`
    : "Hôm nay bạn không có từ nào cần ôn tập. Hãy lưu thêm từ mới nhé!"
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

  const btn = document.getElementById('btn-start-review')
  const badge = document.getElementById('due-count-badge')
  if (btn) {
    if (badge) badge.textContent = `${dueToday.length} từ đến hạn`
    btn.addEventListener('click', () => { window.location.href = 'review.html' })
    if (dueToday.length === 0) {
      btn.disabled = true
      btn.classList.add('cta-primary--empty')
    }
  }
}

function renderChart(words) {
  const chartWrap = document.getElementById('chart-bars')
  if (!chartWrap) return
  
  const last7Days = []
  const daysName = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7']
  for (let i = 6; i >= 0; i--) {
    const d = new Date()
    d.setDate(d.getDate() - i)
    const dateStr = d.toDateString()
    const count = words.filter(w => new Date(w.createdAt).toDateString() === dateStr).length
    last7Days.push({ label: daysName[d.getDay()], count })
  }
  const maxCount = Math.max(...last7Days.map(d => d.count), 1)
  chartWrap.innerHTML = last7Days.map(day => `
    <div class="bar-item">
      <div class="bar ${day.count === 0 ? 'empty' : ''}" style="height: ${(day.count / maxCount) * 100}%" title="${day.count} từ"></div>
      <div class="bar-label">${day.label}</div>
    </div>
  `).join('')
}

function renderDueList(dueWords) {
  const list = document.getElementById('due-list')
  if (!list) return
  if (dueWords.length === 0) {
    list.innerHTML = `
      <div class="empty-state">
        <div class="empty-state__circle">
          <span class="empty-state__icon">📖</span>
        </div>
        <h3 class="empty-state__title">Chưa có từ nào cần ôn</h3>
        <p class="empty-state__desc">Mọi từ vựng đã được ôn đúng hạn. Tiếp tục lưu từ mới từ DailyDictation!</p>
        <a href="https://dailydictation.com" class="empty-state__cta" target="_blank">Đến DailyDictation →</a>
      </div>`
    return
  }
  const preview = dueWords.slice(0, 5)
  list.innerHTML = preview.map(w => `
    <div class="word-row">
      <div class="word-row__main">
        <span class="word-row__word">${w.word}</span>
        <span class="word-row__phonetic">${w.phonetic || ''}</span>
      </div>
      <div class="word-row__vi">${w.definitionVi || ''}</div>
      <div class="word-row__actions">
        <span class="status-pill ${getPillClass(w.lastRating)}">${getPillLabel(w.lastRating)}</span>
      </div>
    </div>
  `).join('')
}

// --- WORD LIST LOGIC ---
let allWords = []

async function initWordList() {
  if (!window.location.pathname.includes('words.html')) return
  
  allWords = await window.DailyDictStorage.getWords()
  renderWordList(allWords)

  document.getElementById('search-input')?.addEventListener('input', debounce((e) => {
    const query = e.target.value.toLowerCase().trim()
    const filtered = allWords.filter(w => w.word.toLowerCase().includes(query) || (w.definitionVi && w.definitionVi.toLowerCase().includes(query)))
    renderWordList(filtered)
  }, 200))

  document.getElementById('sort-select')?.addEventListener('change', (e) => {
    const sorted = sortWords(allWords, e.target.value)
    renderWordList(sorted)
  })

  // Event Delegation for Delete and Toggle (CSP COMPLIANT)
  document.getElementById('word-list-container')?.addEventListener('click', (e) => {
    const target = e.target
    const row = target.closest('.word-row')
    const deleteBtn = target.closest('.btn-delete')

    if (deleteBtn) {
      e.stopPropagation()
      const id = deleteBtn.dataset.id
      const word = deleteBtn.dataset.word
      deleteWord(id, word)
    } else if (row) {
      const id = row.dataset.id
      toggleDetail(id)
    }
  })
}

function renderWordList(words) {
  const container = document.getElementById('word-list-container')
  const totalCount = document.getElementById('total-count')
  const emptyState = document.getElementById('empty-state')
  if (!container || !totalCount || !emptyState) return

  totalCount.textContent = `${words.length} từ vựng`
  if (words.length === 0) {
    container.innerHTML = ''
    emptyState.style.display = 'flex'
    return
  }
  emptyState.style.display = 'none'
  container.innerHTML = words.map(w => `
    <div class="word-row-group" id="group-${w.id}">
      <div class="word-row" data-id="${w.id}">
        <div class="word-row__main">
          <span class="word-row__word">${w.word}</span>
          <span class="word-row__phonetic">${w.phonetic || ''}</span>
        </div>
        <div class="word-row__vi">${w.definitionVi || ''}</div>
        <div class="word-row__actions">
          <span class="status-pill ${getPillClass(w.lastRating)}">${getPillLabel(w.lastRating)}</span>
          <button class="delete-btn btn-delete" data-id="${w.id}" data-word="${w.word}" aria-label="Xóa từ này">
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path d="M2 3.5h10M5.5 3.5V2.5h3v1M3.5 3.5l.5 8h6l.5-8" stroke="currentColor" stroke-width="1.2" stroke-linecap="round"/>
            </svg>
          </button>
        </div>
      </div>
      <div class="word-detail" id="detail-${w.id}">
        <div class="flashcard-en" style="margin-bottom: var(--space-2);">${w.definitionEn || 'Không có định nghĩa tiếng Anh'}</div>
        <div class="flashcard-example">${w.example ? `"${w.example}"` : 'Không có ví dụ'}</div>
        <div style="font-size: var(--text-xs); color: var(--c-text-4); margin-top: var(--space-3); display: flex; justify-content: space-between;">
          <span>Lưu ngày: ${new Date(w.createdAt).toLocaleDateString('vi-VN')}</span>
          <span>Bài: ${w.sourceUrl ? `<a href="${w.sourceUrl}" target="_blank" class="nav-link" style="display:inline; padding:0; color:var(--c-primary);">${w.sourceLesson}</a>` : (w.sourceLesson || 'Không rõ')}</span>
        </div>
      </div>
    </div>
  `).join('')
}

function toggleDetail(id) {
  const detail = document.getElementById(`detail-${id}`)
  const group = document.getElementById(`group-${id}`)
  if (detail && group) {
    const isExpanded = detail.style.display === 'block'
    detail.style.display = isExpanded ? 'none' : 'block'
    if (isExpanded) {
      group.classList.remove('expanded')
    } else {
      group.classList.add('expanded')
    }
  }
}

async function deleteWord(id, word) {
  if (confirm(`Bạn có chắc muốn xóa từ "${word}"?`)) {
    await window.DailyDictStorage.deleteWord(id)
    allWords = allWords.filter(w => w.id !== id)
    renderWordList(allWords)
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

function debounce(fn, ms) {
  let timeout
  return function() {
    clearTimeout(timeout)
    timeout = setTimeout(() => fn.apply(this, arguments), ms)
  }
}

function getPillClass(rating) {
  if (!rating) return 'pill-new'
  if (rating === 'again') return 'pill-again'
  if (rating === 'hard') return 'pill-hard'
  return 'pill-review'
}

function getPillLabel(rating) {
  if (!rating) return 'Mới'
  if (rating === 'again') return 'Quên'
  if (rating === 'hard') return 'Khó'
  return 'Ôn tập'
}

// Global KeyDown
document.addEventListener('keydown', (e) => {
  if (!window.location.pathname.includes('review.html')) return
  if (e.code === 'Space' || e.key === 'Enter') { e.preventDefault(); flipCard() }
  if (flipped) {
    if (e.key === '1') rate('again')
    if (e.key === '2') rate('hard')
    if (e.key === '3') rate('good')
    if (e.key === '4') rate('easy')
  }
})

// Initialize everything
initReview()
initDashboard()
initWordList()