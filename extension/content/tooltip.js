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

      btn.textContent = result.success ? '✓ Đã lưu' : 'Đã có rồi'
      btn.classList.toggle('saved', result.success)
    })
  } catch (err) {
    if (tip) tip.innerHTML = `<div class="dd-error">Lỗi khi tải dữ liệu</div>`
  }
}

// ── Định vị tooltip thông minh ──
function positionTooltip(tip, rect) {
  const TIP_W  = 284
  const TIP_H  = 180  // ước lượng
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
  const phonetic = data?.phonetic     ? `<span class="dd-phonetic">${data.phonetic}</span>` : ''
  const vi       = data?.definitionVi ? `<div class="dd-vi">${data.definitionVi}</div>` : ''
  const en       = data?.definitionEn ? `<div class="dd-en">${data.definitionEn}</div>` : ''
  const example  = data?.example      ? `<div class="dd-example">"${data.example}"</div>` : ''
  const noData   = (!vi && !en)       ? `<div class="dd-no-data">Không tìm được nghĩa 😕</div>` : ''
  const lesson   = document.querySelector('h1')?.textContent?.trim() || ''
  const ctx      = lesson ? `<span class="dd-context" title="${lesson}">📌 ${lesson.slice(0,38)}...</span>` : '<span></span>'

  return `
    <div class="dd-header"><span class="dd-word">${word}</span>${phonetic}</div>
    <div class="dd-body">${vi}${en}${example}${noData}</div>
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
    lastWord = ''
  }, delay)
}