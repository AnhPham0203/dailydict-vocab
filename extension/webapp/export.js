let parsedWords = []

async function init() {
  const allWords = await window.DailyDictStorage.getWords()
  const dueWords = await window.DailyDictStorage.getWordsDueToday()

  document.getElementById('scope-all-count').textContent = `${allWords.length} từ`
  document.getElementById('scope-due-count').textContent = `${dueWords.length} từ`

  const urlTag = new URLSearchParams(window.location.search).get('tag')
  if (urlTag) {
    const tagWords = allWords.filter(w => (w.tags || []).includes(urlTag))
    document.getElementById('scope-tag-opt').style.display = 'flex'
    document.getElementById('scope-tag-name').textContent = urlTag
    document.getElementById('scope-tag-count').textContent = `${tagWords.length} từ`
    document.querySelector('input[name="scope"][value="tag"]').checked = true
  }

  // Bind Export
  document.querySelectorAll('.export-btn').forEach(btn => {
    btn.addEventListener('click', async () => {
      const format = btn.dataset.format
      const scope = document.querySelector('input[name="scope"]:checked').value
      const wordsToExport = await getWordsByScope(scope, urlTag)

      if (wordsToExport.length === 0) { alert('Không có từ vựng nào trong phạm vi đã chọn.'); return }

      btn.textContent = 'Đang xử lý...'
      btn.disabled = true

      try {
        if (format === 'json') exportJSON(wordsToExport)
        else if (format === 'csv') exportCSV(wordsToExport)
        else if (format === 'anki') exportAnki(wordsToExport)
      } finally {
        setTimeout(() => {
          btn.textContent = format === 'json' ? 'Tải JSON' : format === 'csv' ? 'Tải CSV' : 'Tải cho Anki'
          btn.disabled = false
        }, 1000)
      }
    })
  })

  // Bind Import
  initImport()
}

async function getWordsByScope(scope, tag) {
  const all = await window.DailyDictStorage.getWords()
  if (scope === 'all') return all
  if (scope === 'due') return all.filter(w => new Date(w.nextReviewAt) <= new Date())
  if (scope === 'tag') return all.filter(w => (w.tags || []).includes(tag))
  return all
}

function exportJSON(words) {
  const data = { version: '1.3', exportedAt: new Date().toISOString(), words }
  downloadFile(JSON.stringify(data, null, 2), `dailydict-backup-${dateStr()}.json`, 'application/json')
}

function exportCSV(words) {
  const headers = ['Word','Phonetic','Nghĩa VI','Nghĩa EN','Ví dụ','Tags','Bài học','Ngày lưu','Trạng thái']
  const rows = words.map(w => [
    w.word, w.phonetic || '', w.definitionVi || '', w.definitionEn || '', w.example || '',
    (w.tags || []).join('; '), w.sourceLesson || '', w.createdAt.split('T')[0], w.lastRating || 'new'
  ].map(cell => `"${String(cell).replace(/"/g, '""')}"`))
  const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n')
  downloadFile('\uFEFF' + csv, `dailydict-${dateStr()}.csv`, 'text/csv')
}

function exportAnki(words) {
  const lines = words.map(w => {
    const front = w.phonetic ? `${w.word}<br><small>${w.phonetic}</small>` : w.word
    const back = [w.definitionVi ? `<b>${w.definitionVi}</b>` : '', w.definitionEn || '', w.example ? `<i>"${w.example}"</i>` : '', w.sourceLesson ? `<small>📌 ${w.sourceLesson}</small>` : ''].filter(Boolean).join('<br>')
    return [front, back, (w.tags || []).join(' ')].join('\t')
  })
  const header = '#separator:tab\n#html:true\n#tags column:3\n'
  downloadFile(header + lines.join('\n'), `dailydict-anki-${dateStr()}.txt`, 'text/plain')
}

function downloadFile(content, filename, type) {
  const blob = new Blob([content], { type: `${type};charset=utf-8;` })
  const url = URL.createObjectURL(blob), a = document.createElement('a')
  a.href = url; a.download = filename; document.body.appendChild(a); a.click()
  document.body.removeChild(a); URL.revokeObjectURL(url)
}

function dateStr() { return new Date().toISOString().split('T')[0] }

// --- IMPORT LOGIC ---
function initImport() {
  const drop = document.getElementById('import-drop'), fileInput = document.getElementById('import-file')
  const preview = document.getElementById('import-preview'), btnCancel = document.getElementById('btn-cancel-import'), btnConfirm = document.getElementById('btn-confirm-import')

  drop.addEventListener('dragover', (e) => { e.preventDefault(); drop.classList.add('drop-active') })
  drop.addEventListener('dragleave', () => drop.classList.remove('drop-active'))
  drop.addEventListener('drop', (e) => { e.preventDefault(); drop.classList.remove('drop-active'); handleFile(e.dataTransfer.files[0]) })
  fileInput.addEventListener('change', () => handleFile(fileInput.files[0]))

  btnCancel.onclick = () => { preview.style.display = 'none'; parsedWords = [] }
  btnConfirm.onclick = async () => {
    const mode = document.querySelector('input[name="import-mode"]:checked').value
    if (mode === 'replace' && !confirm('Xoá sạch dữ liệu hiện tại? Hành động này không thể hoàn tác.')) return
    
    try {
      if (mode === 'replace') {
        await chrome.storage.local.set({ dd_words: parsedWords })
        showImportResult('success', `Đã thay thế toàn bộ bằng ${parsedWords.length} từ mới.`)
      } else {
        const existing = await window.DailyDictStorage.getWords()
        const existingSet = new Set(existing.map(w => w.word.toLowerCase()))
        const newOnes = parsedWords.filter(w => !existingSet.has(w.word.toLowerCase()))
        await chrome.storage.local.set({ dd_words: [...existing, ...newOnes] })
        showImportResult('success', `Đã nhập thêm ${newOnes.length} từ. ${parsedWords.length - newOnes.length} từ đã có bị bỏ qua.`)
      }
      preview.style.display = 'none'
    } catch (e) { showImportResult('error', 'Lỗi: ' + e.message) }
  }
}

async function handleFile(file) {
  if (!file) return
  try {
    const text = await file.text(), ext = file.name.split('.').pop().toLowerCase()
    if (ext === 'json') parsedWords = parseJSON(text)
    else if (ext === 'csv') parsedWords = parseCSV(text)
    else throw new Error('Chỉ hỗ trợ .json và .csv')
    
    document.getElementById('import-preview').style.display = 'block'
    document.getElementById('preview-title').textContent = `📂 ${file.name}`
    document.getElementById('preview-meta').textContent = `${parsedWords.length} từ vựng tìm thấy`
  } catch (e) { showImportResult('error', e.message) }
}

function parseJSON(text) {
  const data = JSON.parse(text), words = Array.isArray(data) ? data : data.words
  if (!Array.isArray(words)) throw new Error('File JSON không đúng định dạng')
  return words.filter(w => w.word)
}

function parseCSV(text) {
  // Bỏ BOM nếu có (Excel thêm vào khi save)
  const clean = text.replace(/^\uFEFF/, '')
  const lines  = clean.split(/\r?\n/).filter(l => l.trim())
  if (lines.length < 2) throw new Error('File CSV không có dữ liệu')

  // Parse header
  const headers = parseCSVLine(lines[0])

  return lines.slice(1).map(line => {
    const cells = parseCSVLine(line)
    const get   = (colName) => {
      const idx = headers.indexOf(colName)
      return idx >= 0 ? (cells[idx] || '').trim() : ''
    }

    const word = get('Word')
    if (!word) return null

    return {
      id:           crypto.randomUUID(),
      word,
      phonetic:     get('Phonetic')  || null,
      definitionVi: get('Nghĩa VI')  || null,
      definitionEn: get('Nghĩa EN')  || null,
      example:      get('Ví dụ')     || null,
      tags:         get('Tags') ? get('Tags').split(';').map(t => t.trim()).filter(Boolean) : [],
      sourceLesson: get('Bài học')   || null,
      sourceUrl:    null,
      createdAt:    new Date().toISOString(),
      nextReviewAt: new Date(Date.now() + 86400000).toISOString(),
      intervalDays: 1,
      easeFactor:   2.5,
      reviewCount:  0,
      reviewGoodCount: 0,
      lastRating:   null
    }
  }).filter(Boolean)
}

// Helper: parse 1 dòng CSV có hỗ trợ quoted fields
function parseCSVLine(line) {
  const result = []
  let current  = ''
  let inQuotes = false

  for (let i = 0; i < line.length; i++) {
    const char = line[i]
    const next = line[i + 1]

    if (char === '"' && inQuotes && next === '"') {
      // Escaped quote bên trong field
      current += '"'
      i++ // skip next quote
    } else if (char === '"') {
      inQuotes = !inQuotes
    } else if (char === ',' && !inQuotes) {
      result.push(current)
      current = ''
    } else {
      current += char
    }
  }
  result.push(current) // push field cuối cùng
  return result
}

function showImportResult(type, msg) {
  const el = document.getElementById('import-result')
  el.style.display = 'block'; 
  el.className = `import-result import-result--${type}`
  el.textContent = (type === 'success' ? '✅ ' : '❌ ') + msg
}

document.addEventListener('DOMContentLoaded', init)
