window.DailyDictStorage = {

  async saveWord(wordData) {
    const words = await this.getWords()
    // Check trùng
    const exists = words.find(w => w.word.toLowerCase() === wordData.word.toLowerCase())
    if (exists) return { success: false, reason: 'duplicate' }

    const newWord = {
      id: typeof crypto.randomUUID === 'function' ? crypto.randomUUID() : Math.random().toString(36).substring(2, 15),
      word: wordData.word,
      phonetic: wordData.phonetic || null,
      definitionEn: wordData.definitionEn || null,
      definitionVi: wordData.definitionVi || null,
      example: wordData.example || null,
      sourceLesson: wordData.sourceLesson || null,
      sourceUrl: wordData.sourceUrl || null,
      createdAt: new Date().toISOString(),
      nextReviewAt: new Date(Date.now() + 86400000).toISOString(),
      intervalDays: 1,
      easeFactor: 2.5,
      reviewCount: 0,
      lastRating: null
    }
    words.push(newWord)
    await chrome.storage.local.set({ dd_words: words })
    return { success: true, word: newWord }
  },

  async getWords() {
    return new Promise((resolve) => {
      chrome.storage.local.get('dd_words', (result) => {
        resolve(result.dd_words || [])
      })
    })
  },

  async getWordsDueToday() {
    const words = await this.getWords()
    const now = new Date()
    return words.filter(w => new Date(w.nextReviewAt) <= now)
  },

  async updateReview(wordId, rating) {
    const words = await this.getWords()
    const word = words.find(w => w.id === wordId)
    if (!word) return

    let { intervalDays, easeFactor } = word
    if (rating === 'again') intervalDays = 1
    else if (rating === 'hard') intervalDays = Math.max(1, intervalDays * 1.2)
    else if (rating === 'good') intervalDays = intervalDays * easeFactor
    else if (rating === 'easy') {
      intervalDays = intervalDays * easeFactor * 1.3
      easeFactor = Math.min(4.0, easeFactor + 0.15)
    }

    word.intervalDays = Math.round(intervalDays * 10) / 10
    word.easeFactor = Math.round(easeFactor * 100) / 100
    word.nextReviewAt = new Date(Date.now() + intervalDays * 86400000).toISOString()
    word.reviewCount += 1
    word.lastRating = rating

    await chrome.storage.local.set({ dd_words: words })
  },

  async deleteWord(wordId) {
    const words = await this.getWords()
    const filtered = words.filter(w => w.id !== wordId)
    await chrome.storage.local.set({ dd_words: filtered })
  },

  async getStats() {
    const words = await this.getWords()
    const now = new Date()
    const today = now.toDateString()

    const todayCount = words.filter(w => new Date(w.createdAt).toDateString() === today).length
    const dueCount = words.filter(w => new Date(w.nextReviewAt) <= now).length

    // Retention rate
    const totalReviews = words.reduce((sum, w) => sum + w.reviewCount, 0)
    const goodReviews = words.filter(w => w.lastRating === 'good' || w.lastRating === 'easy').length
    const retentionRate = words.length > 0 ? Math.round((goodReviews / words.length) * 100) : 0

    // Streak
    const streak = this._calcStreak(words)

    return {
      total: words.length,
      todayCount,
      dueCount,
      retentionRate,
      streak
    }
  },

  _calcStreak(words) {
    if (words.length === 0) return 0
    const days = new Set(words.map(w => new Date(w.createdAt).toDateString()))
    let streak = 0
    const d = new Date()
    while (days.has(d.toDateString())) {
      streak++
      d.setDate(d.getDate() - 1)
    }
    return streak
  }
}