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
      
      // v1.2: Milestone celebration & Badges
      if (result.success) {
        if (result.milestoneReached) {
          showTooltipNotification(`🔥 Streak ${result.milestoneReached} ngày! Tuyệt vời!`)
        }
        if (result.newBadges && result.newBadges.length > 0) {
          showTooltipNotification(`🏆 Đã mở khóa ${result.newBadges.length} huy hiệu mới!`)
        }
      }
    })
  } catch (err) {
    if (tip) tip.innerHTML = `<div class="dd-error">Lỗi khi tải dữ liệu</div>`
  }
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
