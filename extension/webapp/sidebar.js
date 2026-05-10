(async function initSidebar() {

  // 1. Active state theo URL
  const page = window.location.pathname.split('/').pop() || 'index.html'
  document.querySelectorAll('.nav-item').forEach(item => {
    const href = item.getAttribute('href') || ''
    const pageName = href.replace('.html', '')
    if (pageName && page === href) {
      item.classList.add('active')
    }
  })

  // 2. Load stats vào sidebar
  try {
    const stats = await window.DailyDictStorage.getStats()

    const streakEl = document.getElementById('sidebar-streak-num')
    if (streakEl) streakEl.textContent = stats.streak || 0

    const totalBadge = document.getElementById('nav-total-badge')
    if (totalBadge && stats.total > 0) {
      totalBadge.textContent = stats.total
      totalBadge.style.display = ''
    }

    const dueBadge = document.getElementById('nav-due-badge')
    if (dueBadge && stats.dueCount > 0) {
      dueBadge.textContent = stats.dueCount
      dueBadge.style.display = ''
    }

    const unseen = await window.DailyDictStorage.getUnseenBadges()
    const dot = document.getElementById('nav-badge-dot')
    if (dot && unseen.length > 0) dot.style.display = ''
  } catch (e) {
    // Storage chưa sẵn sàng — bỏ qua
  }

  // 3. Mobile toggle
  const sidebar = document.getElementById('sidebar')
  const menuBtn = document.getElementById('mobile-menu-btn')
  const overlay = document.getElementById('sidebar-overlay')

  menuBtn?.addEventListener('click', () => sidebar?.classList.toggle('open'))
  overlay?.addEventListener('click', () => sidebar?.classList.remove('open'))

})()
