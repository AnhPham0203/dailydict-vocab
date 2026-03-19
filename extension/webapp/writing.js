// ── State ──
let queue       = []
let currentIdx  = 0
let correctCount = 0
let wrongWords  = []   // [{word, userInput, definitionVi}]
let attempts    = 0
let hintUsed    = false

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

    document.getElementById('btn-start-writing').addEventListener('click', () => {
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
    if (pool.length < 3) pool = allWords.slice(-15).reverse()
  } else if (setupSource === 'all') { pool = allWords }
  else if (setupSource === 'lesson') { pool = setupLesson ? allWords.filter(w => w.sourceLesson === setupLesson) : [] }
  else if (setupSource === 'tag') { pool = setupTag ? allWords.filter(w => (w.tags || []).includes(setupTag)) : [] }
  return pool
}

async function updatePreview() {
  fullPool = await getFilteredPool()
  const count = fullPool.length, btn = document.getElementById('btn-start-writing')
  document.getElementById('setup-preview-count').textContent = count
  btn.disabled = count === 0
}

function startSession() {
  const size = setupSize === 0 ? fullPool.length : setupSize
  queue = fullPool.slice(batchOffset, batchOffset + size).sort(() => Math.random() - 0.5)
  document.getElementById('writing-setup').style.display = 'none'
  document.getElementById('writing-game').style.display  = 'block'
  currentIdx = 0; correctCount = 0; wrongWords = []; answered = false
  showWord(0)
}

// ── Hiện từ ──
function showWord(idx) {
  if (idx >= queue.length) { showResult(); return }

  const word = queue[idx]
  attempts = 0
  hintUsed = false

  document.getElementById('wp-vi').textContent    = word.definitionVi || '(chưa có nghĩa)'
  
  const enEl = document.getElementById('wp-en')
  if (enEl) {
    enEl.style.display = 'none'
    enEl.textContent = ''
  }
  
  const input = document.getElementById('wp-input')
  input.value = ''
  input.className = ''
  input.disabled = false
  
  document.getElementById('wp-feedback').style.display = 'none'
  input.focus()
  updateProgress(idx)
  
  playAudio()
  // FIX-06: Auto-focus after audio start
  setTimeout(() => document.getElementById('wp-input')?.focus(), 100)
}

// ── Kiểm tra đáp án ──
function checkAnswer() {
  const word    = queue[currentIdx]
  const inputEl = document.getElementById('wp-input')
  const input   = inputEl.value.trim().toLowerCase()
  const correct = word.word.toLowerCase()

  if (input === correct) {
    showFeedback('correct', `✅ Chính xác! "${word.word}"`)
    inputEl.classList.add('correct')
    inputEl.disabled = true
    correctCount++
    setTimeout(() => { currentIdx++; showWord(currentIdx) }, 1200)
  } else {
    attempts++
    if (attempts >= 2) {
      showFeedback('wrong-final', `❌ Đáp án: "${word.word}"`)
      inputEl.classList.add('wrong')
      inputEl.disabled = true
      wrongWords.push({ word: word.word, userInput: input || '(trống)', definitionVi: word.definitionVi })
      setTimeout(() => { currentIdx++; showWord(currentIdx) }, 2000)
    } else {
      showFeedback('wrong-retry', `❌ Chưa đúng, hãy thử lại...`)
      inputEl.classList.add('wrong')
      setTimeout(() => {
        inputEl.classList.remove('wrong')
        inputEl.value = ''
        inputEl.focus()
        document.getElementById('wp-feedback').style.display = 'none'
      }, 800)
    }
  }
}

function showFeedback(type, text) {
  const fb = document.getElementById('wp-feedback')
  fb.textContent = text
  fb.className = `wp-feedback ${type}`
  fb.style.display = 'block'
}

function playAudio() {
  const word = queue[currentIdx]?.word
  if (!word) return
  const utter = new SpeechSynthesisUtterance(word)
  utter.lang = 'en-US'; utter.rate = 0.8; window.speechSynthesis.cancel(); window.speechSynthesis.speak(utter)
}

function updateProgress(idx) {
  const total = queue.length
  const pct = (idx / total) * 100
  document.getElementById('wp-bar').style.width = `${pct}%`
  document.getElementById('wp-progress').textContent = `${idx} / ${total}`
}

function showResult() {
  document.getElementById('wp-card').style.display = 'none'
  document.getElementById('wp-result').style.display = 'flex'

  const total = queue.length, pct = Math.round((correctCount / total) * 100)
  document.getElementById('result-emoji').textContent = pct >= 80 ? '🎉' : pct >= 50 ? '💪' : '📖'
  document.getElementById('result-title').textContent = pct >= 80 ? 'Xuất sắc!' : pct >= 50 ? 'Khá tốt!' : 'Cần luyện thêm!'
  document.getElementById('result-score').textContent = `${correctCount} / ${total} đúng`
  document.getElementById('result-pct').textContent   = `${pct}%`

  if (wrongWords.length > 0) {
    const html = wrongWords.map(w => `<div class="wrong-row"><span class="wrong-word">${w.word}</span><span class="wrong-vi">${w.definitionVi || ''}</span><span class="wrong-input">Bạn đã gõ: "${w.userInput}"</span></div>`).join('')
    document.getElementById('result-wrongs').innerHTML = `<h3>Từ cần luyện thêm (${wrongWords.length}):</h3>${html}`
  } else { document.getElementById('result-wrongs').innerHTML = '' }

  // Continue Button Logic
  const sessionSize = setupSize === 0 ? fullPool.length : setupSize, nextOffset = batchOffset + sessionSize, remaining = fullPool.length - nextOffset
  const continueBtn = document.getElementById('btn-continue-writing'), continueText = document.getElementById('btn-continue-count')
  if (continueBtn) {
    if (remaining > 0) {
      continueBtn.style.display = 'flex'; continueText.textContent = `Còn ${remaining} từ`
      continueBtn.onclick = () => { batchOffset = nextOffset; document.getElementById('wp-result').style.display = 'none'; document.getElementById('wp-card').style.display = 'flex'; startSession() }
    } else { continueBtn.style.display = 'none' }
  }
}

// ── Event listeners ──
document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('wp-check-btn').addEventListener('click', checkAnswer)
  document.getElementById('wp-audio-btn').addEventListener('click', playAudio)
  
  document.getElementById('btn-show-phonetic').addEventListener('click', () => {
    const word = queue[currentIdx]; if (word?.phonetic) showFeedback('hint', `💡 Phonetic: ${word.phonetic}`)
  })

  document.getElementById('btn-show-en')?.addEventListener('click', () => {
    const word = queue[currentIdx], el = document.getElementById('wp-en')
    if (el && word?.definitionEn) { el.textContent = word.definitionEn; el.style.display = 'block' }
  })

  document.getElementById('btn-skip').addEventListener('click', () => {
    wrongWords.push({ word: queue[currentIdx].word, userInput: '(bỏ qua)', definitionVi: queue[currentIdx].definitionVi }); currentIdx++; showWord(currentIdx)
  })

  document.getElementById('wp-input').addEventListener('keydown', (e) => { if (e.key === 'Enter') checkAnswer() })

  document.getElementById('btn-retry-wrongs').addEventListener('click', () => {
    document.getElementById('wp-result').style.display = 'none'; document.getElementById('writing-game').style.display = 'none'; document.getElementById('writing-setup').style.display = 'block'; batchOffset = 0; updatePreview()
  })

  initSetup()
})
