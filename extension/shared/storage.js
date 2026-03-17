window.DailyDictStorage = {

  // --- CORE STORAGE ---
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
    
    // v1.2: Check goal & badges & milestones
    await this.checkAndSaveTodayGoal()
    const newBadges = await this.checkAndUnlockBadges()
    const streak = await this.getCurrentStreak()
    const settings = await this.getSettings()
    
    let milestoneReached = null
    const milestones = [7, 14, 30, 60, 100, 200, 365]
    if (milestones.includes(streak) && streak > (settings.lastStreakCelebration || 0)) {
      milestoneReached = streak
      await this.saveSettings({ lastStreakCelebration: streak })
    }
    
    return { success: true, word: newWord, newBadges, milestoneReached }
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
    
    // v1.2: Check badges after review
    await this.checkAndUnlockBadges()
  },

  async deleteWord(wordId) {
    const words = await this.getWords()
    const filtered = words.filter(w => w.id !== wordId)
    await chrome.storage.local.set({ dd_words: filtered })
  },

  // --- SETTINGS & DAILY GOAL (v1.2) ---
  async getSettings() {
    return new Promise((resolve) => {
      chrome.storage.local.get('dd_settings', (result) => {
        const defaultSettings = {
          dailyGoal: 10,
          goalHistory: {},
          lastStreakCelebration: 0
        }
        resolve(result.dd_settings ? { ...defaultSettings, ...result.dd_settings } : defaultSettings)
      })
    })
  },

  async saveSettings(settings) {
    const current = await this.getSettings()
    const updated = { ...current, ...settings }
    await chrome.storage.local.set({ dd_settings: updated })
    return updated
  },

  async getDailyGoal() {
    const settings = await this.getSettings()
    return settings.dailyGoal || 10
  },

  async setDailyGoal(n) {
    return await this.saveSettings({ dailyGoal: n })
  },

  async checkAndSaveTodayGoal() {
    const words = await this.getWords()
    const settings = await this.getSettings()
    const today = new Date().toISOString().split('T')[0]
    
    const todayCount = words.filter(w => new Date(w.createdAt).toISOString().split('T')[0] === today).length
    const goal = settings.dailyGoal || 10
    
    if (todayCount >= goal) {
      const goalHistory = { ...settings.goalHistory }
      if (!goalHistory[today]) {
        goalHistory[today] = true
        await this.saveSettings({ goalHistory })
      }
    }
  },

  // --- BADGES (v1.2) ---
  async getBadges() {
    return new Promise((resolve) => {
      chrome.storage.local.get('dd_badges', (result) => {
        resolve(result.dd_badges || [])
      })
    })
  },

  async checkAndUnlockBadges() {
    // Chỉ chạy nếu BADGE_DEFINITIONS tồn tại (đã load badges.js)
    if (!window.BADGE_DEFINITIONS) return []

    const words = await this.getWords()
    const badges = await this.getBadges()
    const settings = await this.getSettings()
    const unlockedIds = new Set(badges.map(b => b.id))

    const totalReviews = words.reduce((s, w) => s + w.reviewCount, 0)
    const goodReviews = words.filter(w => ['good', 'easy'].includes(w.lastRating)).length
    const retentionRate = totalReviews > 0 ? Math.round((goodReviews / Math.max(words.length, 1)) * 100) : 0
    const streak = await this.getCurrentStreak()
    const goalHistory = settings.goalHistory || {}
    const goalCompletedDays = Object.values(goalHistory).filter(Boolean).length

    const stats = {
      total: words.length,
      streak,
      totalReviews,
      retentionRate,
      goalCompletedDays,
    }

    const newBadges = []
    for (const def of window.BADGE_DEFINITIONS) {
      if (!unlockedIds.has(def.id) && def.check(stats)) {
        newBadges.push({
          id: def.id,
          unlockedAt: new Date().toISOString(),
          seen: false
        })
      }
    }

    if (newBadges.length > 0) {
      const all = [...badges, ...newBadges]
      await chrome.storage.local.set({ dd_badges: all })
      return newBadges
    }
    return []
  },

  async markBadgesSeen() {
    const badges = await this.getBadges()
    const updated = badges.map(b => ({ ...b, seen: true }))
    await chrome.storage.local.set({ dd_badges: updated })
  },

  async getUnseenBadges() {
    const badges = await this.getBadges()
    return badges.filter(b => !b.seen)
  },

  // --- HEATMAP & STREAK (v1.2) ---
  async getHeatmapData(days = 365) {
    const words = await this.getWords()
    const data = {}
    words.forEach(w => {
      const dateKey = new Date(w.createdAt).toISOString().split('T')[0]
      data[dateKey] = (data[dateKey] || 0) + 1
    })
    return data
  },

  async getCurrentStreak() {
    const words = await this.getWords()
    if (words.length === 0) return 0
    
    const today = new Date().toDateString()
    const yesterday = new Date(Date.now() - 86400000).toDateString()
    const days = new Set(words.map(w => new Date(w.createdAt).toDateString()))

    // Nếu cả hôm nay và hôm qua đều không có từ → streak = 0
    if (!days.has(today) && !days.has(yesterday)) return 0

    // Bắt đầu đếm ngược từ hôm nay hoặc hôm qua
    let streak = 0
    const start = days.has(today) ? new Date() : new Date(Date.now() - 86400000)
    const d = new Date(start)
    
    while (days.has(d.toDateString())) {
      streak++
      d.setDate(d.getDate() - 1)
    }
    return streak
  },

  async getLongestStreak() {
    const words = await this.getWords()
    if (words.length === 0) return 0
    
    const days = Array.from(new Set(words.map(w => new Date(w.createdAt).toDateString())))
      .map(d => new Date(d).getTime())
      .sort((a, b) => a - b)

    let longest = 0
    let current = 1
    
    for (let i = 1; i < days.length; i++) {
      const diff = days[i] - days[i-1]
      if (diff <= 86400000 * 1.1) { // Cho phép sai số nhỏ do toDateString
        current++
      } else {
        longest = Math.max(longest, current)
        current = 1
      }
    }
    return Math.max(longest, current)
  },

  async getStats() {
    const words = await this.getWords()
    const now = new Date()
    const today = now.toDateString()

    const todayCount = words.filter(w => new Date(w.createdAt).toDateString() === today).length
    const dueCount = words.filter(w => new Date(w.nextReviewAt) <= now).length

    // Retention rate (v1.2 refined)
    const totalReviews = words.reduce((sum, w) => sum + w.reviewCount, 0)
    const goodReviews = words.filter(w => w.lastRating === 'good' || w.lastRating === 'easy').length
    const retentionRate = totalReviews > 0 ? Math.round((goodReviews / Math.max(words.length, 1)) * 100) : 0

    const streak = await this.getCurrentStreak()

    return {
      total: words.length,
      todayCount,
      dueCount,
      retentionRate,
      streak
    }
  },

  async getTodayCount() {
    const words = await this.getWords()
    const today = new Date().toDateString()
    return words.filter(w => new Date(w.createdAt).toDateString() === today).length
  }
}
