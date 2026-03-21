// ── Cấu hình ──
const HOVER_DELAY = 600
const TOOLTIP_ID  = 'dd-tooltip'
const VN_REGEX = /[àáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđ]/i

// ── Tầng 1: Kiểm tra element cha có chứa tiếng Việt có dấu không ──
// Học từ ttop32: nếu paragraph/container chứa từ đó có VN có dấu → bỏ qua toàn bộ
function parentContextHasVietnamese(textNode) {
  // Leo lên DOM tìm element cha gần nhất có nội dung thực
  const parent = textNode.parentElement
  if (!parent) return false
  
  // Lấy innerText của element cha (bao gồm toàn bộ text trong đó)
  const parentText = parent.innerText || parent.textContent || ''
  return VN_REGEX.test(parentText)
}

// ── Tầng 2: Pattern matching digraph/trigraph đặc trưng tiếng Việt không dấu ──
// Chỉ dùng các pattern KHÔNG BAO GIỜ xuất hiện trong từ tiếng Anh thật
function isVietnameseNoAccent(word) {
  const w = word.toLowerCase()
  return (
    // Các từ bắt đầu bằng âm VN đặc trưng
    /^(nguoi|nguyen|ngay|nghe|nghia|nguo|nguy)/.test(w) ||
    /^(duoc|duong|duoi|dieu)/.test(w) ||
    /^(khong|khuyen|khoai)/.test(w) ||
    /^(phuong|phuoc)/.test(w) ||
    /^(truoc|truong|trieu)/.test(w) ||
    /^(thuoc|thuong|thuat)/.test(w) ||
    /^(chuyen|chuong)/.test(w) ||
    /^(giao|giup|giua|gioi)/.test(w) ||
    // Vần cuối đặc trưng tiếng Việt
    /(uong|uoc|uoi|uat|uan)$/.test(w) ||
    /(ieng|iet|ieu|inh|iep)$/.test(w)
  )
}

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

  const wordRange = getFullWordRange(node, range.startOffset)
  if (!wordRange) return

  const fullWord = wordRange.toString().trim()
  
  // Chỉ xử lý từ Latin thuần
  if (!/^[a-zA-Z'-]+$/.test(fullWord)) return
  if (fullWord.length < 2 || fullWord.length > 40) return

  if (fullWord === lastWord) return

  // Bỏ qua URL
  if (wordRange.startContainer.parentElement?.closest('a')) return

  // Bỏ qua từ kỹ thuật
  const SKIP_WORDS = new Set(['http', 'https', 'www', 'com', 'org', 'net', 'html', 'css', 'js'])
  if (SKIP_WORDS.has(fullWord.toLowerCase())) return

  // ── FILTER TIẾNG VIỆT KHÔNG DẤU (học từ ttop32) ──

  // Tầng 1: Nếu element cha chứa ký tự VN có dấu → đây là vùng VN → skip
  if (parentContextHasVietnamese(node)) return

  // Tầng 2: Từ có pattern âm đặc trưng tiếng Việt không dấu → skip
  if (isVietnameseNoAccent(fullWord)) return

  // ── END FILTER ──

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
  if (!selected || selected.length > 80) return // TASK-04: Allow phrases up to 80 chars

  // Chỉ xử lý Latin
  if (!/^[a-zA-Z\s'-]+$/.test(selected)) return

  // Tầng 1: Check chính text được bôi đen có VN có dấu không
  if (VN_REGEX.test(selected)) return

  // Tầng 1b: Check context của node nguồn
  const anchorNode = selection.anchorNode
  if (anchorNode && parentContextHasVietnamese(anchorNode)) return

  // Tầng 2: Pattern VN không dấu (chỉ check khi bôi 1 từ, không check cụm)
  if (!selected.includes(' ') && isVietnameseNoAccent(selected)) return

  lastWord = selected
  showTooltip(selected, selection.getRangeAt(0).getBoundingClientRect())
})

document.addEventListener('mouseleave', () => {
  clearTimeout(hoverTimer)
  hideTooltipDelayed()
})