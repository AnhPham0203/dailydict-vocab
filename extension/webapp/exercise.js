// ── State ──
let exercises     = []
let currentEx     = null
let currentIdx    = 0
let correctCount  = 0
let selectedWords = []

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

  list.innerHTML = exercises.map(ex => {
    const playCount  = ex.playCount || 0
    const bestScore  = ex.bestScore !== null ? ex.bestScore : null
    const lastPlayed = ex.lastPlayedAt
      ? new Date(ex.lastPlayedAt).toLocaleDateString('vi-VN')
      : null

    const badge = playCount === 0
      ? `<span class="ex-badge ex-badge--new">Chưa làm</span>`
      : bestScore >= 80
        ? `<span class="ex-badge ex-badge--done">✓ ${bestScore}%</span>`
        : `<span class="ex-badge ex-badge--partial">${bestScore}%</span>`

    const meta = playCount === 0
      ? `${ex.sentences.length} câu · Lưu ${new Date(ex.createdAt).toLocaleDateString('vi-VN')}`
      : `${ex.sentences.length} câu · Đã làm ${playCount} lần · Lần cuối ${lastPlayed}`

    return `
      <div class="exercise-row ${playCount > 0 ? 'exercise-row--played' : ''}" data-id="${ex.id}">
        <div class="exercise-row__info">
          <div class="exercise-row__title">${ex.title}</div>
          <div class="exercise-row__meta">${meta}</div>
        </div>
        <div class="exercise-row__actions">
          ${badge}
          <button class="btn-start" data-id="${ex.id}">
            ${playCount === 0 ? 'Làm bài →' : 'Làm lại →'}
          </button>
          <button class="btn-delete-ex" data-id="${ex.id}">🗑</button>
        </div>
      </div>`
  }).join('')

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

  window.DailyDictStorage.recordPlay(ex.id)

  showScreen('game')
  document.getElementById('header-title').textContent = ex.title
  document.getElementById('back-btn').textContent = '← Bài tập'
  document.getElementById('back-btn').onclick = (e) => {
    e.preventDefault()
    showScreen('list')
  }

  renderQuestion()
}

function renderQuestion() {
  const sentence = currentEx.sentences[currentIdx]
  const total    = currentEx.sentences.length

  const pct = (currentIdx / total) * 100
  document.getElementById('progress-fill').style.width = pct + '%'
  document.getElementById('header-meta').textContent = `Câu ${currentIdx + 1}/${total}`

  document.getElementById('scramble-vi').textContent = sentence.textVI || '(Không có nghĩa)'

  selectedWords = []
  renderAnswerArea()
  renderWordBank(sentence.words)

  const fb = document.getElementById('scramble-feedback')
  fb.style.display = 'none'
  fb.className = 'scramble-feedback'

  document.getElementById('answer-area').className = 'answer-area'

  document.getElementById('btn-check').disabled = false
  document.getElementById('btn-check').textContent = 'Kiểm tra'
}

function renderWordBank(words) {
  const bank = document.getElementById('word-bank')
  bank.innerHTML = ''
  words.forEach((w, i) => {
    const chip = document.createElement('button')
    chip.className = 'word-chip'
    chip.dataset.index = i
    chip.dataset.word = w
    chip.textContent = w
    bank.appendChild(chip)
  })

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

  area.querySelectorAll('.answer-chip').forEach(c => c.remove())

  if (selectedWords.length === 0) {
    placeholder.style.display = 'block'
    return
  }

  placeholder.style.display = 'none'

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

    setTimeout(nextQuestion, 1200)
  } else {
    area.classList.add('answer-area--wrong')
    feedback.className = 'scramble-feedback scramble-feedback--wrong'
    const msg = document.createElement('span')
    msg.textContent = '❌ Chưa đúng — Đáp án: '
    const strong = document.createElement('strong')
    strong.textContent = sentence.textEN
    feedback.innerHTML = ''
    feedback.appendChild(msg)
    feedback.appendChild(strong)
    feedback.style.display = 'block'

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

  window.DailyDictStorage.recordScore(currentEx.id, pct)

  document.getElementById('result-emoji').textContent =
    pct >= 80 ? '🎉' : pct >= 50 ? '💪' : '📖'
  document.getElementById('result-title').textContent =
    pct >= 80 ? 'Xuất sắc!' : pct >= 50 ? 'Tốt lắm!' : 'Cần luyện thêm!'
  document.getElementById('result-score').textContent = `${correctCount} / ${total} câu đúng`
  document.getElementById('result-pct').textContent   = `${pct}%`

  document.getElementById('btn-retry').onclick = () => startExercise(currentEx)
  document.getElementById('btn-back-list').onclick = () => {
    showScreen('list')
    initList()
  }
}

// ── Utilities ──
function showScreen(name) {
  document.getElementById('screen-list').style.display   = name === 'list'   ? 'block' : 'none'
  document.getElementById('screen-game').style.display   = name === 'game'   ? 'block' : 'none'
  document.getElementById('screen-result').style.display = name === 'result' ? 'block' : 'none'

  if (name === 'list') {
    document.getElementById('header-title').textContent = 'Bài tập'
    document.getElementById('header-meta').textContent  = ''
    const backBtn = document.getElementById('back-btn')
    backBtn.textContent = '← Dashboard'
    backBtn.href = 'index.html'
    backBtn.onclick = null
  }
}

// ── Init & Events ──
document.addEventListener('DOMContentLoaded', () => {
  initList()

  document.getElementById('btn-check').addEventListener('click', checkAnswer)
  document.getElementById('btn-clear').addEventListener('click', () => {
    selectedWords.forEach(item => {
      const chip = document.querySelector(`.word-chip[data-index="${item.chipIndex}"]`)
      if (chip) { chip.disabled = false; chip.classList.remove('word-chip--used') }
    })
    selectedWords = []
    renderAnswerArea()
  })
})
