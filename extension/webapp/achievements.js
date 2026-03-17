async function init() {
  if (!window.BADGE_DEFINITIONS) return;

  const unlockedBadges = await window.DailyDictStorage.getBadges()
  const unlockedIds = new Set(unlockedBadges.map(b => b.id))
  const unlockedMap = Object.fromEntries(unlockedBadges.map(b => [b.id, b]))

  // Mark all as seen when entering achievements page
  await window.DailyDictStorage.markBadgesSeen()

  // Update badge count label
  document.getElementById('badge-count').textContent =
    `${unlockedIds.size} / ${window.BADGE_DEFINITIONS.length}`

  // Initial render (All categories)
  renderGrid('all', unlockedIds, unlockedMap)

  // Category filter events
  document.getElementById('badge-filters').addEventListener('click', (e) => {
    const btn = e.target.closest('.badge-filter')
    if (!btn) return
    
    document.querySelectorAll('.badge-filter').forEach(b => b.classList.remove('active'))
    btn.classList.add('active')
    
    renderGrid(btn.dataset.cat, unlockedIds, unlockedMap)
  })
}

function renderGrid(cat, unlockedIds, unlockedMap) {
  const defs = cat === 'all'
    ? window.BADGE_DEFINITIONS
    : window.BADGE_DEFINITIONS.filter(d => d.category === cat)

  const grid = document.getElementById('badge-grid')
  if (!grid) return;

  grid.innerHTML = defs.map(def => {
    const unlocked = unlockedIds.has(def.id)
    const unlockedAt = unlockedMap[def.id]?.unlockedAt
    const dateStr = unlockedAt
      ? new Date(unlockedAt).toLocaleDateString('vi-VN')
      : null

    return `
      <div class="badge-card ${unlocked ? 'badge-card--unlocked' : 'badge-card--locked'}">
        <div class="badge-card__emoji">${unlocked ? def.emoji : '🔒'}</div>
        <div class="badge-card__name">${def.name}</div>
        <div class="badge-card__desc">${def.desc}</div>
        ${dateStr ? `<div class="badge-card__date">${dateStr}</div>` : ''}
      </div>`
  }).join('')
}

document.addEventListener('DOMContentLoaded', init)
