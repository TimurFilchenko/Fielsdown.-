/* =============================================================================
   PUBLIC.JS — Показ всех досок сообщества
   Заменяет содержимое #boards-container на главной странице.
   ============================================================================= */

(function () {
  // Работает только на index.html
  if (!window.location.pathname.match(/^\/(?:index\.html)?$/)) {
    return;
  }

  // Ждём загрузки DOM
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', loadPublicBoards);
  } else {
    loadPublicBoards();
  }

  function loadPublicBoards() {
    const container = document.getElementById('boards-container');
    if (!container) return;

    // Получаем доски из localStorage
    let boards = [];
    try {
      const raw = localStorage.getItem('fielsdown_boards_v1');
      boards = raw ? JSON.parse(raw) : [];
    } catch (e) {
      console.warn('Не удалось загрузить доски:', e);
    }

    // Сортировка: новые выше
    boards.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    // Генерация HTML
    let html = '';

    if (boards.length === 0) {
      html = `
        <div class="board-card empty-state">
          <p class="empty-text">Пока нет досок. 
            <a href="/thread.html?mode=create-board">Создайте первую!</a>
          </p>
        </div>
      `;
    } else {
      html = boards.map(board => `
        <div class="board-card">
          <a href="/board.html?b=${encodeURIComponent(board.name)}" class="board-link">
            <span class="board-prefix">b/</span>${board.name}
          </a>
          <p class="board-desc">${board.description || 'Без описания.'}</p>
          <div class="board-meta">
            <span class="board-creator">by ${board.creator || 'anonymous'}</span>
            <span class="board-date">${formatDate(board.createdAt)}</span>
          </div>
        </div>
      `).join('');

      // Кнопка создания
      html += `
        <a href="/thread.html?mode=create-board" class="board-card board-create">
          <span class="plus-sign">+</span>
          <span>Создать доску</span>
        </a>
      `;
    }

    // Обновляем контейнер
    container.innerHTML = html;
  }

  // Форматирование даты
  function formatDate(dateStr) {
    if (!dateStr) return '—';
    const date = new Date(dateStr);
    const now = new Date();
    const diffHours = (now - date) / (1000 * 60 * 60);
    
    if (diffHours < 1) return 'только что';
    if (diffHours < 24) return 'сегодня';
    if (diffHours < 48) return 'вчера';
    
    return date.toLocaleDateString('ru-RU', {
      day: '2-digit',
      month: 'short'
    });
  }
})();
