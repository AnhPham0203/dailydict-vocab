let currentWordId = null

async function init() {
  const params = new URLSearchParams(window.location.search)
  currentWordId = params.get('id')
  if (!currentWordId) { window.location.href = 'words.html'; return }

  const word = await window.DailyDictStorage.getWordById(currentWordId)
  if (!word) { window.location.href = 'words.html'; return }

  renderWordDetail(word)
  bindEvents(word)
}

function renderWordDetail(word) {
  document.getElementById('detail-word-title').textContent = word.word
  document.getElementById('detail-word').textContent = word.word
  document.getElementById('detail-phonetic').textContent = word.phonetic || ''
  document.getElementById('detail-vi').textContent = word.definitionVi || 'Chưa có nghĩa'
  document.getElementById('detail-en').textContent = word.definitionEn || ''

  if (word.example) {
    document.getElementById('section-example').style.display = 'block'
    document.getElementById('detail-example').textContent = `"${word.example}"`
  }

  if (word.sourceLesson && word.sourceUrl) {
    document.getElementById('section-source').style.display = 'block'
    const link = document.getElementById('detail-source-link')
    link.textContent = word.sourceLesson
    link.href = word.sourceUrl
  }

  document.getElementById('stat-reviews').textContent = word.reviewCount
  document.getElementById('stat-interval').textContent = Math.round(word.intervalDays)
  document.getElementById('stat-ease').textContent = word.easeFactor.toFixed(1)

  renderTags(word.tags || [])
}

function renderTags(tags) {
  const container = document.getElementById('detail-tags')
  if (tags.length === 0) {
    container.innerHTML = '<span style="font-size:13px; color:var(--c-text-4);">Chưa có tag nào</span>'
    return
  }
  container.innerHTML = tags.map(t => `
    <span class="detail-tag-pill">
      ${t}
      <button class="detail-tag-remove" data-tag="${t}">×</button>
    </span>`).join('')
}

function bindEvents(word) {
  // Audio
  document.getElementById('btn-play-audio').onclick = () => {
    const utter = new SpeechSynthesisUtterance(word.word)
    utter.lang = 'en-US'; utter.rate = 0.85; window.speechSynthesis.cancel(); window.speechSynthesis.speak(utter)
  }

  // Delete
  document.getElementById('btn-delete-word').onclick = async () => {
    if (confirm(`Xoá từ "${word.word}"?`)) {
      await window.DailyDictStorage.deleteWord(word.id)
      window.location.href = 'words.html'
    }
  }

  // Tag Management
  const tagInput = document.getElementById('detail-tag-input')
  const tagSugg = document.getElementById('detail-tag-sugg')

  tagInput.addEventListener('input', async () => {
    const q = tagInput.value.trim().toLowerCase()
    if (!q) { tagSugg.style.display = 'none'; return }
    const tags = await window.DailyDictStorage.getTagsWithCount()
    const matches = tags.filter(t => t.name.toLowerCase().includes(q))
    if (matches.length === 0) { tagSugg.style.display = 'none'; return }
    tagSugg.innerHTML = matches.slice(0, 5).map(t => `<div class="dd-sugg-item" data-name="${t.name}">${t.name} <span class="dd-sugg-count">${t.count}</span></div>`).join('')
    tagSugg.style.display = 'block'
  })

  tagInput.addEventListener('keydown', async (e) => {
    if (e.key === 'Enter') {
      const val = tagInput.value.trim(); if (!val) return
      await window.DailyDictStorage.addTagToWord(currentWordId, val)
      tagInput.value = ''; tagSugg.style.display = 'none'
      const updated = await window.DailyDictStorage.getWordById(currentWordId)
      renderTags(updated.tags)
    }
  })

  tagSugg.addEventListener('click', async (e) => {
    const item = e.target.closest('.dd-sugg-item'); if (!item) return
    await window.DailyDictStorage.addTagToWord(currentWordId, item.dataset.name)
    tagInput.value = ''; tagSugg.style.display = 'none'
    const updated = await window.DailyDictStorage.getWordById(currentWordId)
    renderTags(updated.tags)
  })

  document.getElementById('detail-tags').addEventListener('click', async (e) => {
    const btn = e.target.closest('.detail-tag-remove'); if (!btn) return
    await window.DailyDictStorage.removeTagFromWord(currentWordId, btn.dataset.tag)
    const updated = await window.DailyDictStorage.getWordById(currentWordId)
    renderTags(updated.tags)
  })
}

document.addEventListener('DOMContentLoaded', init)
