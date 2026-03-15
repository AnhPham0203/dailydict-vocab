// ── State ──
let queue        = []
let currentIdx   = 0
let correctCount = 0
let streak       = 0
let wrongWords   = []
let answered     = false

// ── Init ──
async function init() {
  const allWords = await window.DailyDictStorage.getWords()

  if (allWords.length < 4) {
    document.querySelector('.container').innerHTML = `
      <div class="empty-state" style="padding: 60px 20px;">
        <div class="empty-emoji">🎯</div>
        <p>Cần ít nhất 4 từ trong kho để chơi trắc nghiệm.<br>Hãy lưu thêm từ mới nhé!</p>
        <a href="index.html" class="btn-primary" style="display:inline-block; margin-top:20px; text-decoration:none; width:auto; padding:12px 32px;">← Về Dashboard</a>
      </div>`
    return
  }

  // Lấy từ cần ôn, fallback 20 từ gần nhất
  const due = allWords.filter(w => new Date(w.nextReviewAt) <= new Date())
  queue = (due.length >= 4 ? due : allWords.slice(-20)).sort(() => Math.random() - 0.5)

  showQuestion(0)
}

// ── Tạo 4 lựa chọn ──
async function getChoices(correctWord) {
  const allWords = await window.DailyDictStorage.getWords()

  // Lấy các từ khác có nghĩa tiếng Việt
  const distractors = allWords
    .filter(w => w.id !== correctWord.id && (w.definitionVi || w.definitionEn))
    .sort(() => Math.random() - 0.5)
    .slice(0, 3)

  const choices = [
    { id: correctWord.id, text: correctWord.definitionVi || correctWord.definitionEn, correct: true },
    ...distractors.map(w => ({ id: w.id, text: w.definitionVi || w.definitionEn, correct: false }))
  ]

  return choices.sort(() => Math.random() - 0.5)
}

// ── Hiện câu hỏi ──
async function showQuestion(idx) {
  if (idx >= queue.length) { showDone(); return }

  answered = false
  const word = queue[idx]

  document.getElementById('quiz-word').textContent     = word.word
  document.getElementById('quiz-phonetic').textContent = word.phonetic || ''
  updateProgress(idx)

  const choices = await getChoices(word)
  const container = document.getElementById('quiz-choices')
  container.innerHTML = ''

  choices.forEach(choice => {
    const btn = document.createElement('button')
    btn.className = 'quiz-choice'
    btn.textContent = choice.text
    btn.dataset.correct = choice.correct
    
    btn.addEventListener('click', () => handleAnswer(btn, choice.correct))
    container.appendChild(btn)
  })
}

function handleAnswer(clickedBtn, isCorrect) {
  if (answered) return
  answered = true

  // Disable tất cả
  const allBtns = document.querySelectorAll('.quiz-choice')
  allBtns.forEach(b => b.disabled = true)

  if (isCorrect) {
    clickedBtn.classList.add('choice-correct')
    correctCount++
    streak++
  } else {
    clickedBtn.classList.add('choice-wrong')
    // Highlight câu đúng
    allBtns.forEach(b => {
      if (b.dataset.correct === 'true') b.classList.add('choice-correct')
    })
    wrongWords.push(queue[currentIdx])
    streak = 0
  }

  updateStreak()
  setTimeout(() => {
    currentIdx++
    showQuestion(currentIdx)
  }, isCorrect ? 1000 : 1800)
}

function updateStreak() {
  const el = document.getElementById('quiz-score-display')
  if (streak >= 3) {
    el.textContent = `${streak} đúng liên tiếp 🔥`
    el.style.color = '#D97706'
  } else {
    el.textContent = `${correctCount} đúng / ${currentIdx + (answered ? 1 : 0)} câu`
    el.style.color = 'var(--text-muted)'
  }
}

function updateProgress(idx) {
  const total = queue.length
  document.getElementById('quiz-progress').textContent = `${idx} / ${total}`
  document.getElementById('quiz-bar').style.width = `${(idx / total) * 100}%`
}

function showDone() {
  document.getElementById('quiz-card').style.display    = 'none'
  document.getElementById('quiz-choices').style.display = 'none'
  document.querySelector('.quiz-streak-row').style.display = 'none'

  const done = document.getElementById('quiz-done')
  done.style.display = 'flex'

  const total = queue.length
  const pct = Math.round((correctCount / total) * 100)

  document.getElementById('qdone-emoji').textContent = pct >= 80 ? '🎯' : pct >= 50 ? '💪' : '📖'
  document.getElementById('qdone-title').textContent = pct >= 80 ? 'Xuất sắc!' : pct >= 50 ? 'Tốt lắm!' : 'Cần ôn thêm!'
  document.getElementById('qdone-score').textContent = `${correctCount} / ${total} đúng`
  document.getElementById('qdone-pct').textContent   = `${pct}%`

  if (wrongWords.length > 0) {
    const html = wrongWords.map(w => `
      <div class="wrong-row">
        <span class="wrong-word">${w.word}</span>
        <span class="wrong-vi">${w.definitionVi || ''}</span>
      </div>
    `).join('')
    document.getElementById('qdone-wrongs').innerHTML = `<h3>Từ trả lời sai (${wrongWords.length}):</h3>${html}`
  } else {
    document.getElementById('qdone-wrongs').innerHTML = ''
  }
}

document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('btn-quiz-again').addEventListener('click', () => {
    correctCount = 0; streak = 0; wrongWords = []; currentIdx = 0
    document.getElementById('quiz-done').style.display = 'none'
    document.getElementById('quiz-card').style.display = 'block'
    document.getElementById('quiz-choices').style.display = 'grid'
    document.querySelector('.quiz-streak-row').style.display = 'flex'
    init()
  })

  init()
})