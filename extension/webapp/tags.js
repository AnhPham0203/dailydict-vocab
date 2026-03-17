let selectedColorIdx = 0
let editingTagId = null

async function init() {
  renderColorPicker()
  await renderTagList()
  bindEvents()
}

function renderColorPicker() {
  const container = document.getElementById('color-picker')
  if (!container || !window.TAG_COLORS) return
  
  container.innerHTML = window.TAG_COLORS.map((c, i) =>
    `<button class="color-dot ${i === selectedColorIdx ? 'active' : ''}"
             data-hex="${c.hex}"
             data-idx="${i}"
             style="background:${c.hex}"
             title="${c.name}"></button>`
  ).join('')

  container.querySelectorAll('.color-dot').forEach(btn => {
    btn.addEventListener('click', () => {
      selectedColorIdx = parseInt(btn.dataset.idx)
      document.querySelectorAll('.color-dot').forEach(b => b.classList.remove('active'))
      btn.classList.add('active')
    })
  })
}

async function renderTagList() {
  const tags = await window.DailyDictStorage.getTagsWithCount()
  const list = document.getElementById('tag-list')
  if (!list) return

  if (tags.length === 0) {
    list.innerHTML = `
      <div class="empty-state">
        <div class="empty-state__circle">
          <span class="empty-state__icon">🏷️</span>
        </div>
        <h3 class="empty-state__title">Chưa có tag nào</h3>
        <p class="empty-state__desc">Tạo tag để tổ chức từ vựng theo chủ đề, bài học hoặc kỳ thi.</p>
      </div>`
    return
  }

  list.innerHTML = tags.map(tag => `
    <div class="tag-row" data-id="${tag.id}">
      <div class="tag-row__left">
        <span class="tag-dot" style="background:${tag.color}"></span>
        <span class="tag-row__name">${tag.name}</span>
        <span class="tag-row__count">${tag.count} từ</span>
      </div>
      <div class="tag-row__actions">
        <a href="words.html?tag=${encodeURIComponent(tag.name)}" class="tag-row__btn">Xem từ</a>
        <button class="tag-row__btn btn-edit-tag" data-id="${tag.id}" data-name="${tag.name}" data-color="${tag.color}">Sửa</button>
        <button class="tag-row__btn tag-row__btn--delete btn-delete-tag" data-id="${tag.id}" data-name="${tag.name}">Xoá</button>
      </div>
    </div>
  `).join('')
}

function bindEvents() {
  const btnCreate = document.getElementById('btn-create-tag')
  const formContainer = document.getElementById('tag-form-container')
  const btnCancel = document.getElementById('btn-cancel-tag')
  const btnSave = document.getElementById('btn-save-tag')
  const nameInput = document.getElementById('tag-name-input')
  const tagList = document.getElementById('tag-list')

  btnCreate?.addEventListener('click', () => {
    editingTagId = null
    document.getElementById('form-title').textContent = 'Tạo tag mới'
    nameInput.value = ''
    selectedColorIdx = 0
    renderColorPicker()
    formContainer.style.display = 'flex'
    nameInput.focus()
  })

  btnCancel?.addEventListener('click', () => {
    formContainer.style.display = 'none'
  })

  btnSave?.addEventListener('click', async () => {
    const name = nameInput.value.trim()
    if (!name) return
    
    const color = window.TAG_COLORS[selectedColorIdx].hex

    if (editingTagId) {
      await window.DailyDictStorage.renameTag(editingTagId, name)
      // Note: Changing color is not implemented in Storage but we could add it
    } else {
      const result = await window.DailyDictStorage.createTag(name, color)
      if (!result.success) {
        alert('Tag này đã tồn tại!')
        return
      }
    }

    formContainer.style.display = 'none'
    await renderTagList()
  })

  tagList?.addEventListener('click', async (e) => {
    const editBtn = e.target.closest('.btn-edit-tag')
    const deleteBtn = e.target.closest('.btn-delete-tag')

    if (editBtn) {
      editingTagId = editBtn.dataset.id
      document.getElementById('form-title').textContent = 'Sửa tên tag'
      nameInput.value = editBtn.dataset.name
      
      const colorHex = editBtn.dataset.color
      selectedColorIdx = window.TAG_COLORS.findIndex(c => c.hex === colorHex)
      if (selectedColorIdx === -1) selectedColorIdx = 0
      
      renderColorPicker()
      formContainer.style.display = 'flex'
      nameInput.focus()
    }

    if (deleteBtn) {
      const { id, name } = deleteBtn.dataset
      if (confirm(`Xoá tag "${name}"? Tất cả từ vựng sẽ mất tag này.`)) {
        await window.DailyDictStorage.deleteTag(id)
        await renderTagList()
      }
    }
  })
}

document.addEventListener('DOMContentLoaded', init)
