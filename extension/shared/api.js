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
      definitionViMain: translateResult.status === 'fulfilled' ? translateResult.value?.main || null : null,
      definitionViDict: translateResult.status === 'fulfilled' ? translateResult.value?.dict || null : null,
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
        `https://translate.googleapis.com/translate_a/single?client=gtx&sl=en&tl=vi&dt=t&dt=bd&q=${encodeURIComponent(word)}`,
        { signal: controller.signal }
      )
      if (!res.ok) return null
      const json = await res.json()

      // json[0][0][0] is the main translation
      const mainTranslation = json?.[0]?.[0]?.[0]
      if (!mainTranslation) return null

      // json[1] is the dictionary part (pos and alternative terms)
      let dictionary = []
      if (json?.[1]) {
        dictionary = json[1].map(item => ({
          pos: item[0], // part of speech (e.g., "noun", "verb")
          terms: item[1] // array of terms
        }))
      }

      return {
        main: mainTranslation,
        dict: dictionary.length > 0 ? dictionary : null
      }
    } catch (e) {
      console.error('Translate error:', e)
      return null
    }
  }
}