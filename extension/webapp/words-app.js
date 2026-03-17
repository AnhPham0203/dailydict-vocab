// --- WORDS APP LOGIC ---
let filterState = { search: '', tag: 'all', rating: 'all', source: 'all', sort: 'newest' }
let selectMode = false
let selectedIds = new Set()

async function initWordList() {
  try {
    const params = new URLSearchParams(window.location.search)
    if (params.get('tag')) filterState.tag = params.get('tag')
    if (params.get('rating')) filterState.rating = params.get('rating')
    
    await renderFilterTags(); await renderFilterSources(); await applyFilters(); initBulkActions()
    
    // EXPORT JSON
    document.getElementById('btn-export-json')?.addEventListener('click', async () => {
      const words = await window.DailyDictStorage.getWords(), blob = new Blob([JSON.stringify(words, null, 2)], { type: 'application/json' }), url = URL.createObjectURL(blob), a = document.createElement('a')
      a.href = url; a.download = `dailydict-backup-${new Date().toISOString().split('T')[0]}.json`; a.click(); URL.revokeObjectURL(url)
    })
    
    // IMPORT JSON
    document.getElementById('import-file-json')?.addEventListener('change', async (e) => {
      const file = e.target.files[0]; if (!file) return
      try {
        const text = await file.text(), imported = JSON.parse(text); if (!Array.isArray(imported)) throw new Error('Invalid format')
        const existing = await window.DailyDictStorage.getWords(), existingWords = new Set(existing.map(w => w.word.toLowerCase()))
        const newWords = imported.filter(w => w.word && !existingWords.has(w.word.toLowerCase())), merged = [...existing, ...newWords]
        await chrome.storage.local.set({ dd_words: merged }); alert(`✅ Đã nhập ${newWords.length} từ mới. (${imported.length - newWords.length} từ trùng bị bỏ qua)`); location.reload()
      } catch (err) { alert('❌ File không hợp lệ. Vui lòng chọn file JSON đúng định dạng.') }
    })
    
    document.getElementById('search-input')?.addEventListener('input', debounce((e) => { filterState.search = e.target.value.trim(); applyFilters() }, 200))
    document.getElementById('sort-select')?.addEventListener('change', (e) => { filterState.sort = e.target.value; applyFilters() })
    document.getElementById('filter-tags')?.addEventListener('click', (e) => {
      const btn = e.target.closest('.filter-chip'); if (!btn) return
      document.querySelectorAll('#filter-tags .filter-chip').forEach(b => b.classList.remove('filter-chip--active'))
      btn.classList.add('filter-chip--active'); filterState.tag = btn.dataset.tag; applyFilters()
    })
    document.getElementById('filter-rating')?.addEventListener('click', (e) => {
      const btn = e.target.closest('.filter-chip'); if (!btn) return
      document.querySelectorAll('#filter-rating .filter-chip').forEach(b => b.classList.remove('filter-chip--active'))
      btn.classList.add('filter-chip--active'); filterState.rating = btn.dataset.rating; applyFilters()
    })
    document.getElementById('filter-source')?.addEventListener('change', (e) => { filterState.source = e.target.value; applyFilters() })
    document.getElementById('btn-clear-filters')?.addEventListener('click', () => {
      filterState = { search: '', tag: 'all', rating: 'all', source: 'all', sort: 'newest' }
      document.getElementById('search-input').value = ''; document.getElementById('filter-source').value = 'all'
      document.querySelectorAll('.filter-chip').forEach(b => b.classList.toggle('filter-chip--active', b.dataset.tag === 'all' || b.dataset.rating === 'all')); applyFilters()
    })
    document.getElementById('btn-reset-empty')?.addEventListener('click', () => document.getElementById('btn-clear-filters').click())
    
    document.getElementById('word-list-container')?.addEventListener('click', (e) => {
      const target = e.target, row = target.closest('.word-row'), del = target.closest('.btn-delete')
      if (del) { e.stopPropagation(); deleteWord(del.dataset.id, del.dataset.word); return }
      if (row) {
        if (selectMode) {
          const id = row.dataset.id; if (selectedIds.has(id)) selectedIds.delete(id); else selectedIds.add(id)
          row.classList.toggle('selected', selectedIds.has(id)); updateBulkToolbar()
        } else { window.location.href = `word.html?id=${row.dataset.id}` }
      }
    })
  } catch (err) { console.error('Word list init error:', err); if (typeof showGlobalError === 'function') showGlobalError() }
}

async function renderFilterTags() {
  const tags = await window.DailyDictStorage.getTags(), container = document.getElementById('filter-tags'); if (!container) return
  const currentTag = filterState.tag
  container.innerHTML = `<button class="filter-chip ${currentTag === 'all' ? 'filter-chip--active' : ''}" data-tag="all">Tất cả</button>` + tags.map(t => `<button class="filter-chip ${currentTag === t.name ? 'filter-chip--active' : ''}" data-tag="${t.name}" style="--tag-color: ${t.color}">${t.name}</button>`).join('')
}

async function renderFilterSources() {
  const words = await window.DailyDictStorage.getWords(), sources = Array.from(new Set(words.map(w => w.sourceLesson).filter(Boolean))).sort(), select = document.getElementById('filter-source'); if (!select) return
  select.innerHTML = '<option value="all">Tất cả bài</option>' + sources.map(s => `<option value="${s}" ${filterState.source === s ? 'selected' : ''}>${s}</option>`).join('')
}

async function applyFilters() {
  let words = await window.DailyDictStorage.getWords()
  if (filterState.search) { const q = filterState.search.toLowerCase(); words = words.filter(w => w.word.toLowerCase().includes(q) || (w.definitionVi||'').toLowerCase().includes(q) || (w.definitionEn||'').toLowerCase().includes(q)) }
  if (filterState.tag !== 'all') words = words.filter(w => (w.tags || []).includes(filterState.tag))
  if (filterState.rating !== 'all') { if (filterState.rating === 'new') words = words.filter(w => !w.lastRating); else words = words.filter(w => w.lastRating === filterState.rating) }
  if (filterState.source !== 'all') words = words.filter(w => w.sourceLesson === filterState.source)
  words = sortWords(words, filterState.sort); renderWordList(words); updateFilterSummary(words.length)
}

function updateFilterSummary(count) {
  const summary = document.getElementById('filter-summary'), hasFilter = filterState.tag !== 'all' || filterState.rating !== 'all' || filterState.source !== 'all' || filterState.search; if (summary) summary.style.display = hasFilter ? 'flex' : 'none'
  if (document.getElementById('filter-result-count')) document.getElementById('filter-result-count').textContent = `${count} từ tìm thấy`
}

function renderWordList(words) {
  const container = document.getElementById('word-list-container'), totalCount = document.getElementById('total-count'), emptyState = document.getElementById('empty-state'); if (!container || !totalCount || !emptyState) return
  totalCount.textContent = `${words.length} từ vựng`
  if (words.length === 0) { container.innerHTML = ''; emptyState.style.display = 'flex'; return }
  emptyState.style.display = 'none'
  container.innerHTML = words.map(w => `<div class="word-row ${selectMode ? 'selectable' : ''} ${selectedIds.has(w.id) ? 'selected' : ''}" data-id="${w.id}"><div class="word-row__main"><span class="word-row__word">${w.word}</span><span class="word-row__phonetic">${w.phonetic || ''}</span></div><div class="word-row__vi">${w.definitionVi || ''}</div><div class="word-row__actions"><div class="word-tags-preview" style="display:flex; gap:4px; margin-right:8px;">${(w.tags || []).slice(0, 2).map(t => `<span style="font-size:9px; background:#F5F5F4; padding:1px 5px; border-radius:4px; color:#78716C;">${t}</span>`).join('')}${(w.tags || []).length > 2 ? `<span style="font-size:9px; color:#A8A29E;">+${w.tags.length - 2}</span>` : ''}</div><span class="status-pill ${getPillClass(w.lastRating)}">${getPillLabel(w.lastRating)}</span><button class="delete-btn btn-delete" data-id="${w.id}" data-word="${w.word}"><svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M2 3.5h10M5.5 3.5V2.5h3v1M3.5 3.5l.5 8h6l.5-8" stroke="currentColor" stroke-width="1.2" stroke-linecap="round"/></svg></button></div></div>`).join('')
}

function initBulkActions() {
  document.getElementById('btn-toggle-select')?.addEventListener('click', () => {
    selectMode = !selectMode; selectedIds.clear(); document.getElementById('btn-toggle-select').textContent = selectMode ? '✕ Thoát chọn' : '☑ Chọn nhiều'; document.getElementById('btn-toggle-select').style.background = selectMode ? 'var(--c-primary-light)' : 'var(--c-surface)'; applyFilters(); updateBulkToolbar()
  })
  document.getElementById('btn-deselect-all')?.addEventListener('click', () => { selectedIds.clear(); applyFilters(); updateBulkToolbar() })
  document.getElementById('btn-bulk-delete')?.addEventListener('click', async () => {
    if (!confirm(`Xoá ${selectedIds.size} từ đã chọn?`)) return
    await Promise.all([...selectedIds].map(id => window.DailyDictStorage.deleteWord(id))); selectedIds.clear(); applyFilters(); updateBulkToolbar()
  })
  document.getElementById('btn-bulk-tag')?.addEventListener('click', async () => {
    const tagName = prompt('Nhập tên tag để gán cho các từ đã chọn:'); if (!tagName) return
    await Promise.all([...selectedIds].map(id => window.DailyDictStorage.addTagToWord(id, tagName))); selectedIds.clear(); applyFilters(); updateBulkToolbar()
  })
}

function updateBulkToolbar() {
  const toolbar = document.getElementById('bulk-toolbar'), count = document.getElementById('bulk-count'); if (toolbar) toolbar.style.display = selectedIds.size > 0 ? 'flex' : 'none'
  if (count) count.textContent = `${selectedIds.size} đã chọn`
}

async function deleteWord(id, word) { if (confirm(`Bạn có chắc muốn xóa từ "${word}"?`)) { await window.DailyDictStorage.deleteWord(id); applyFilters() } }

function sortWords(words, criteria) {
  const sorted = [...words]
  if (criteria === 'newest') return sorted.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
  if (criteria === 'oldest') return sorted.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt))
  if (criteria === 'az') return sorted.sort((a, b) => a.word.localeCompare(b.word))
  if (criteria === 'due') return sorted.sort((a, b) => new Date(a.nextReviewAt) - new Date(b.nextReviewAt))
  return sorted
}

document.addEventListener('DOMContentLoaded', initWordList)
