// ── Cấu hình ──
const HOVER_DELAY = 600
const TOOLTIP_ID  = 'dd-tooltip'
const VN_REGEX = /[àáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđ]/i

let hoverTimer = null
let lastWord   = ''
let activeRect = null // Lưu tọa độ của từ đang hiện tooltip

// ── 1. Track vị trí chuột ──
document.addEventListener('mousemove', (e) => {
  const target = e.target
  
  // Nếu đang hover vào chính tooltip -> Giữ nguyên, không làm gì
  if (target.closest('#' + TOOLTIP_ID)) {
    clearTimeout(hoverTimer)
    return
  }

  // KIỂM TRA RỜI KHỎI TỪ: Nếu đã có tooltip và chuột di chuyển ra ngoài vùng của từ (+ padding)
  if (activeRect) {
    const padding = 15
    const isOut = e.clientX < activeRect.left - padding || 
                  e.clientX > activeRect.right + padding || 
                  e.clientY < activeRect.top - padding || 
                  e.clientY > activeRect.bottom + padding

    if (isOut) {
      activeRect = null
      hideTooltipDelayed(300) // Ẩn nhanh sau 300ms
    }
  }

  // Bỏ qua các element UI
  if (target.closest('button, input, select, textarea, nav, footer, .menu, .sidebar')) {
    clearTimeout(hoverTimer)
    return
  }

  clearTimeout(hoverTimer)
  hoverTimer = setTimeout(() => detectWordAtCursor(e.clientX, e.clientY), HOVER_DELAY)
})

// ── 2. Detect từ dưới con trỏ ──
function detectWordAtCursor(x, y) {
  const range = document.caretRangeFromPoint(x, y)
  if (!range) return

  const node = range.startContainer
  if (node.nodeType !== Node.TEXT_NODE) return

  if (VN_REGEX.test(node.textContent)) return

  const wordRange = getFullWordRange(node, range.startOffset)
  if (!wordRange) return

  const fullWord = wordRange.toString().trim()
  
  if (!/^[a-zA-Z'-]+$/.test(fullWord)) return
  if (fullWord.length < 2 || fullWord.length > 40) return

  if (fullWord === lastWord) return
  lastWord = fullWord
  
  const rect = wordRange.getBoundingClientRect()
  activeRect = rect // Cập nhật ranh giới từ đang tra
  showTooltip(fullWord, rect)
}

// ── 3. Lấy TOÀN BỘ ranh giới từ (không dừng lại ở ký tự Latin) ──
function getFullWordRange(textNode, offset) {
  const text = textNode.textContent
  if (!text) return null

  // Tìm ranh giới bằng khoảng trắng hoặc dấu câu (không dùng regex Latin ở đây)
  const isSeparator = (char) => /[\s,.!?;:()\[\]{}"'\/]/.test(char)

  let start = offset
  while (start > 0 && !isSeparator(text[start - 1])) start--

  let end = offset
  while (end < text.length && !isSeparator(text[end])) end++

  if (start === end) return null

  const range = document.createRange()
  range.setStart(textNode, start)
  range.setEnd(textNode, end)
  return range
}

// ── 4. Chế độ SELECT (cũng áp dụng Context Check) ──
document.addEventListener('mouseup', (e) => {
  if (e.target.closest('#' + TOOLTIP_ID)) return
  clearTimeout(hoverTimer)

  const selection = window.getSelection()
  const selected = selection.toString().trim()
  if (!selected || selected.length > 60) return

  const node = selection.anchorNode
  if (node && VN_REGEX.test(node.textContent)) return // Bỏ qua nếu ngữ cảnh là tiếng Việt

  if (!/^[a-zA-Z\s'-]+$/.test(selected)) return
  if (VN_REGEX.test(selected)) return

  lastWord = selected
  showTooltip(selected, selection.getRangeAt(0).getBoundingClientRect())
})

document.addEventListener('mouseleave', () => {
  clearTimeout(hoverTimer)
  hideTooltipDelayed()
})