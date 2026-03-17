// --- REVIEW APP LOGIC ---
let queue = []
let currentIndex = 0
let flipped = false
let reviewedCount = 0

function playAudio(word) {
  if (!word) return
  const utter = new SpeechSynthesisUtterance(word)
  utter.lang = 'en-US'
  utter.rate = 0.85
  window.speechSynthesis.cancel()
  window.speechSynthesis.speak(utter)
}

async function initReview() {
  try {
    document.getElementById('rate-again')?.addEventListener('click', () => rate('again'))
    document.getElementById('rate-hard')?.addEventListener('click', () => rate('hard'))
    document.getElementById('rate-good')?.addEventListener('click', () => rate('good'))
    document.getElementById('rate-easy')?.addEventListener('click', () => rate('easy'))
    document.getElementById('card')?.addEventListener('click', flipCard)
    document.getElementById('btn-audio-review')?.addEventListener('click', (e) => {
      e.stopPropagation(); if (queue[currentIndex]) playAudio(queue[currentIndex].word)
    })
    
    queue = await window.DailyDictStorage.getWordsDueToday()
    if (queue.length === 0) {
      const allWords = await window.DailyDictStorage.getWords()
      if (allWords.length === 0) { showDone(0); return }
      queue = allWords.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)).slice(0, 10)
    }
    showCard(0)
  } catch (err) {
    console.error('Review init error:', err)
    if (typeof showGlobalError === 'function') showGlobalError()
  }
}

function showCard(index) {
  if (index >= queue.length) { showDone(reviewedCount); return }
  flipped = false; const word = queue[index]
  const cardFront = document.getElementById('card-front'), cardBack = document.getElementById('card-back'), ratingRow = document.getElementById('rating-row')
  
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
  flipped = true; document.getElementById('card-front').style.display = 'none'
  document.getElementById('card-back').style.display = 'block'; document.getElementById('rating-row').style.display = 'grid'
  if (queue[currentIndex]) playAudio(queue[currentIndex].word)
}

async function rate(rating) {
  if (!flipped) return
  const word = queue[currentIndex]
  await window.DailyDictStorage.updateReview(word.id, rating)
  reviewedCount++; currentIndex++; showCard(currentIndex)
}

function updateProgress() {
  const pct = (currentIndex / queue.length) * 100
  const fill = document.getElementById('progress-fill'), text = document.getElementById('progress-text')
  if (fill) fill.style.width = `${pct}%`
  if (text) text.textContent = `${currentIndex} / ${queue.length}`
}

function showDone(count) {
  const cardContainer = document.getElementById('card-container'), ratingRow = document.getElementById('rating-row')
  const done = document.getElementById('done-screen'), doneText = document.getElementById('done-text')
  if (cardContainer) cardContainer.style.display = 'none'
  if (ratingRow) ratingRow.style.display = 'none'
  if (done) done.style.display = 'flex'
  if (doneText) doneText.textContent = count > 0 ? `Bạn đã ôn tập xong ${count} từ cho ngày hôm nay.` : "Hôm nay bạn không có từ nào cần ôn tập. Hãy lưu thêm từ mới nhé!"
}

document.addEventListener('DOMContentLoaded', () => {
  initReview()
  document.addEventListener('keydown', (e) => {
    if (e.code === 'Space' || e.key === 'Enter') { e.preventDefault(); flipCard() }
    if (flipped) {
      if (e.key === '1') rate('again')
      if (e.key === '2') rate('hard')
      if (e.key === '3') rate('good')
      if (e.key === '4') rate('easy')
    }
  })
})
