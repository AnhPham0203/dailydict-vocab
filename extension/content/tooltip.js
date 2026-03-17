let hideTimer = null

async function showTooltip(word, anchorRect) {
  clearTimeout(hideTimer)

  // Tạo hoặc tái dùng tooltip element
  let tip = document.getElementById('dd-tooltip')
  if (!tip) {
    tip = document.createElement('div')
    tip.id = 'dd-tooltip'
    document.body.appendChild(tip)
    tip.addEventListener('mouseenter', () => clearTimeout(hideTimer))
    tip.addEventListener('mouseleave', () => hideTooltipDelayed())
  }

  // Hiện loading state ngay lập tức
  tip.innerHTML = buildLoadingHTML(word)
  positionTooltip(tip, anchorRect)
  tip.classList.add('dd-visible')

  // Fetch song song 2 API
  try {
    const data = await window.DailyDictAPI.fetchWordData(word)

    // Nếu tooltip bị đóng trong lúc fetch → bỏ qua
    if (!document.getElementById('dd-tooltip')) return

    tip.innerHTML = buildTooltipHTML(word, data)
    positionTooltip(tip, anchorRect)

    // Bind nút Save
    tip.querySelector('.dd-save-btn')?.addEventListener('click', async (e) => {
      const btn = e.target
      btn.textContent = 'Đang lưu...'
      btn.disabled = true

      const lesson = document.querySelector('h1')?.textContent?.trim() || document.title
      const result = await window.DailyDictStorage.saveWord({
        ...data,
        word,
        sourceLesson: lesson,
        sourceUrl: window.location.href
      })

      if (result.success) {
        // v1.3: Show Tag input state
        showSavedState(result.word.id, word)
        
        // v1.2: Milestone celebration & Badges
        if (result.milestoneReached) {
          showTooltipNotification(`🔥 Streak ${result.milestoneReached} ngày! Tuyệt vời!`)
        }
        if (result.newBadges && result.newBadges.length > 0) {
          showTooltipNotification(`🏆 Đã mở khóa ${result.newBadges.length} huy hiệu mới!`)
        }
      } else {
        btn.textContent = 'Đã có rồi'
        btn.classList.add('saved')
      }
    })
  } catch (err) {
    if (tip) tip.innerHTML = `<div class="dd-error">Lỗi khi tải dữ liệu</div>`
  }
}

async function showSavedState(wordId, word) {
  const tip = document.getElementById('dd-tooltip')
  if (!tip) return

  const wordData = await window.DailyDictStorage.getWordById(wordId)
  const existingTags = wordData?.tags || []

  tip.innerHTML = `
    <div class="dd-saved-confirm">✓ Đã lưu — <strong>${word}</strong></div>
    <div class="dd-tag-section">
      <div class="dd-tags-wrap" id="dd-tags-wrap">
        ${existingTags.map(t => `
          <span class="dd-tag-pill" data-tag="${t}">
            ${t}
            <button class="dd-tag-remove" data-tag="${t}" data-word="${wordId}">×</button>
          </span>`).join('')}
      </div>
      <div style="position:relative">
        <input type="text" id="dd-tag-input"
               class="dd-tag-input"
               placeholder="+ Thêm tag (vd: IELTS, Bài 14)..."
               autocomplete="off" maxlength="30">
        <div class="dd-tag-suggestions" id="dd-tag-sugg" style="display:none"></div>
      </div>
    </div>`

  const input = document.getElementById('dd-tag-input')
  const sugg = document.getElementById('dd-tag-sugg')

  input.focus()

  input.addEventListener('input', async () => {
    const q = input.value.trim().toLowerCase()
    if (!q) { sugg.style.display = 'none'; return }

    const tags = await window.DailyDictStorage.getTagsWithCount()
    const matches = tags.filter(t => t.name.toLowerCase().includes(q))

    if (matches.length === 0) { sugg.style.display = 'none'; return }

    sugg.innerHTML = matches.slice(0, 5).map(t =>
      `<div class="dd-sugg-item" data-name="${t.name}">${t.name}
       <span class="dd-sugg-count">${t.count}</span></div>`
    ).join('')
    sugg.style.display = 'block'
  })

  input.addEventListener('keydown', async (e) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      const val = input.value.trim()
      if (!val) return
      await window.DailyDictStorage.addTagToWord(wordId, val)
      input.value = ''
      sugg.style.display = 'none'
      refreshTagsDisplay(wordId)
    }
  })

  sugg.addEventListener('click', async (e) => {
    const item = e.target.closest('.dd-sugg-item')
    if (!item) return
    await window.DailyDictStorage.addTagToWord(wordId, item.dataset.name)
    input.value = ''
    sugg.style.display = 'none'
    refreshTagsDisplay(wordId)
  })

  tip.addEventListener('click', async (e) => {
    const btn = e.target.closest('.dd-tag-remove')
    if (!btn) return
    await window.DailyDictStorage.removeTagFromWord(btn.dataset.word, btn.dataset.tag)
    refreshTagsDisplay(wordId)
  })
}

async function refreshTagsDisplay(wordId) {
  const word = await window.DailyDictStorage.getWordById(wordId)
  const wrap = document.getElementById('dd-tags-wrap')
  if (!wrap || !word) return
  wrap.innerHTML = (word.tags || []).map(t => `
    <span class="dd-tag-pill" data-tag="${t}">
      ${t}
      <button class="dd-tag-remove" data-tag="${t}" data-word="${wordId}">×</button>
    </span>`).join('')
}

function showTooltipNotification(text) {
  const note = document.createElement('div')
  note.style.cssText = `
    position: fixed;
    bottom: 24px;
    left: 50%;
    transform: translateX(-50%) translateY(20px);
    background: #1C1917;
    color: white;
    padding: 10px 20px;
    border-radius: 12px;
    font-size: 13px;
    font-weight: 600;
    z-index: 2147483647;
    box-shadow: 0 10px 30px rgba(0,0,0,0.2);
    opacity: 0;
    transition: all 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
    font-family: 'Plus Jakarta Sans', sans-serif;
  `
  note.textContent = text
  document.body.appendChild(note)
  
  // Animate in
  setTimeout(() => {
    note.style.opacity = '1'
    note.style.transform = 'translateX(-50%) translateY(0)'
  }, 10)
  
  // Auto remove
  setTimeout(() => {
    note.style.opacity = '0'
    note.style.transform = 'translateX(-50%) translateY(-20px)'
    setTimeout(() => note.remove(), 400)
  }, 4000)
}

// ── Định vị tooltip thông minh ──
function positionTooltip(tip, rect) {
  const TIP_W  = 284
  const TIP_H  = 220  // Increased for tags
  const OFFSET = 12

  let left = rect.left + window.scrollX
  let top  = rect.bottom + window.scrollY + OFFSET

  if (left + TIP_W > window.innerWidth + window.scrollX - 8)  left = window.innerWidth + window.scrollX - TIP_W - 8
  if (left < 8 + window.scrollX)                               left = 8 + window.scrollX
  
  // Nếu hở phía dưới ít quá → hiện lên trên
  if (top + TIP_H > window.innerHeight + window.scrollY) {
    top = rect.top + window.scrollY - TIP_H - OFFSET
  }

  tip.style.left = left + 'px'
  tip.style.top  = top  + 'px'
}

function buildLoadingHTML(word) {
  return `<div class="dd-header">
    <span class="dd-word">${word}</span>
    <span class="dd-loading-dots"><span>.</span><span>.</span><span>.</span></span>
  </div>`
}

function buildTooltipHTML(word, data) {
  const phonetic = data?.phonetic ? `<span class="dd-phonetic">${data.phonetic}</span>` : ''
  const viMain   = data?.definitionViMain ? `<div class="dd-vi">${data.definitionViMain}</div>` : ''
  
  let viDict = ''
  if (data?.definitionViDict) {
    viDict = `<div class="dd-dict" style="font-size: 12px; color: #78716C; margin-top: 4px;">` + 
      data.definitionViDict.map(item => 
        `<div style="margin-bottom: 2px;"><i>${item.pos}:</i> ${item.terms.join(', ')}</div>`
      ).join('') + 
      `</div>`
  }

  const noData = (!viMain && !viDict) ? `<div class="dd-no-data">Không tìm được nghĩa 😕</div>` : ''
  const lesson = document.querySelector('h1')?.textContent?.trim() || ''
  const ctx    = lesson ? `<span class="dd-context" title="${lesson}">📌 ${lesson.slice(0,38)}...</span>` : '<span></span>'

  return `
    <div class="dd-header"><span class="dd-word">${word}</span>${phonetic}</div>
    <div class="dd-body">${viMain}${viDict}${noData}</div>
    <div class="dd-footer">${ctx}<button class="dd-save-btn">+ Lưu từ này</button></div>`
}

function hideTooltipDelayed(delay = 400) {
  clearTimeout(hideTimer)
  hideTimer = setTimeout(() => {
    const tip = document.getElementById('dd-tooltip')
    if (tip) {
      tip.classList.remove('dd-visible')
      setTimeout(() => {
        if (!tip.classList.contains('dd-visible')) tip.remove()
      }, 200)
    }
  }, delay)
}
