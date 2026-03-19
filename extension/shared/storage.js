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
      definitionVi: wordData.definitionViMain || null,
      definitionViDict: wordData.definitionViDict || null,
      example: wordData.example || null,
      sourceLesson: wordData.sourceLesson || null,
      sourceUrl: wordData.sourceUrl || null,
      createdAt: new Date().toISOString(),
      nextReviewAt: new Date(Date.now() + 86400000).toISOString(),
      intervalDays: 1,
      easeFactor: 2.5,
      reviewCount: 0,
      reviewGoodCount: 0, // BUG-02: Track good reviews for accurate retentionRate
      lastRating: null,
      tags: wordData.tags || [] // v1.3: Tags field
    }
    words.push(newWord)
    await chrome.storage.local.set({ dd_words: words })
    
    // v1.2 & v1.3: Robust post-save logic
    let newBadges = []
    let milestoneReached = null

    try {
      await this.checkAndSaveTodayGoal()
      newBadges = await this.checkAndUnlockBadges()
      
      const streak = await this.getCurrentStreak()
      const settings = await this.getSettings()
      const milestones = [7, 14, 30, 60, 100, 200, 365]
      
      if (milestones.includes(streak) && streak > (settings.lastStreakCelebration || 0)) {
        milestoneReached = streak
        await this.saveSettings({ lastStreakCelebration: streak })
      }
    } catch (e) {
      console.error('Post-save error:', e)
    }
    
    return { success: true, word: newWord, newBadges, milestoneReached }
  },

  async getWords() {
    return new Promise((resolve) => {
      chrome.storage.local.get('dd_words', (result) => {
        const words = result.dd_words || []
        // Ensure backward compatibility for tags and reviewGoodCount
        resolve(words.map(w => ({ 
          ...w, 
          tags: w.tags || [],
          reviewGoodCount: w.reviewGoodCount || 0 
        })))
      })
    })
  },

  async getWordById(id) {
    const words = await this.getWords()
    return words.find(w => w.id === id) || null
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
    // BUG-01: Update easeFactor according to SM-2
    if (rating === 'again') {
      intervalDays = 1
      easeFactor = Math.max(1.3, easeFactor - 0.2)
    } else if (rating === 'hard') {
      intervalDays = Math.max(1, intervalDays * 1.2)
      easeFactor = Math.max(1.3, easeFactor - 0.15)
    } else if (rating === 'good') {
      intervalDays = intervalDays * easeFactor
    } else if (rating === 'easy') {
      intervalDays = intervalDays * easeFactor * 1.3
      easeFactor = Math.min(4.0, easeFactor + 0.15)
    }

    word.intervalDays = Math.round(intervalDays * 10) / 10
    word.easeFactor = Math.round(easeFactor * 100) / 100
    word.nextReviewAt = new Date(Date.now() + intervalDays * 86400000).toISOString()
    word.reviewCount += 1
    word.lastRating = rating

    // BUG-02: Update good review count
    if (rating === 'good' || rating === 'easy') {
      word.reviewGoodCount = (word.reviewGoodCount || 0) + 1
    }

    await chrome.storage.local.set({ dd_words: words })
    
    // v1.2: Check badges after review
    await this.checkAndUnlockBadges()
  },

  async deleteWord(wordId) {
    const words = await this.getWords()
    const filtered = words.filter(w => w.id !== wordId)
    await chrome.storage.local.set({ dd_words: filtered })
  },

  // --- TAG CRUD (v1.3) ---
  async getTags() {
    return new Promise((resolve) => {
      chrome.storage.local.get('dd_tags', (result) => {
        resolve(result.dd_tags || [])
      })
    })
  },

  async createTag(name, color) {
    const tags = await this.getTags()
    const normalized = name.trim().split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ')
    
    if (tags.find(t => t.name.toLowerCase() === normalized.toLowerCase())) {
      return { success: false, reason: 'exists' }
    }

    const newTag = {
      id: 'tag-' + Math.random().toString(36).substring(2, 11),
      name: normalized,
      color: color || '#4F46E5',
      createdAt: new Date().toISOString()
    }
    tags.push(newTag)
    await chrome.storage.local.set({ dd_tags: tags })
    return { success: true, tag: newTag }
  },

  async deleteTag(tagId) {
    const tags = await this.getTags()
    const tagToDelete = tags.find(t => t.id === tagId)
    if (!tagToDelete) return

    // 1. Remove tag definition
    const filteredTags = tags.filter(t => t.id !== tagId)
    await chrome.storage.local.set({ dd_tags: filteredTags })

    // 2. Remove tag from all words
    const words = await this.getWords()
    const tagName = tagToDelete.name
    const updatedWords = words.map(w => ({
      ...w,
      tags: (w.tags || []).filter(t => t !== tagName)
    }))
    await chrome.storage.local.set({ dd_words: updatedWords })
  },

  async renameTag(tagId, newName) {
    const tags = await this.getTags()
    const tag = tags.find(t => t.id === tagId)
    if (!tag) return

    const oldName = tag.name
    const normalized = newName.trim().split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ')
    tag.name = normalized
    await chrome.storage.local.set({ dd_tags: tags })

    // Update all words with new tag name
    const words = await this.getWords()
    const updatedWords = words.map(w => ({
      ...w,
      tags: (w.tags || []).map(t => t === oldName ? normalized : t)
    }))
    await chrome.storage.local.set({ dd_words: updatedWords })
  },

  async addTagToWord(wordId, tagName) {
    const words = await this.getWords()
    const word = words.find(w => w.id === wordId)
    if (!word) return

    const normalized = tagName.trim().split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ')
    
    // Ensure word.tags exists
    if (!word.tags) word.tags = []
    
    // Check limit
    if (word.tags.length >= 10) return { success: false, reason: 'limit' }
    
    // Add if not exists
    if (!word.tags.includes(normalized)) {
      word.tags.push(normalized)
      await chrome.storage.local.set({ dd_words: words })
      
      // Auto create tag definition if not exists
      const tags = await this.getTags()
      if (!tags.find(t => t.name.toLowerCase() === normalized.toLowerCase())) {
        const randomColor = window.TAG_COLORS ? window.TAG_COLORS[Math.floor(Math.random() * window.TAG_COLORS.length)].hex : '#4F46E5'
        await this.createTag(normalized, randomColor)
      }
    }
    return { success: true }
  },

  async removeTagFromWord(wordId, tagName) {
    const words = await this.getWords()
    const word = words.find(w => w.id === wordId)
    if (!word) return

    word.tags = (word.tags || []).filter(t => t !== tagName)
    await chrome.storage.local.set({ dd_words: words })
  },

  async getTagsWithCount() {
    const words = await this.getWords()
    const tags = await this.getTags()
    
    const countMap = {}
    words.forEach(w => {
      (w.tags || []).forEach(t => {
        countMap[t] = (countMap[t] || 0) + 1
      })
    })

    return tags.map(t => ({
      ...t,
      count: countMap[t.name] || 0
    })).sort((a, b) => b.count - a.count)
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
    // BUG-02: Accurate good review count
    const goodReviews = words.reduce((sum, w) => sum + (w.reviewGoodCount || 0), 0)
    const retentionRate = totalReviews > 0 ? Math.round((goodReviews / totalReviews) * 100) : 0
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

    // Dùng date string (YYYY-MM-DD) thay vì timestamp để tránh lỗi timezone
    const uniqueDays = Array.from(
      new Set(words.map(w => w.createdAt.split('T')[0]))
    ).sort() // sort alphabetically = sort chronologically

    if (uniqueDays.length === 0) return 0

    let longest = 1
    let current = 1

    for (let i = 1; i < uniqueDays.length; i++) {
      const prev = new Date(uniqueDays[i - 1])
      const curr = new Date(uniqueDays[i])
      const diffDays = Math.round((curr - prev) / 86400000)

      if (diffDays === 1) {
        current++
        longest = Math.max(longest, current)
      } else {
        current = 1
      }
    }

    return longest
  },

  async getStats() {
    const words = await this.getWords()
    const now = new Date()
    const today = now.toDateString()

    const todayCount = words.filter(w => new Date(w.createdAt).toDateString() === today).length
    const dueCount = words.filter(w => new Date(w.nextReviewAt) <= now).length

    // Retention rate (v1.2 refined BUG-02)
    const totalReviews = words.reduce((sum, w) => sum + w.reviewCount, 0)
    const goodReviews = words.reduce((sum, w) => sum + (w.reviewGoodCount || 0), 0)
    const retentionRate = totalReviews > 0 ? Math.round((goodReviews / totalReviews) * 100) : 0

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
