document.addEventListener('DOMContentLoaded', async () => {
  const stats = await window.DailyDictStorage.getStats()
  const words = await window.DailyDictStorage.getWords()

  // 1. Update Stats
  document.getElementById('total').textContent = stats.total
  document.getElementById('today').textContent = stats.todayCount
  document.getElementById('streak').textContent = stats.streak
  document.getElementById('today-badge').textContent = `${stats.todayCount} hôm nay`

  // 2. Render Last Word
  if (words.length > 0) {
    const lastWord = words[words.length - 1]
    document.getElementById('last-word').style.display = 'block'
    document.getElementById('empty-state').style.display = 'none'
    document.getElementById('lw-word').textContent = lastWord.word
    document.getElementById('lw-vi').textContent = lastWord.definitionVi || ''
  } else {
    document.getElementById('last-word').style.display = 'none'
    document.getElementById('empty-state').style.display = 'block'
  }

  // 3. Review Button Badge
  if (stats.dueCount > 0) {
    document.getElementById('btn-review').textContent = `Ôn tập ngay → (${stats.dueCount} từ)`
  }

  // 4. Navigation
  document.getElementById('btn-review').onclick = () => {
    chrome.tabs.create({ url: chrome.runtime.getURL('webapp/review.html') })
  }

  document.getElementById('btn-dashboard').onclick = () => {
    chrome.tabs.create({ url: chrome.runtime.getURL('webapp/index.html') })
  }
})