// ── State ──
let queue       = []
let currentIdx  = 0
let correctCount = 0
let wrongWords  = []   // [{word, userInput, definitionVi}]
let attempts    = 0
let hintUsed    = false

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

// ── Init ──
async function init(wordList = null) {
  try {
    const allWords = await window.DailyDictStorage.getWords()

    if (wordList) {
      queue = wordList
    } else {
      // Ưu tiên từ đến hạn, fallback 15 từ mới nhất
      const due = allWords.filter(w => new Date(w.nextReviewAt) <= new Date())
      queue = due.length >= 3 ? due : allWords.slice(-15).reverse()
    }

    if (queue.length === 0) {
      document.getElementById('wp-card').innerHTML = '<div class="empty-state"><div class="empty-state__circle"><span class="empty-state__icon">✍️</span></div><h3 class="empty-state__title">Chưa có từ vựng</h3><p class="empty-state__desc">Lưu thêm từ mới để bắt đầu luyện viết nhé!</p></div>'
      return
    }

    queue = queue.sort(() => Math.random() - 0.5)
    showWord(0)
  } catch (err) {
    console.error('Writing init error:', err)
    showGlobalError()
  }
}

// ── Hiện từ ──
function showWord(idx) {
  if (idx >= queue.length) { showResult(); return }

  const word = queue[idx]
  attempts = 0
  hintUsed = false

  document.getElementById('wp-vi').textContent    = word.definitionVi || '(chưa có nghĩa)'
  
  // BUG-04: Hide EN by default and reset
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
  
  // Tự động phát âm
  playAudio()
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

// ── Audio (Web Speech API) ──
function playAudio() {
  const word = queue[currentIdx]?.word
  if (!word) return
  const utter = new SpeechSynthesisUtterance(word)
  utter.lang = 'en-US'
  utter.rate = 0.8
  window.speechSynthesis.cancel()
  window.speechSynthesis.speak(utter)
}

function updateProgress(idx) {
  const total = queue.length
  const pct = (idx / total) * 100
  document.getElementById('wp-bar').style.width = `${pct}%`
  document.getElementById('wp-progress').textContent = `${idx} / ${total}`
}

function showResult() {
  document.getElementById('wp-card').style.display = 'none'
  const result = document.getElementById('wp-result')
  result.style.display = 'flex'

  const total = queue.length
  const pct = Math.round((correctCount / total) * 100)

  document.getElementById('result-emoji').textContent = pct >= 80 ? '🎉' : pct >= 50 ? '💪' : '📖'
  document.getElementById('result-title').textContent = pct >= 80 ? 'Xuất sắc!' : pct >= 50 ? 'Khá tốt!' : 'Cần luyện thêm!'
  document.getElementById('result-score').textContent = `${correctCount} / ${total} đúng`
  document.getElementById('result-pct').textContent   = `${pct}%`

  if (wrongWords.length > 0) {
    const html = wrongWords.map(w => `
      <div class="wrong-row">
        <span class="wrong-word">${w.word}</span>
        <span class="wrong-vi">${w.definitionVi || ''}</span>
        <span class="wrong-input">Bạn đã gõ: "${w.userInput}"</span>
      </div>
    `).join('')
    document.getElementById('result-wrongs').innerHTML = `<h3>Từ cần luyện thêm (${wrongWords.length}):</h3>${html}`
  } else {
    document.getElementById('result-wrongs').innerHTML = ''
  }
}

// ── Event listeners ──
document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('wp-check-btn').addEventListener('click', checkAnswer)
  document.getElementById('wp-audio-btn').addEventListener('click', playAudio)
  
  document.getElementById('btn-show-phonetic').addEventListener('click', () => {
    const word = queue[currentIdx]
    if (word?.phonetic) {
      showFeedback('hint', `💡 Phonetic: ${word.phonetic}`)
    }
  })

  // BUG-04: Show EN definition hint
  document.getElementById('btn-show-en')?.addEventListener('click', () => {
    const word = queue[currentIdx]
    const el = document.getElementById('wp-en')
    if (el && word?.definitionEn) {
      el.textContent = word.definitionEn
      el.style.display = 'block'
    }
  })

  document.getElementById('btn-skip').addEventListener('click', () => {
    wrongWords.push({ word: queue[currentIdx].word, userInput: '(bỏ qua)', definitionVi: queue[currentIdx].definitionVi })
    currentIdx++
    showWord(currentIdx)
  })

  document.getElementById('wp-input').addEventListener('keydown', (e) => {
    if (e.key === 'Enter') checkAnswer()
  })

  document.getElementById('btn-retry-wrongs').addEventListener('click', () => {
    const retryList = wrongWords.map(w => queue.find(q => q.word === w.word)).filter(Boolean)
    correctCount = 0
    wrongWords = []
    currentIdx = 0
    document.getElementById('wp-result').style.display = 'none'
    document.getElementById('wp-card').style.display = 'flex'
    init(retryList)
  })

  init()
})
