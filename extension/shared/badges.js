// BADGE DEFINITIONS — DailyDict Vocab v1.2
window.BADGE_DEFINITIONS = [
  // === MILESTONE TỪ VỰNG ===
  {
    id: 'first_word',
    name: 'Khởi đầu',
    desc: 'Lưu từ đầu tiên',
    emoji: '🌱',
    category: 'vocab',
    check: (stats) => stats.total >= 1
  },
  {
    id: 'vocab_10',
    name: 'Bộ sưu tập nhỏ',
    desc: 'Lưu 10 từ vựng',
    emoji: '📖',
    category: 'vocab',
    check: (stats) => stats.total >= 10
  },
  {
    id: 'vocab_50',
    name: 'Từ điển nhỏ',
    desc: 'Lưu 50 từ vựng',
    emoji: '📚',
    category: 'vocab',
    check: (stats) => stats.total >= 50
  },
  {
    id: 'vocab_100',
    name: 'Bách từ',
    desc: 'Lưu 100 từ vựng',
    emoji: '💯',
    category: 'vocab',
    check: (stats) => stats.total >= 100
  },

  // === STREAK ===
  {
    id: 'streak_3',
    name: 'Khởi động',
    desc: '3 ngày học liên tiếp',
    emoji: '🔥',
    category: 'streak',
    check: (stats) => stats.streak >= 3
  },
  {
    id: 'streak_7',
    name: 'Tuần vàng',
    desc: '7 ngày học liên tiếp',
    emoji: '⚡',
    category: 'streak',
    check: (stats) => stats.streak >= 7
  },
  {
    id: 'streak_30',
    name: 'Tháng kiên trì',
    desc: '30 ngày không nghỉ',
    emoji: '🏆',
    category: 'streak',
    check: (stats) => stats.streak >= 30
  },
  {
    id: 'streak_100',
    name: 'Huyền thoại',
    desc: '100 ngày liên tiếp',
    emoji: '👑',
    category: 'streak',
    check: (stats) => stats.streak >= 100
  },

  // === ÔN TẬP ===
  {
    id: 'review_first',
    name: 'Ôn bài đầu tiên',
    desc: 'Hoàn thành buổi review đầu tiên',
    emoji: '🃏',
    category: 'review',
    check: (stats) => stats.totalReviews >= 1
  },
  {
    id: 'retention_80',
    name: 'Bộ nhớ tốt',
    desc: 'Tỷ lệ nhớ đạt 80%+',
    emoji: '🧠',
    category: 'review',
    check: (stats) => stats.retentionRate >= 80 && stats.totalReviews >= 10
  },

  // === DAILY GOAL ===
  {
    id: 'goal_first',
    name: 'Mục tiêu đầu tiên',
    desc: 'Hoàn thành daily goal lần đầu',
    emoji: '🎯',
    category: 'goal',
    check: (stats) => stats.goalCompletedDays >= 1
  },
  {
    id: 'goal_7days',
    name: 'Kỷ luật sắt',
    desc: 'Hoàn thành daily goal 7 ngày liên tiếp',
    emoji: '💎',
    category: 'goal',
    check: (stats) => stats.goalCompletedDays >= 7
  },
];
