;(function () {

  // ── Click tab "Full transcript" để render toàn bộ câu ──
  async function clickFullTranscriptTab() {
    const tabs = document.querySelectorAll('[role="tab"], button, .tab')
    const fullTab = Array.from(tabs).find(el =>
      el.textContent.trim().toLowerCase().includes('full transcript')
    )
    if (fullTab) {
      fullTab.click()
      await new Promise(resolve => setTimeout(resolve, 800))
      return true
    }
    return false
  }

  // ── Tìm container chứa Full transcript ──
  function findContainerWithManyFS() {
    let best = null
    let bestCount = 0
    document.querySelectorAll('div, section, article').forEach(container => {
      const count = container.querySelectorAll('.fs-4, .fs-6').length
      if (count > bestCount && count >= 2 && container !== document.body) {
        bestCount = count
        best = container
      }
    })
    return best
  }

  function findTranscriptContainer() {
    const candidates = [
      document.querySelector('[class*="transcript"]'),
      document.querySelector('[class*="full-transcript"]'),
      document.querySelector('[class*="FullTranscript"]'),
      findContainerWithManyFS(),
    ]
    return candidates.find(el => el !== null) || null
  }

  // ── Lấy cặp EN + VI trực tiếp từ DOM ──
  // Selector xác nhận từ DOM thực tế: DIV.fs-4, DIV.fs-6
  function getSentencePairs() {
    const transcriptContainer = findTranscriptContainer()
    if (!transcriptContainer) return []

    const VI_REGEX = /[àáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđ]/i
    const pairs = []

    const blocks = transcriptContainer.querySelectorAll('div')
    blocks.forEach(block => {
      const enEl = block.querySelector('.fs-4, .fs-6, [class*="fs-"]')
      if (!enEl) return

      const textEN = enEl.textContent.trim()
      if (!textEN || textEN.length < 5) return
      if (!/^[A-Za-z]/.test(textEN)) return

      // Tìm nghĩa VI trong cùng block — element lá chứa ký tự có dấu
      let textVI = ''
      const allInBlock = block.querySelectorAll('*')
      for (const el of allInBlock) {
        const t = el.textContent.trim()
        if (t.length > 5 && VI_REGEX.test(t) && el.children.length === 0) {
          textVI = t
          break
        }
      }

      pairs.push({ textEN, textVI })
    })

    // Deduplicate
    const seen = new Set()
    return pairs.filter(p => {
      if (seen.has(p.textEN)) return false
      seen.add(p.textEN)
      return true
    })
  }

  // ── Lấy tên bài học ──
  function getLessonTitle() {
    return (
      document.querySelector('h1')?.textContent?.trim() ||
      document.querySelector('[class*="title"]')?.textContent?.trim() ||
      document.title
    )
  }

  // ── Handler chính ──
  async function handleSaveExercise() {
    const btn = document.getElementById('dd-save-exercise')
    btn.textContent = '⏳ Đang tìm câu...'
    btn.disabled = true

    try {
      // Bước 1: Click tab Full transcript
      await clickFullTranscriptTab()

      // Bước 2: Lấy cặp EN + VI từ DOM (không cần API dịch)
      const pairs = getSentencePairs()

      // Fallback: thử lấy từ textarea đang hiện
      if (pairs.length === 0) {
        const textarea = document.querySelector('TEXTAREA.form-control')
        if (textarea && textarea.value.trim()) {
          pairs.push({ textEN: textarea.value.trim(), textVI: '' })
        }
      }

      if (pairs.length === 0) {
        btn.textContent = '❌ Không tìm được câu'
        btn.title = 'Hãy click tab "Full transcript" rồi thử lại'
        setTimeout(() => {
          btn.textContent = '💾 Lưu bài tập'
          btn.disabled = false
          btn.title = ''
        }, 3000)
        return
      }

      btn.textContent = `⏳ Đang lưu ${pairs.length} câu...`

      // Bước 3: Lưu vào storage (VI đã có từ DOM, không cần API)
      const sentences = pairs.slice(0, 15).map(p => ({
        id: crypto.randomUUID(),
        textEN: p.textEN,
        textVI: p.textVI,
        words: []
      }))

      const result = await window.DailyDictStorage.saveExercise({
        title: getLessonTitle(),
        sourceUrl: window.location.href,
        sentences
      })

      if (result.success) {
        btn.textContent = `✅ Đã lưu ${sentences.length} câu`
        setTimeout(() => {
          btn.textContent = '💾 Lưu bài tập'
          btn.disabled = false
        }, 3000)
      }

    } catch (err) {
      console.error('[DailyDict] Lỗi khi lưu bài tập:', err)
      btn.textContent = '❌ Lỗi — thử lại'
      setTimeout(() => {
        btn.textContent = '💾 Lưu bài tập'
        btn.disabled = false
      }, 2000)
    }
  }

  function injectSaveButton() {
    if (document.getElementById('dd-save-exercise')) return

    const style = document.createElement('style')
    style.textContent = `
      .dd-exercise-btn {
        display: inline-flex;
        align-items: center;
        gap: 6px;
        padding: 8px 16px;
        background: #4F46E5;
        color: white;
        border: none;
        border-radius: 8px;
        font-size: 14px;
        font-weight: 500;
        cursor: pointer;
        margin: 8px 0;
        font-family: 'Plus Jakarta Sans', sans-serif;
        transition: background 0.15s;
      }
      .dd-exercise-btn:hover { background: #4338CA; }
      .dd-exercise-btn:disabled { background: #9CA3AF; cursor: default; }
    `
    document.head.appendChild(style)

    const btn = document.createElement('button')
    btn.id = 'dd-save-exercise'
    btn.className = 'dd-exercise-btn'
    btn.textContent = '💾 Lưu bài tập'

    const target = document.querySelector('h1') || document.body
    target.insertAdjacentElement('afterend', btn)

    btn.addEventListener('click', handleSaveExercise)
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', injectSaveButton)
  } else {
    injectSaveButton()
  }

})()
