window.DailyDictAPI = {
  async fetchWordData(word) {
    // 1. Check cache
    const cacheKey = 'dd_cache_' + word.toLowerCase()
    const cached = sessionStorage.getItem(cacheKey)
    if (cached) {
      const parsed = JSON.parse(cached)
      if (Date.now() - parsed.ts < 3600000) return parsed.data  // 1 giờ
    }

    // 2. Gọi 2 API song song
    const [dictResult, translateResult] = await Promise.allSettled([
      this._fetchDict(word),
      this._fetchTranslate(word)
    ])

    // 3. Merge kết quả
    const data = {
      word,
      phonetic: dictResult.status === 'fulfilled' ? dictResult.value?.phonetic : null,
      definitionEn: dictResult.status === 'fulfilled' ? dictResult.value?.definitionEn : null,
      example: dictResult.status === 'fulfilled' ? dictResult.value?.example : null,
      definitionVi: translateResult.status === 'fulfilled' ? translateResult.value : null,
    }

    // 4. Cache
    sessionStorage.setItem(cacheKey, JSON.stringify({ ts: Date.now(), data }))
    return data
  },

  async _fetchDict(word) {
    const controller = new AbortController()
    setTimeout(() => controller.abort(), 5000)
    try {
      const res = await fetch(
        `https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(word)}`,
        { signal: controller.signal }
      )
      if (!res.ok) return null
      const json = await res.json()
      return {
        phonetic: json[0]?.phonetic || json[0]?.phonetics?.[0]?.text || null,
        definitionEn: json[0]?.meanings?.[0]?.definitions?.[0]?.definition || null,
        example: json[0]?.meanings?.[0]?.definitions?.[0]?.example || null,
      }
    } catch (e) {
      return null
    }
  },

  async _fetchTranslate(word) {
    const controller = new AbortController()
    setTimeout(() => controller.abort(), 5000)
    try {
      const res = await fetch(
        `https://api.mymemory.translated.net/get?q=${encodeURIComponent(word)}&langpair=en|vi`,
        { signal: controller.signal }
      )
      if (!res.ok) return null
      const json = await res.json()
      return json?.responseData?.translatedText || null
    } catch (e) {
      return null
    }
  }
}