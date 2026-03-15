// ── State ──
let queue       = []
let currentIdx  = 0
let correctCount = 0
let wrongWords  = []   // [{word, userInput, definitionVi}]
let attempts    = 0
let hintUsed    = false

// ── Init ──
async function init(wordList = null) {
  const allWords = await window.DailyDictStorage.getWords()

  if (wordList) {
    queue = wordList
  } else {
    // Ưu tiên từ đến hạn, fallback 15 từ mới nhất
    const due = allWords.filter(w => new Date(w.nextReviewAt) <= new Date())
    queue = due.length >= 3 ? due : allWords.slice(-15).reverse()
  }

  if (queue.length === 0) {
    document.getElementById('wp-card').innerHTML = '<div class="empty-state">Chưa có từ nào để luyện tập. Hãy lưu thêm từ mới nhé!</div>'
    return
  }

  queue = queue.sort(() => Math.random() - 0.5)
  showWord(0)
}

// ── Hiện từ ──
function showWord(idx) {
  if (idx >= queue.length) { showResult(); return }

  const word = queue[idx]
  attempts = 0
  hintUsed = false

  document.getElementById('wp-vi').textContent    = word.definitionVi || '(chưa có nghĩa)'
  document.getElementById('wp-en').textContent    = word.definitionEn || ''
  
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