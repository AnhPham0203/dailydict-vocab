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

  document.getElementById('stat-streak').textContent = `${stats.streak}🔥`
  document.getElementById('stat-total').textContent = stats.total
  document.getElementById('stat-retention').textContent = `${stats.retentionRate}%`
  document.getElementById('stat-due').textContent = stats.dueCount

  renderChart(words)
  renderDueList(dueToday)

  const btn = document.getElementById('btn-start-review')
  if (btn) {
    btn.textContent = `Bắt đầu ôn tập (${dueToday.length} từ)`
    btn.addEventListener('click', () => { window.location.href = 'review.html' })
    if (dueToday.length === 0) btn.disabled = true
  }
}

function renderChart(words) {
  const chartWrap = document.getElementById('chart-wrap')
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
    list.innerHTML = `<div class="empty-state" style="padding: 20px 0;"><div class="empty-emoji">🎉</div><p>Không có từ nào cần ôn tập hôm nay!</p></div>`
    return
  }
  const preview = dueWords.slice(0, 5)
  list.innerHTML = preview.map(w => `
    <div class="word-item">
      <div class="word-info">
        <div class="word-title">${w.word} <span class="word-phonetic">${w.phonetic || ''}</span></div>
        <div class="word-vi">${w.definitionVi || ''}</div>
      </div>
      <div class="pill ${getPillClass(w.lastRating)}">${getPillLabel(w.lastRating)}</div>
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
    emptyState.style.display = 'block'
    return
  }
  emptyState.style.display = 'none'
  container.innerHTML = words.map(w => `
    <div class="word-row-group" id="group-${w.id}">
      <div class="word-item word-row" data-id="${w.id}">
        <div class="word-info">
          <div class="word-title">${w.word} <span class="word-phonetic">${w.phonetic || ''}</span></div>
          <div class="word-vi">${w.definitionVi || ''}</div>
        </div>
        <div style="display: flex; align-items: center; gap: 12px;">
          <div class="pill ${getPillClass(w.lastRating)}">${getPillLabel(w.lastRating)}</div>
          <button class="btn-delete" data-id="${w.id}" data-word="${w.word}">🗑</button>
        </div>
      </div>
      <div class="word-detail" id="detail-${w.id}">
        <div class="definition-en" style="font-size: 13px; margin-bottom: 8px;">${w.definitionEn || 'Không có định nghĩa tiếng Anh'}</div>
        <div class="example" style="font-size: 13px;">${w.example ? `"${w.example}"` : 'Không có ví dụ'}</div>
        <div style="font-size: 11px; color: #9ca3af; margin-top: 10px;">
          Lưu ngày: ${new Date(w.createdAt).toLocaleDateString('vi-VN')} | 
          Bài: ${w.sourceUrl ? `<a href="${w.sourceUrl}" target="_blank" class="lesson-link">${w.sourceLesson}</a>` : (w.sourceLesson || 'Không rõ')}
        </div>
      </div>
    </div>
  `).join('')
}

function toggleDetail(id) {
  const detail = document.getElementById(`detail-${id}`)
  if (detail) {
    detail.style.display = (detail.style.display === 'block') ? 'none' : 'block'
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