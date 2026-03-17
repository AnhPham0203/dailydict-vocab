// ── State ──
let queue        = []
let currentIdx   = 0
let correctCount = 0
let streak       = 0
let wrongWords   = []
let answered     = false

// v1.3: Setup State
let setupSource = 'due'    // 'due' | 'all' | 'lesson' | 'tag'
let setupLesson = ''
let setupTag    = ''
let setupSize   = 20       // số từ mỗi session, 0 = tất cả
let fullPool    = []       // toàn bộ từ khớp filter
let batchOffset = 0        // vị trí batch hiện tại

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

// ── Init Setup Screen ──
async function initSetup() {
  try {
    const allWords = await window.DailyDictStorage.getWords()

    // Populate lesson dropdown
    const lessons = Array.from(new Set(allWords.map(w => w.sourceLesson).filter(Boolean))).sort()
    const lessonSelect = document.getElementById('setup-lesson-select')
    lessons.forEach(l => {
      const opt = document.createElement('option'); opt.value = l; opt.textContent = l
      lessonSelect.appendChild(opt)
    })

    // Populate tag dropdown
    const tags = await window.DailyDictStorage.getTagsWithCount()
    const tagSelect = document.getElementById('setup-tag-select')
    tags.forEach(t => {
      const opt = document.createElement('option'); opt.value = t.name; opt.textContent = `${t.name} (${t.count} từ)`
      tagSelect.appendChild(opt)
    })

    // Source chip click
    document.getElementById('setup-source-chips').addEventListener('click', (e) => {
      const chip = e.target.closest('.setup-chip'); if (!chip) return
      document.querySelectorAll('#setup-source-chips .setup-chip').forEach(c => c.classList.remove('setup-chip--active'))
      chip.classList.add('setup-chip--active'); setupSource = chip.dataset.source
      document.getElementById('setup-lesson-group').style.display = setupSource === 'lesson' ? 'block' : 'none'
      document.getElementById('setup-tag-group').style.display = setupSource === 'tag' ? 'block' : 'none'
      updatePreview()
    })

    // Size chip click
    document.getElementById('setup-size-chips').addEventListener('click', (e) => {
      const chip = e.target.closest('.setup-chip'); if (!chip) return
      document.querySelectorAll('#setup-size-chips .setup-chip').forEach(c => c.classList.remove('setup-chip--active'))
      chip.classList.add('setup-chip--active'); setupSize = parseInt(chip.dataset.size)
      updatePreview()
    })

    document.getElementById('setup-lesson-select').addEventListener('change', (e) => { setupLesson = e.target.value; updatePreview() })
    document.getElementById('setup-tag-select').addEventListener('change', (e) => { setupTag = e.target.value; updatePreview() })

    document.getElementById('btn-start-quiz').addEventListener('click', () => {
      if (fullPool.length === 0) return
      batchOffset = 0; startSession()
    })

    updatePreview()
  } catch (err) { console.error('Setup init error:', err); showGlobalError() }
}

async function getFilteredPool() {
  const allWords = await window.DailyDictStorage.getWords(), now = new Date()
  let pool = []
  if (setupSource === 'due') {
    pool = allWords.filter(w => new Date(w.nextReviewAt) <= now)
    if (pool.length < 4) pool = allWords.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)).slice(0, 20)
  } else if (setupSource === 'all') { pool = allWords }
  else if (setupSource === 'lesson') { pool = setupLesson ? allWords.filter(w => w.sourceLesson === setupLesson) : [] }
  else if (setupSource === 'tag') { pool = setupTag ? allWords.filter(w => (w.tags || []).includes(setupTag)) : [] }
  return pool.filter(w => w.definitionVi || w.definitionEn)
}

async function updatePreview() {
  fullPool = await getFilteredPool()
  const count = fullPool.length, btn = document.getElementById('btn-start-quiz')
  document.getElementById('setup-preview-count').textContent = count
  if (count < 4) { btn.disabled = true; document.getElementById('setup-preview-count').textContent = `${count} (cần ít nhất 4)` }
  else { btn.disabled = false }
}

function startSession() {
  const size = setupSize === 0 ? fullPool.length : setupSize
  queue = fullPool.slice(batchOffset, batchOffset + size).sort(() => Math.random() - 0.5)
  document.getElementById('quiz-setup').style.display = 'none'
  document.getElementById('quiz-game').style.display = 'block'
  currentIdx = 0; correctCount = 0; streak = 0; wrongWords = []; answered = false
  showQuestion(0)
}

// ── Tạo 4 lựa chọn ──
async function getChoices(correctWord) {
  const allWords = await window.DailyDictStorage.getWords()
  const distractors = allWords.filter(w => w.id !== correctWord.id && (w.definitionVi || w.definitionEn)).sort(() => Math.random() - 0.5).slice(0, 3)
  const choices = [{ id: correctWord.id, text: correctWord.definitionVi || correctWord.definitionEn, correct: true }, ...distractors.map(w => ({ id: w.id, text: w.definitionVi || w.definitionEn, correct: false }))]
  return choices.sort(() => Math.random() - 0.5)
}

// ── Hiện câu hỏi ──
async function showQuestion(idx) {
  if (idx >= queue.length) { showDone(); return }
  answered = false; const word = queue[idx]
  document.getElementById('quiz-word').textContent = word.word
  document.getElementById('quiz-phonetic').textContent = word.phonetic || ''
  updateProgress(idx)
  const utter = new SpeechSynthesisUtterance(word.word); utter.lang = 'en-US'; utter.rate = 0.85; window.speechSynthesis.cancel(); window.speechSynthesis.speak(utter)
  const choices = await getChoices(word), container = document.getElementById('quiz-choices')
  container.innerHTML = ''
  choices.forEach(choice => {
    const btn = document.createElement('button'); btn.className = 'quiz-choice'; btn.textContent = choice.text; btn.dataset.correct = choice.correct
    btn.addEventListener('click', () => handleAnswer(btn, choice.correct)); container.appendChild(btn)
  })
}

function handleAnswer(clickedBtn, isCorrect) {
  if (answered) return
  answered = true; document.querySelectorAll('.quiz-choice').forEach(b => b.disabled = true)
  if (isCorrect) { clickedBtn.classList.add('choice-correct'); correctCount++; streak++ }
  else { clickedBtn.classList.add('choice-wrong'); document.querySelectorAll('.quiz-choice').forEach(b => { if (b.dataset.correct === 'true') b.classList.add('choice-correct') }); wrongWords.push(queue[currentIdx]); streak = 0 }
  updateStreak()
  setTimeout(() => { currentIdx++; showQuestion(currentIdx) }, isCorrect ? 1000 : 1800)
}

function updateStreak() {
  const el = document.getElementById('quiz-score-display')
  if (streak >= 3) { el.textContent = `${streak} đúng liên tiếp 🔥`; el.style.color = 'var(--c-streak)' }
  else { el.textContent = `${correctCount} đúng / ${currentIdx + (answered ? 1 : 0)} câu`; el.style.color = 'var(--c-text-3)' }
}

function updateProgress(idx) {
  const total = queue.length
  document.getElementById('quiz-progress').textContent = `${idx} / ${total}`
  document.getElementById('quiz-bar').style.width = `${(idx / total) * 100}%`
}

function showDone() {
  document.getElementById('quiz-card').style.display = 'none'; document.getElementById('quiz-choices').style.display = 'none'; document.querySelector('.quiz-streak-row').style.display = 'none'
  document.getElementById('quiz-done').style.display = 'flex'
  const total = queue.length, pct = Math.round((correctCount / total) * 100)
  document.getElementById('qdone-emoji').textContent = pct >= 80 ? '🎯' : pct >= 50 ? '💪' : '📖'
  document.getElementById('qdone-title').textContent = pct >= 80 ? 'Xuất sắc!' : pct >= 50 ? 'Tốt lắm!' : 'Cần ôn thêm!'
  document.getElementById('qdone-score').textContent = `${correctCount} / ${total} đúng`; document.getElementById('qdone-pct').textContent = `${pct}%`
  if (wrongWords.length > 0) {
    const html = wrongWords.map(w => `<div class="wrong-row"><span class="wrong-word">${w.word}</span><span class="wrong-vi">${w.definitionVi || ''}</span></div>`).join('')
    document.getElementById('qdone-wrongs').innerHTML = `<h3>Từ trả lời sai (${wrongWords.length}):</h3>${html}`
  } else { document.getElementById('qdone-wrongs').innerHTML = '' }

  // Continue Button Logic
  const sessionSize = setupSize === 0 ? fullPool.length : setupSize, nextOffset = batchOffset + sessionSize, remaining = fullPool.length - nextOffset
  const continueBtn = document.getElementById('btn-continue-quiz'), continueText = document.getElementById('btn-continue-count')
  if (continueBtn) {
    if (remaining > 0) {
      continueBtn.style.display = 'flex'; continueText.textContent = `Còn ${remaining} từ`
      continueBtn.onclick = () => { batchOffset = nextOffset; document.getElementById('quiz-done').style.display = 'none'; document.getElementById('quiz-card').style.display = 'block'; document.getElementById('quiz-choices').style.display = 'grid'; document.querySelector('.quiz-streak-row').style.display = 'flex'; startSession() }
    } else { continueBtn.style.display = 'none' }
  }
}

document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('btn-quiz-again').addEventListener('click', () => {
    document.getElementById('quiz-done').style.display = 'none'; document.getElementById('quiz-game').style.display = 'none'; document.getElementById('quiz-setup').style.display = 'block'; batchOffset = 0; updatePreview()
  })
  initSetup()
})
